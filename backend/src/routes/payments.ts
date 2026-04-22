import { Router, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import Stripe from 'stripe';
import { db } from '../db/index.js';
import { payments, transactions, users, properties } from '../db/schema.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-04-10' as any });

// ── POST /create-intent — create Stripe PaymentIntent for a commission ────

router.post('/create-intent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId, feeType } = req.body;
    const userId = req.user!.id;

    if (!transactionId || !feeType) {
      res.status(400).json({ error: 'transactionId and feeType are required' });
      return;
    }

    const validFeeTypes = ['buyer_commission', 'seller_commission', 'rental_fee'];
    if (!validFeeTypes.includes(feeType)) {
      res.status(400).json({ error: 'Invalid feeType' });
      return;
    }

    const [txResult] = await db
      .select({ transaction: transactions, property: properties })
      .from(transactions)
      .innerJoin(properties, eq(transactions.propertyId, properties.id))
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!txResult) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const { transaction, property } = txResult;

    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      res.status(403).json({ error: 'You are not a party to this transaction' });
      return;
    }

    // Calculate commission in cents
    const price = parseFloat((transaction.finalPrice || transaction.offerPrice || '0').toString());
    let amountCents: number;
    let description: string;

    if (property.listingType === 'rent') {
      // 1 month rent
      amountCents = Math.round(price * 100);
      description = `CribAgents Rental Fee — ${property.address}`;
    } else {
      // 1% of purchase price, minimum $2,500
      amountCents = Math.max(Math.round(price * 0.01 * 100), 250000);
      description = `CribAgents ${feeType === 'buyer_commission' ? 'Buyer' : 'Seller'} Commission — ${property.address}`;
    }

    // Ensure Stripe customer ID
    let stripeCustomerId = (await db.select({ stripeCustomerId: users.stripeCustomerId })
      .from(users).where(eq(users.id, userId)).limit(1))[0]?.stripeCustomerId;

    if (!stripeCustomerId) {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const customer = await stripe.customers.create({ email: user.email, name: user.fullName });
      stripeCustomerId = customer.id;
      await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: stripeCustomerId,
      description,
      metadata: { transactionId, feeType, userId },
    });

    // Record pending payment
    const [payment] = await db
      .insert(payments)
      .values({
        userId,
        transactionId,
        stripePaymentIntentId: paymentIntent.id,
        amount: amountCents,
        feeType: feeType as any,
        status: 'pending',
      })
      .returning();

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      amount: amountCents,
      amountFormatted: `$${(amountCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    });
  } catch (err) {
    console.error('Create payment intent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /webhook — Stripe webhook handler ────────────────────────────────

router.post('/webhook', async (req: any, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body as Stripe.Event;
    }
  } catch (err: any) {
    res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    await db
      .update(payments)
      .set({ status: 'completed' })
      .where(eq(payments.stripePaymentIntentId, pi.id));
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    await db
      .update(payments)
      .set({ status: 'failed' })
      .where(eq(payments.stripePaymentIntentId, pi.id));
  }

  res.json({ received: true });
});

// ── GET / — list user's payments ──────────────────────────────────────────

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const userPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));

    res.json({ payments: userPayments });
  } catch (err) {
    console.error('List payments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
