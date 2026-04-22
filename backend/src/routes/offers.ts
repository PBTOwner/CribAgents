import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, or, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { offers, properties, users, transactions } from '../db/schema.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ── Validation Schemas ─────────────────────────────────────────────────────

const createOfferSchema = z.object({
  propertyId: z.string().uuid(),
  offerPrice: z.string().or(z.number()).transform(String),
  conditions: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

const updateOfferSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'countered', 'withdrawn']),
  counterPrice: z.string().or(z.number()).transform(String).optional(),
});

// ── POST / — Create an offer ───────────────────────────────────────────────

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { propertyId, offerPrice, conditions, expiresAt } = parsed.data;

    // Verify property exists and is active
    const [property] = await db
      .select({ id: properties.id, ownerId: properties.ownerId, status: properties.status })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    if (property.status !== 'active') {
      res.status(400).json({ error: 'Property is not available for offers' });
      return;
    }

    if (property.ownerId === req.user!.id) {
      res.status(400).json({ error: 'You cannot make an offer on your own property' });
      return;
    }

    // Check for existing pending offer from this buyer
    const [existingOffer] = await db
      .select({ id: offers.id })
      .from(offers)
      .where(
        and(
          eq(offers.propertyId, propertyId),
          eq(offers.buyerId, req.user!.id),
          eq(offers.status, 'pending')
        )
      )
      .limit(1);

    if (existingOffer) {
      res.status(409).json({
        error: 'You already have a pending offer on this property',
        existingOfferId: existingOffer.id,
      });
      return;
    }

    const [offer] = await db
      .insert(offers)
      .values({
        propertyId,
        buyerId: req.user!.id,
        offerPrice,
        conditions: conditions || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    res.status(201).json({ offer });
  } catch (err) {
    console.error('Create offer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET / — List offers for the current user (as buyer or property owner) ──

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get offers where user is the buyer
    const buyerOffers = await db
      .select({
        offer: offers,
        property: {
          id: properties.id,
          title: properties.title,
          address: properties.address,
          city: properties.city,
          price: properties.price,
          images: properties.images,
        },
      })
      .from(offers)
      .innerJoin(properties, eq(offers.propertyId, properties.id))
      .where(eq(offers.buyerId, userId))
      .orderBy(desc(offers.createdAt));

    // Get offers on properties the user owns
    const sellerOffers = await db
      .select({
        offer: offers,
        property: {
          id: properties.id,
          title: properties.title,
          address: properties.address,
          city: properties.city,
          price: properties.price,
          images: properties.images,
        },
        buyer: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
        },
      })
      .from(offers)
      .innerJoin(properties, eq(offers.propertyId, properties.id))
      .innerJoin(users, eq(offers.buyerId, users.id))
      .where(eq(properties.ownerId, userId))
      .orderBy(desc(offers.createdAt));

    res.json({
      asbuyer: buyerOffers.map((r) => ({ ...r.offer, property: r.property, role: 'buyer' })),
      asSeller: sellerOffers.map((r) => ({
        ...r.offer,
        property: r.property,
        buyer: r.buyer,
        role: 'seller',
      })),
    });
  } catch (err) {
    console.error('List offers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /:id — Accept, reject, counter, or withdraw an offer ──────────────

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const parsed = updateOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { status, counterPrice } = parsed.data;

    // Fetch offer with property info
    const [existing] = await db
      .select({
        offer: offers,
        propertyOwnerId: properties.ownerId,
        propertyId: properties.id,
      })
      .from(offers)
      .innerJoin(properties, eq(offers.propertyId, properties.id))
      .where(eq(offers.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    if (existing.offer.status !== 'pending') {
      res.status(400).json({ error: `Offer is already ${existing.offer.status}` });
      return;
    }

    const userId = req.user!.id;
    const isBuyer = existing.offer.buyerId === userId;
    const isSeller = existing.propertyOwnerId === userId;

    // Buyers can only withdraw
    if (isBuyer && status !== 'withdrawn') {
      res.status(403).json({ error: 'Buyers can only withdraw their offers' });
      return;
    }

    // Sellers can accept, reject, or counter
    if (!isBuyer && !isSeller) {
      res.status(403).json({ error: 'You are not involved in this offer' });
      return;
    }

    if (isSeller && status === 'withdrawn') {
      res.status(400).json({ error: 'Sellers cannot withdraw offers — use reject instead' });
      return;
    }

    if (status === 'countered' && !counterPrice) {
      res.status(400).json({ error: 'Counter price is required when countering' });
      return;
    }

    const updateFields: Record<string, any> = { status };
    if (counterPrice) updateFields.counterPrice = counterPrice;

    const [updated] = await db
      .update(offers)
      .set(updateFields)
      .where(eq(offers.id, id))
      .returning();

    // If accepted, create a transaction and update property status
    if (status === 'accepted') {
      const [transaction] = await db
        .insert(transactions)
        .values({
          propertyId: existing.propertyId,
          buyerId: existing.offer.buyerId,
          sellerId: existing.propertyOwnerId,
          status: 'under_contract',
          offerPrice: existing.offer.offerPrice,
        })
        .returning();

      await db
        .update(properties)
        .set({ status: 'pending', updatedAt: new Date() })
        .where(eq(properties.id, existing.propertyId));

      res.json({
        offer: updated,
        transaction,
        message: 'Offer accepted. Transaction created and property marked as pending.',
      });
      return;
    }

    res.json({ offer: updated });
  } catch (err) {
    console.error('Update offer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /property/:propertyId — All offers on a property (seller only) ────

router.get('/property/:propertyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId } = req.params;

    // Verify user owns this property
    const [property] = await db
      .select({ ownerId: properties.ownerId })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    if (property.ownerId !== req.user!.id && req.user!.role !== 'agent') {
      res.status(403).json({ error: 'Only the property owner can view all offers' });
      return;
    }

    const results = await db
      .select({
        offer: offers,
        buyer: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
        },
      })
      .from(offers)
      .innerJoin(users, eq(offers.buyerId, users.id))
      .where(eq(offers.propertyId, propertyId))
      .orderBy(desc(offers.createdAt));

    res.json({
      offers: results.map((r) => ({ ...r.offer, buyer: r.buyer })),
    });
  } catch (err) {
    console.error('List property offers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
