import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { documents, signatures, properties, users } from '../db/schema.js';
import { eq, or, desc } from 'drizzle-orm';
import {
  generatePurchaseContract,
  generateLeaseAgreement,
  generateSellerDisclosure,
} from '../services/document-generator.js';
import {
  validateSignature,
  createSignatureRecord,
  checkDocumentSignatureStatus,
  getSignatureAuditTrail,
} from '../services/esign.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET / — list documents for a user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.createdBy, userId))
      .orderBy(desc(documents.createdAt));

    const sanitized = userDocuments.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      propertyId: doc.propertyId,
      transactionId: doc.transactionId,
      status: doc.status,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    res.json({ success: true, documents: sanitized });
  } catch (error: any) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents', details: error.message });
  }
});

// GET /:id — get document details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const documentId = req.params.id;

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { pdfBase64, ...docDetails } = doc as any;

    res.json({ success: true, document: docDetails });
  } catch (error: any) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document', details: error.message });
  }
});

// GET /:id/pdf — stream the generated PDF
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const documentId = req.params.id;

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const pdfBase64 = (doc as any).pdfBase64;
    if (!pdfBase64) {
      return res.status(404).json({ error: 'PDF not generated for this document' });
    }

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${(doc as any).title || 'document'}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error streaming PDF:', error);
    res.status(500).json({ error: 'Failed to stream PDF', details: error.message });
  }
});

// POST /generate — generate a new document
router.post('/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { document_type, property_id, buyer_id, seller_id, terms } = req.body;

    if (!document_type || !property_id || !buyer_id || !seller_id) {
      return res.status(400).json({ error: 'Missing required fields: document_type, property_id, buyer_id, seller_id' });
    }

    // Fetch related entities
    const [property] = await db.select().from(properties).where(eq(properties.id, property_id)).limit(1);
    const [buyer] = await db.select().from(users).where(eq(users.id, buyer_id)).limit(1);
    const [seller] = await db.select().from(users).where(eq(users.id, seller_id)).limit(1);

    if (!property) return res.status(404).json({ error: 'Property not found' });
    if (!buyer) return res.status(404).json({ error: 'Buyer not found' });
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    let pdfBuffer: Buffer;
    let title: string;

    switch (document_type) {
      case 'purchase_contract':
        title = `Purchase Contract - ${(property as any).address}`;
        pdfBuffer = await generatePurchaseContract({
          buyer: buyer as any,
          seller: seller as any,
          property: property as any,
          terms: terms || {},
        });
        break;
      case 'lease_agreement':
        title = `Lease Agreement - ${(property as any).address}`;
        pdfBuffer = await generateLeaseAgreement({
          landlord: seller as any,
          tenant: buyer as any,
          property: property as any,
          terms: terms || {},
        });
        break;
      case 'seller_disclosure':
        title = `Seller Disclosure - ${(property as any).address}`;
        pdfBuffer = await generateSellerDisclosure({
          seller: seller as any,
          property: property as any,
          disclosures: terms || {},
        });
        break;
      default:
        return res.status(400).json({ error: 'Invalid document_type. Must be purchase_contract, lease_agreement, or seller_disclosure' });
    }

    const [doc] = await db
      .insert(documents)
      .values({
        title,
        type: document_type as any,
        propertyId: property_id,
        createdBy: userId,
        pdfBase64: pdfBuffer.toString('base64'),
        status: 'draft',
      })
      .returning();

    const { pdfBase64, ...docDetails } = doc as any;

    res.status(201).json({ success: true, document: docDetails });
  } catch (error: any) {
    console.error('Error generating document:', error);
    res.status(500).json({ error: 'Failed to generate document', details: error.message });
  }
});

// POST /:id/sign — sign a document
router.post('/:id/sign', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const documentId = req.params.id;
    const { signature_data } = req.body;

    if (!signature_data) {
      return res.status(400).json({ error: 'signature_data (base64) is required' });
    }

    // Validate the document exists
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Validate the signature data
    const validation = validateSignature(signature_data);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.reason });
    }

    // Get client IP
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    // Create the signature record
    const signatureRecord = await createSignatureRecord(documentId, userId, signature_data, ipAddress);

    // Check if all parties have signed
    await checkDocumentSignatureStatus(documentId);

    res.status(201).json({ success: true, signature: signatureRecord });
  } catch (error: any) {
    console.error('Error signing document:', error);
    res.status(500).json({ error: 'Failed to sign document', details: error.message });
  }
});

// GET /:id/signatures — get all signatures on a document
router.get('/:id/signatures', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const documentId = req.params.id;

    const auditTrail = await getSignatureAuditTrail(documentId);

    res.json({ success: true, signatures: auditTrail });
  } catch (error: any) {
    console.error('Error fetching signatures:', error);
    res.status(500).json({ error: 'Failed to fetch signatures', details: error.message });
  }
});

export default router;
