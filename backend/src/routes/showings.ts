import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, or, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { showings, properties, users } from '../db/schema.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ── Validation Schemas ─────────────────────────────────────────────────────

const createShowingSchema = z.object({
  propertyId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

const updateShowingSchema = z.object({
  status: z.enum(['confirmed', 'completed', 'cancelled']),
  notes: z.string().optional(),
});

// ── POST / — Request a showing ─────────────────────────────────────────────

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createShowingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { propertyId, scheduledAt, notes } = parsed.data;

    // Fetch the property to get the seller/owner
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
      res.status(400).json({ error: 'Property is not available for showings' });
      return;
    }

    if (property.ownerId === req.user!.id) {
      res.status(400).json({ error: 'You cannot request a showing for your own property' });
      return;
    }

    const [showing] = await db
      .insert(showings)
      .values({
        propertyId,
        buyerId: req.user!.id,
        sellerId: property.ownerId,
        scheduledAt: new Date(scheduledAt),
        notes: notes || null,
      })
      .returning();

    res.status(201).json({ showing });
  } catch (err) {
    console.error('Create showing error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET / — List user's showings (as buyer or seller) ──────────────────────

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const results = await db
      .select({
        showing: showings,
        property: {
          id: properties.id,
          title: properties.title,
          address: properties.address,
          city: properties.city,
          images: properties.images,
          price: properties.price,
        },
      })
      .from(showings)
      .innerJoin(properties, eq(showings.propertyId, properties.id))
      .where(or(eq(showings.buyerId, userId), eq(showings.sellerId, userId)))
      .orderBy(desc(showings.scheduledAt));

    // Enrich with counterparty names
    const enriched = await Promise.all(
      results.map(async (r) => {
        const isBuyer = r.showing.buyerId === userId;
        const counterpartyId = isBuyer ? r.showing.sellerId : r.showing.buyerId;

        const [counterparty] = await db
          .select({ fullName: users.fullName, email: users.email, phone: users.phone })
          .from(users)
          .where(eq(users.id, counterpartyId))
          .limit(1);

        return {
          ...r.showing,
          property: r.property,
          role: isBuyer ? 'buyer' : 'seller',
          counterparty: counterparty || null,
        };
      })
    );

    res.json({ showings: enriched });
  } catch (err) {
    console.error('List showings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /:id — Update showing status ──────────────────────────────────────

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const parsed = updateShowingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { status, notes } = parsed.data;

    // Fetch existing showing
    const [existing] = await db
      .select()
      .from(showings)
      .where(eq(showings.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Showing not found' });
      return;
    }

    // Only buyer or seller involved can update
    const userId = req.user!.id;
    if (existing.buyerId !== userId && existing.sellerId !== userId) {
      res.status(403).json({ error: 'You are not involved in this showing' });
      return;
    }

    // Sellers confirm, either party can cancel, seller can complete
    if (status === 'confirmed' && existing.sellerId !== userId) {
      res.status(403).json({ error: 'Only the property owner can confirm showings' });
      return;
    }

    if (status === 'completed' && existing.sellerId !== userId) {
      res.status(403).json({ error: 'Only the property owner can mark showings complete' });
      return;
    }

    const updateFields: Record<string, any> = { status };
    if (notes !== undefined) updateFields.notes = notes;

    const [updated] = await db
      .update(showings)
      .set(updateFields)
      .where(eq(showings.id, id))
      .returning();

    res.json({ showing: updated });
  } catch (err) {
    console.error('Update showing error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
