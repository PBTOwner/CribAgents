import Stripe from 'stripe';
import { db } from '../../db/index';
import { payments, users, properties, transactions } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10' as any,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeeCalculation {
  transactionType: string;
  amount: number;
  feeRate: number;
  feeAmount: number;
  description: string;
}

// ---------------------------------------------------------------------------
// createCustomer — creates a Stripe customer linked to a CribAgents user
// ---------------------------------------------------------------------------

export async function createCustomer(
  userId: string,
  email: string,
  name: string,
): Promise<Stripe.Customer> {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      cribagents_user_id: userId,
    },
  });

  // Store the Stripe customer ID on the user record
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id } as any)
    .where(eq(users.id, userId));

  return customer;
}

// ---------------------------------------------------------------------------
// createPaymentIntent — creates a Stripe payment intent
// ---------------------------------------------------------------------------

export async function createPaymentIntent(
  amount: number,
  customerId: string,
  metadata: Record<string, string>,
): Promise<Stripe.PaymentIntent> {
  // Stripe expects amount in cents
  const amountInCents = Math.round(amount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'usd',
    customer: customerId,
    metadata: {
      ...metadata,
      platform: 'cribagents',
    },
    automatic_payment_methods: {
      enabled: true,
    },
    description: metadata.description || 'CribAgents transaction fee',
  });

  // Save the payment record in our database
  await db.insert(payments).values({
    stripePaymentIntentId: paymentIntent.id,
    userId: metadata.user_id || '',
    amount: amount.toString(),
    currency: 'usd',
    status: paymentIntent.status,
    type: metadata.transaction_type || 'fee',
    propertyId: metadata.property_id || null,
    metadata: JSON.stringify(metadata),
  });

  return paymentIntent;
}

// ---------------------------------------------------------------------------
// calculateFees — determine platform fee based on transaction type and amount
// ---------------------------------------------------------------------------

export function calculateFees(
  transactionType: 'purchase_buyer' | 'listing_seller' | 'rental',
  amount: number,
): FeeCalculation {
  let feeRate: number;
  let description: string;

  switch (transactionType) {
    case 'purchase_buyer':
      // 1% of purchase price for the buyer
      feeRate = 0.01;
      description = 'Buyer platform fee (1% of purchase price)';
      break;

    case 'listing_seller':
      // 1% of listing/sale price for the seller
      feeRate = 0.01;
      description = 'Seller listing fee (1% of sale price)';
      break;

    case 'rental':
      // 1 month's rent for rentals
      feeRate = 1.0; // 100% of one month's rent
      description = "Rental placement fee (1 month's rent)";
      break;

    default:
      feeRate = 0.01;
      description = 'Platform fee (1%)';
  }

  const feeAmount = Math.round(amount * feeRate * 100) / 100;

  return {
    transactionType,
    amount,
    feeRate,
    feeAmount,
    description,
  };
}

// ---------------------------------------------------------------------------
// handleWebhook — process Stripe webhook events
// ---------------------------------------------------------------------------

export async function handleWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`[Stripe] Payment succeeded: ${paymentIntent.id}`);

      // Update payment record status
      await db
        .update(payments)
        .set({
          status: 'succeeded',
          updatedAt: new Date(),
        } as any)
        .where(eq(payments.stripePaymentIntentId, paymentIntent.id));

      // If this is tied to a transaction, update the transaction status
      const metadata = paymentIntent.metadata;
      if (metadata.transaction_id) {
        await db
          .update(transactions)
          .set({
            paymentStatus: 'paid',
            updatedAt: new Date(),
          } as any)
          .where(eq(transactions.id, metadata.transaction_id));
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`[Stripe] Payment failed: ${paymentIntent.id}`);

      await db
        .update(payments)
        .set({
          status: 'failed',
          updatedAt: new Date(),
        } as any)
        .where(eq(payments.stripePaymentIntentId, paymentIntent.id));
      break;
    }

    case 'payment_intent.canceled': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`[Stripe] Payment canceled: ${paymentIntent.id}`);

      await db
        .update(payments)
        .set({
          status: 'canceled',
          updatedAt: new Date(),
        } as any)
        .where(eq(payments.stripePaymentIntentId, paymentIntent.id));
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      console.log(`[Stripe] Charge refunded: ${charge.id}`);

      if (charge.payment_intent) {
        await db
          .update(payments)
          .set({
            status: 'refunded',
            updatedAt: new Date(),
          } as any)
          .where(eq(payments.stripePaymentIntentId, charge.payment_intent as string));
      }
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }
}

// ---------------------------------------------------------------------------
// getPaymentHistory — get user's payment history
// ---------------------------------------------------------------------------

export async function getPaymentHistory(userId: string) {
  const userPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt));

  return userPayments;
}
