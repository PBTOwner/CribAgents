import { Router, Response } from 'express';
import { eq, or, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { transactions, properties, users, payments } from '../db/schema.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ── GET / — list user's transactions ──────────────────────────────────────

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const results = await db
      .select({
        transaction: transactions,
        property: {
          id: properties.id,
          title: properties.title,
          address: properties.address,
          city: properties.city,
          images: properties.images,
          price: properties.price,
          listingType: properties.listingType,
        },
      })
      .from(transactions)
      .innerJoin(properties, eq(transactions.propertyId, properties.id))
      .where(or(eq(transactions.buyerId, userId), eq(transactions.sellerId, userId)))
      .orderBy(desc(transactions.createdAt));

    const enriched = await Promise.all(
      results.map(async (r) => {
        const isBuyer = r.transaction.buyerId === userId;
        const counterpartyId = isBuyer ? r.transaction.sellerId : r.transaction.buyerId;

        const [counterparty] = await db
          .select({ fullName: users.fullName, email: users.email, phone: users.phone })
          .from(users)
          .where(eq(users.id, counterpartyId))
          .limit(1);

        return {
          ...r.transaction,
          property: r.property,
          role: isBuyer ? 'buyer' : 'seller',
          counterparty: counterparty || null,
        };
      })
    );

    res.json({ transactions: enriched });
  } catch (err) {
    console.error('List transactions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /:id — single transaction with payments ───────────────────────────

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const [result] = await db
      .select({
        transaction: transactions,
        property: properties,
        buyer: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
        },
      })
      .from(transactions)
      .innerJoin(properties, eq(transactions.propertyId, properties.id))
      .innerJoin(users, eq(transactions.buyerId, users.id))
      .where(eq(transactions.id, id))
      .limit(1);

    if (!result) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    if (result.transaction.buyerId !== userId && result.transaction.sellerId !== userId) {
      res.status(403).json({ error: 'You are not a party to this transaction' });
      return;
    }

    const txPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, id))
      .orderBy(desc(payments.createdAt));

    res.json({ transaction: { ...result.transaction, property: result.property, buyer: result.buyer }, payments: txPayments });
  } catch (err) {
    console.error('Get transaction error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /:id/status — update transaction status ───────────────────────────

router.put('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, closingDate } = req.body;
    const userId = req.user!.id;

    const validStatuses = ['initiated', 'under_contract', 'inspection', 'appraisal', 'closing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const [existing] = await db
      .select({ buyerId: transactions.buyerId, sellerId: transactions.sellerId })
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    if (existing.buyerId !== userId && existing.sellerId !== userId) {
      res.status(403).json({ error: 'You are not a party to this transaction' });
      return;
    }

    const updateFields: Record<string, any> = { status, updatedAt: new Date() };
    if (closingDate) updateFields.closingDate = new Date(closingDate);

    const [updated] = await db
      .update(transactions)
      .set(updateFields)
      .where(eq(transactions.id, id))
      .returning();

    res.json({ transaction: updated });
  } catch (err) {
    console.error('Update transaction status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
