import { db } from '../db/index.js';
import { signatures, documents } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignatureValidation {
  valid: boolean;
  reason?: string;
}

export interface SignatureRecord {
  id: string;
  documentId: string;
  signerId: string;
  signedAt: Date;
  ipAddress: string;
}

export interface AuditTrailEntry {
  id: string;
  documentId: string;
  signerId: string;
  signedAt: Date;
  ipAddress: string;
  signatureData: string;
}

// ---------------------------------------------------------------------------
// validateSignature — validates base64 signature image data
// ---------------------------------------------------------------------------

export function validateSignature(signatureData: string): SignatureValidation {
  if (!signatureData || typeof signatureData !== 'string') {
    return { valid: false, reason: 'Signature data is required and must be a string.' };
  }

  // Remove data URL prefix if present (e.g., data:image/png;base64,)
  const base64Content = signatureData.replace(/^data:image\/\w+;base64,/, '');

  // Check that it's valid base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  if (!base64Regex.test(base64Content)) {
    return { valid: false, reason: 'Signature data is not valid base64.' };
  }

  // Decode and check minimum size (a real signature image should be at least ~500 bytes)
  const buffer = Buffer.from(base64Content, 'base64');
  if (buffer.length < 500) {
    return { valid: false, reason: 'Signature image is too small. Please provide a clear signature.' };
  }

  // Check maximum size (5MB)
  if (buffer.length > 5 * 1024 * 1024) {
    return { valid: false, reason: 'Signature image exceeds 5MB limit.' };
  }

  // Check for PNG or JPEG header
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50; // PNG magic bytes
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8; // JPEG magic bytes
  if (!isPng && !isJpeg) {
    return { valid: false, reason: 'Signature must be a PNG or JPEG image.' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// createSignatureRecord — stores signature in the database
// ---------------------------------------------------------------------------

export async function createSignatureRecord(
  documentId: string,
  signerId: string,
  signatureData: string,
  ipAddress: string,
): Promise<SignatureRecord> {
  const [record] = await db
    .insert(signatures)
    .values({
      documentId,
      signerId,
      signatureData,
      ipAddress,
      signedAt: new Date(),
    })
    .returning();

  return {
    id: (record as any).id,
    documentId: (record as any).documentId,
    signerId: (record as any).signerId,
    signedAt: (record as any).signedAt,
    ipAddress: (record as any).ipAddress,
  };
}

// ---------------------------------------------------------------------------
// checkDocumentSignatureStatus — checks if all required parties have signed
// ---------------------------------------------------------------------------

export async function checkDocumentSignatureStatus(
  documentId: string,
): Promise<{ allSigned: boolean; signedCount: number; requiredCount: number }> {
  // Get the document
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc) {
    throw new Error('Document not found');
  }

  // Get all signatures for this document
  const docSignatures = await db
    .select()
    .from(signatures)
    .where(eq(signatures.documentId, documentId));

  // Determine required signatures based on document type
  // Purchase contracts and lease agreements require 2 (buyer+seller or landlord+tenant)
  // Seller disclosure requires 1 (seller) but buyer acknowledgment is also tracked
  const docType = (doc as any).type;
  let requiredCount = 2;
  if (docType === 'seller_disclosure') {
    requiredCount = 1; // at minimum, the seller
  }

  // Count unique signers
  const uniqueSigners = new Set(docSignatures.map((s: any) => s.signerId));
  const signedCount = uniqueSigners.size;
  const allSigned = signedCount >= requiredCount;

  // Update document status if all parties have signed
  if (allSigned && (doc as any).status !== 'fully_signed') {
    await db
      .update(documents)
      .set({ status: 'fully_signed', updatedAt: new Date() })
      .where(eq(documents.id, documentId));
  } else if (signedCount > 0 && !allSigned && (doc as any).status === 'draft') {
    await db
      .update(documents)
      .set({ status: 'partially_signed', updatedAt: new Date() })
      .where(eq(documents.id, documentId));
  }

  return { allSigned, signedCount, requiredCount };
}

// ---------------------------------------------------------------------------
// getSignatureAuditTrail — returns audit trail of all signature events
// ---------------------------------------------------------------------------

export async function getSignatureAuditTrail(documentId: string): Promise<AuditTrailEntry[]> {
  const docSignatures = await db
    .select()
    .from(signatures)
    .where(eq(signatures.documentId, documentId))
    .orderBy(signatures.signedAt);

  return docSignatures.map((s: any) => ({
    id: s.id,
    documentId: s.documentId,
    signerId: s.signerId,
    signedAt: s.signedAt,
    ipAddress: s.ipAddress,
    signatureData: s.signatureData,
  }));
}
