import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/index.js';
import {
  conversations,
  messages,
  properties,
  showings,
  documents,
  offers,
  users,
} from '../db/schema.js';
import { eq, and, gte, lte, ilike, sql, desc } from 'drizzle-orm';
import { generatePurchaseContract, generateLeaseAgreement, generateSellerDisclosure } from './document-generator.js';

const anthropic = new Anthropic();

// ---------------------------------------------------------------------------
// Tool definitions for Claude tool_use
// ---------------------------------------------------------------------------

const tools: Anthropic.Tool[] = [
  {
    name: 'schedule_showing',
    description:
      'Schedule a property showing for a buyer. Creates a showing record and returns confirmation details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        property_id: { type: 'string', description: 'UUID of the property to show' },
        preferred_date: { type: 'string', description: 'Preferred date in YYYY-MM-DD format' },
        preferred_time: { type: 'string', description: 'Preferred time in HH:MM format (24h)' },
        buyer_notes: { type: 'string', description: 'Any notes from the buyer about the showing' },
      },
      required: ['property_id', 'preferred_date', 'preferred_time'],
    },
  },
  {
    name: 'search_properties',
    description:
      'Search available properties with filters. Returns matching listings from the database.',
    input_schema: {
      type: 'object' as const,
      properties: {
        listing_type: { type: 'string', enum: ['sale', 'rent'], description: 'Type of listing' },
        min_price: { type: 'number', description: 'Minimum price' },
        max_price: { type: 'number', description: 'Maximum price' },
        bedrooms: { type: 'number', description: 'Minimum number of bedrooms' },
        bathrooms: { type: 'number', description: 'Minimum number of bathrooms' },
        property_type: {
          type: 'string',
          enum: ['single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial'],
          description: 'Property type',
        },
        keyword: { type: 'string', description: 'Keyword to search in description or address' },
      },
      required: [],
    },
  },
  {
    name: 'generate_document',
    description:
      'Generate a Florida real estate document (purchase contract, lease agreement, or seller disclosure).',
    input_schema: {
      type: 'object' as const,
      properties: {
        document_type: {
          type: 'string',
          enum: ['purchase_contract', 'lease_agreement', 'seller_disclosure'],
          description: 'Type of document to generate',
        },
        property_id: { type: 'string', description: 'UUID of the property' },
        buyer_id: { type: 'string', description: 'UUID of the buyer/tenant' },
        seller_id: { type: 'string', description: 'UUID of the seller/landlord' },
        terms: {
          type: 'object',
          description: 'Contract terms including price, closing_date, conditions, deposit, etc.',
          properties: {
            price: { type: 'number' },
            closing_date: { type: 'string' },
            conditions: { type: 'array', items: { type: 'string' } },
            deposit: { type: 'number' },
            inspection_period_days: { type: 'number' },
            lease_start: { type: 'string' },
            lease_end: { type: 'string' },
            monthly_rent: { type: 'number' },
            security_deposit: { type: 'number' },
          },
        },
      },
      required: ['document_type', 'property_id', 'buyer_id', 'seller_id', 'terms'],
    },
  },
  {
    name: 'send_message',
    description: 'Send a message/notification to a user (email or SMS simulation).',
    input_schema: {
      type: 'object' as const,
      properties: {
        recipient_id: { type: 'string', description: 'UUID of the recipient user' },
        subject: { type: 'string', description: 'Subject of the message' },
        message: { type: 'string', description: 'Message body' },
      },
      required: ['recipient_id', 'subject', 'message'],
    },
  },
  {
    name: 'create_offer',
    description:
      'Create a purchase offer on a property. Saves the offer and notifies the seller.',
    input_schema: {
      type: 'object' as const,
      properties: {
        property_id: { type: 'string', description: 'UUID of the property' },
        offer_price: { type: 'number', description: 'Offer price in dollars' },
        conditions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Offer conditions/contingencies',
        },
        expires_in_days: { type: 'number', description: 'Number of days until offer expires' },
      },
      required: ['property_id', 'offer_price'],
    },
  },
  {
    name: 'analyze_comps',
    description:
      'Analyze comparable properties (comps) near a given property or address. Returns average price per sqft, price range, and comp details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        property_id: { type: 'string', description: 'UUID of the subject property' },
        address: { type: 'string', description: 'Address to search comps for (alternative to property_id)' },
        radius_miles: { type: 'number', description: 'Search radius in miles (default 1)' },
      },
      required: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution handlers
// ---------------------------------------------------------------------------

async function executeScheduleShowing(
  params: { property_id: string; preferred_date: string; preferred_time: string; buyer_notes?: string },
  userId: string,
): Promise<string> {
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, params.property_id))
    .limit(1);

  if (!property) {
    return JSON.stringify({ error: 'Property not found' });
  }

  const scheduledAt = new Date(`${params.preferred_date}T${params.preferred_time}:00`);

  const [showing] = await db
    .insert(showings)
    .values({
      propertyId: params.property_id,
      buyerId: userId,
      sellerId: property.ownerId,
      scheduledAt,
      notes: params.buyer_notes || null,
      status: 'requested',
    })
    .returning();

  return JSON.stringify({
    success: true,
    showing_id: showing.id,
    property_address: property.address,
    scheduled_at: scheduledAt.toISOString(),
    status: 'pending',
    message: `Showing scheduled for ${params.preferred_date} at ${params.preferred_time}. You will receive a confirmation once the seller/agent approves.`,
  });
}

async function executeSearchProperties(params: {
  listing_type?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
  keyword?: string;
}): Promise<string> {
  const conditions: any[] = [];

  if (params.listing_type) {
    conditions.push(eq(properties.listingType, params.listing_type));
  }
  if (params.min_price !== undefined) {
    conditions.push(gte(properties.price, params.min_price.toString()));
  }
  if (params.max_price !== undefined) {
    conditions.push(lte(properties.price, params.max_price.toString()));
  }
  if (params.bedrooms !== undefined) {
    conditions.push(gte(properties.bedrooms, params.bedrooms));
  }
  if (params.bathrooms !== undefined) {
    conditions.push(gte(properties.bathrooms, params.bathrooms));
  }
  if (params.property_type) {
    conditions.push(eq(properties.propertyType, params.property_type));
  }
  if (params.keyword) {
    conditions.push(
      sql`(${properties.address} ILIKE ${'%' + params.keyword + '%'} OR ${properties.description} ILIKE ${'%' + params.keyword + '%'})`,
    );
  }

  const query = conditions.length > 0
    ? db.select().from(properties).where(and(...conditions)).limit(20)
    : db.select().from(properties).limit(20);

  const results = await query;

  return JSON.stringify({
    count: results.length,
    properties: results.map((p: any) => ({
      id: p.id,
      address: p.address,
      city: p.city,
      state: p.state,
      zip: p.zip,
      price: p.price,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      sqft: p.sqft,
      property_type: p.propertyType,
      listing_type: p.listingType,
      description: p.description,
      year_built: p.yearBuilt,
      status: p.status,
    })),
  });
}

async function executeGenerateDocument(params: {
  document_type: string;
  property_id: string;
  buyer_id: string;
  seller_id: string;
  terms: any;
}): Promise<string> {
  const [property] = await db.select().from(properties).where(eq(properties.id, params.property_id)).limit(1);
  const [buyer] = await db.select().from(users).where(eq(users.id, params.buyer_id)).limit(1);
  const [seller] = await db.select().from(users).where(eq(users.id, params.seller_id)).limit(1);

  if (!property || !buyer || !seller) {
    return JSON.stringify({ error: 'Property, buyer, or seller not found' });
  }

  let pdfBuffer: Buffer;
  let title: string;

  switch (params.document_type) {
    case 'purchase_contract':
      title = `Purchase Contract - ${property.address}`;
      pdfBuffer = await generatePurchaseContract({
        buyer: buyer as any,
        seller: seller as any,
        property: property as any,
        terms: params.terms,
      });
      break;
    case 'lease_agreement':
      title = `Lease Agreement - ${property.address}`;
      pdfBuffer = await generateLeaseAgreement({
        landlord: seller as any,
        tenant: buyer as any,
        property: property as any,
        terms: params.terms,
      });
      break;
    case 'seller_disclosure':
      title = `Seller Disclosure - ${property.address}`;
      pdfBuffer = await generateSellerDisclosure({
        seller: seller as any,
        property: property as any,
        disclosures: params.terms,
      });
      break;
    default:
      return JSON.stringify({ error: 'Invalid document type' });
  }

  const [doc] = await db
    .insert(documents)
    .values({
      title,
      type: params.document_type as any,
      propertyId: params.property_id,
      createdBy: params.seller_id,
      pdfBase64: pdfBuffer.toString('base64'),
      status: 'draft',
    })
    .returning();

  return JSON.stringify({
    success: true,
    document_id: doc.id,
    title,
    type: params.document_type,
    status: 'draft',
    message: `Document "${title}" has been generated and is ready for review and signatures.`,
  });
}

async function executeSendMessage(params: {
  recipient_id: string;
  subject: string;
  message: string;
}): Promise<string> {
  const [recipient] = await db.select().from(users).where(eq(users.id, params.recipient_id)).limit(1);

  if (!recipient) {
    return JSON.stringify({ error: 'Recipient not found' });
  }

  // Simulate sending (log for now — in production hook into SendGrid / Twilio)
  console.log(`[NOTIFICATION] To: ${recipient.email} | Subject: ${params.subject} | Body: ${params.message}`);

  return JSON.stringify({
    success: true,
    recipient_email: recipient.email,
    subject: params.subject,
    message: 'Notification sent successfully.',
  });
}

async function executeCreateOffer(
  params: {
    property_id: string;
    offer_price: number;
    conditions?: string[];
    expires_in_days?: number;
  },
  userId: string,
): Promise<string> {
  const [property] = await db.select().from(properties).where(eq(properties.id, params.property_id)).limit(1);

  if (!property) {
    return JSON.stringify({ error: 'Property not found' });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (params.expires_in_days || 3));

  const [offer] = await db
    .insert(offers)
    .values({
      propertyId: params.property_id,
      buyerId: userId,
      offerPrice: params.offer_price.toString(),
      conditions: JSON.stringify(params.conditions || []),
      expiresAt,
      status: 'pending',
    })
    .returning();

  // Notify the seller
  if (property.ownerId) {
    console.log(
      `[NOTIFICATION] New offer of $${params.offer_price.toLocaleString()} on ${property.address} from buyer ${userId}`,
    );
  }

  return JSON.stringify({
    success: true,
    offer_id: offer.id,
    property_address: property.address,
    offer_price: params.offer_price,
    expires_at: expiresAt.toISOString(),
    status: 'pending',
    message: `Offer of $${params.offer_price.toLocaleString()} submitted. The seller has been notified and has until ${expiresAt.toLocaleDateString()} to respond.`,
  });
}

async function executeAnalyzeComps(params: {
  property_id?: string;
  address?: string;
  radius_miles?: number;
}): Promise<string> {
  let subjectProperty: any = null;

  if (params.property_id) {
    [subjectProperty] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, params.property_id))
      .limit(1);
  }

  if (!subjectProperty && !params.address) {
    return JSON.stringify({ error: 'Please provide a property_id or address.' });
  }

  const city = subjectProperty?.city || 'West Palm Beach';
  const propertyType = subjectProperty?.propertyType || 'single_family';
  const subjectPrice = subjectProperty ? parseFloat(subjectProperty.price) : 0;

  // Query comparable properties in the same city and type
  const compsConditions: any[] = [
    eq(properties.city, city),
    eq(properties.propertyType, propertyType),
  ];

  if (subjectProperty) {
    // Exclude the subject property itself
    compsConditions.push(sql`${properties.id} != ${subjectProperty.id}`);
    // Within 30% price range
    const lowPrice = subjectPrice * 0.7;
    const highPrice = subjectPrice * 1.3;
    compsConditions.push(gte(properties.price, lowPrice.toString()));
    compsConditions.push(lte(properties.price, highPrice.toString()));
  }

  const comps = await db
    .select()
    .from(properties)
    .where(and(...compsConditions))
    .limit(10);

  if (comps.length === 0) {
    return JSON.stringify({
      subject: subjectProperty
        ? { address: subjectProperty.address, price: subjectProperty.price }
        : { address: params.address },
      comps_found: 0,
      message: 'No comparable properties found in the area. Try widening your search.',
    });
  }

  const prices = comps.map((c: any) => parseFloat(c.price));
  const sqfts = comps.filter((c: any) => c.sqft && c.sqft > 0).map((c: any) => c.sqft);
  const pricesPerSqft = comps
    .filter((c: any) => c.sqft && c.sqft > 0)
    .map((c: any) => parseFloat(c.price) / c.sqft);

  const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
  const avgPricePerSqft =
    pricesPerSqft.length > 0
      ? pricesPerSqft.reduce((a: number, b: number) => a + b, 0) / pricesPerSqft.length
      : null;

  return JSON.stringify({
    subject: subjectProperty
      ? { address: subjectProperty.address, price: subjectProperty.price, sqft: subjectProperty.sqft }
      : { address: params.address },
    comps_found: comps.length,
    analysis: {
      avg_price: Math.round(avgPrice),
      min_price: Math.min(...prices),
      max_price: Math.max(...prices),
      avg_price_per_sqft: avgPricePerSqft ? Math.round(avgPricePerSqft) : 'N/A',
      median_price: prices.sort((a: number, b: number) => a - b)[Math.floor(prices.length / 2)],
    },
    comparables: comps.map((c: any) => ({
      id: c.id,
      address: c.address,
      price: c.price,
      sqft: c.sqft,
      bedrooms: c.bedrooms,
      bathrooms: c.bathrooms,
      year_built: c.yearBuilt,
      price_per_sqft: c.sqft ? Math.round(parseFloat(c.price) / c.sqft) : 'N/A',
    })),
  });
}

// ---------------------------------------------------------------------------
// Dispatch tool calls
// ---------------------------------------------------------------------------

async function executeTool(
  toolName: string,
  toolInput: any,
  userId: string,
): Promise<string> {
  switch (toolName) {
    case 'schedule_showing':
      return executeScheduleShowing(toolInput, userId);
    case 'search_properties':
      return executeSearchProperties(toolInput);
    case 'generate_document':
      return executeGenerateDocument(toolInput);
    case 'send_message':
      return executeSendMessage(toolInput);
    case 'create_offer':
      return executeCreateOffer(toolInput, userId);
    case 'analyze_comps':
      return executeAnalyzeComps(toolInput);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are CribAgent — an AI-powered real estate assistant built for Rasha, a licensed Florida realtor operating in West Palm Beach, FL and the surrounding Palm Beach County area.

You are deeply knowledgeable about:
- The West Palm Beach real estate market, including neighborhoods like Downtown WPB, Northwood, Flamingo Park, El Cid, SoSo, Palm Beach Lakes, Riviera Beach, Lake Worth, Boynton Beach, and surrounding areas.
- Florida real estate law including Florida Statutes Chapter 475 (Real Estate Brokers), Chapter 689 (Conveyances), Chapter 720 (HOAs), and Chapter 83 (Landlord-Tenant).
- FAR/BAR (Florida Association of Realtors / Florida Bar) contract forms, including the AS IS Residential Contract, standard Residential Contract, Vacant Land Contract, and Rider forms.
- Closing procedures in Florida, including title insurance requirements, documentary stamp taxes ($0.70 per $100), intangible tax on mortgages ($0.002), and recording fees.
- Property tax assessment in Palm Beach County and the homestead exemption.
- Flood zone designations and insurance requirements common in South Florida.
- Condo and HOA documentation requirements under Florida law.

Your capabilities:
- Search for properties matching buyer criteria
- Schedule property showings
- Generate Florida real estate documents (purchase contracts, lease agreements, seller disclosures)
- Create and submit offers
- Analyze comparable properties for pricing guidance
- Send notifications to buyers, sellers, and other parties

Always be professional, helpful, and proactive. When a user describes what they're looking for, use the search tool. When they want to move forward on a property, help them create an offer or schedule a showing. Explain Florida-specific requirements when relevant.

When generating documents, remind users that these are templates and should be reviewed by a Florida-licensed attorney before execution. Rasha will review all documents before they are finalized.

For pricing advice, always run a comp analysis and present data-driven recommendations. Note that the West Palm Beach market has seen significant appreciation, and waterfront/intracoastal properties command premium pricing.`;

// ---------------------------------------------------------------------------
// Main agentic loop
// ---------------------------------------------------------------------------

export interface AgentResponse {
  response: string;
  toolsUsed: string[];
}

export async function processMessage(
  conversationId: string,
  userId: string,
  userMessage: string,
): Promise<AgentResponse> {
  // 1. Save the user's message
  await db.insert(messages).values({
    conversationId,
    role: 'user',
    content: userMessage,
  });

  // 2. Load conversation history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  // Build Claude message history
  const claudeMessages: Anthropic.MessageParam[] = history.map((m: any) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  // 3. Agentic loop — keep calling Claude until we get a final text response
  const toolsUsed: string[] = [];
  let currentMessages = [...claudeMessages];
  let finalResponse = '';
  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages: currentMessages,
    });

    // Check if the response contains tool use
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    );

    if (toolUseBlocks.length === 0) {
      // No tool calls — we have the final text response
      finalResponse = textBlocks.map((b) => b.text).join('\n');
      break;
    }

    // Build the assistant message with all content blocks
    currentMessages.push({
      role: 'assistant',
      content: response.content,
    });

    // Execute each tool call and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolBlock of toolUseBlocks) {
      toolsUsed.push(toolBlock.name);
      let result: string;
      try {
        result = await executeTool(toolBlock.name, toolBlock.input, userId);
      } catch (err: any) {
        result = JSON.stringify({ error: err.message });
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: result,
      });
    }

    // Add tool results as a user message
    currentMessages.push({
      role: 'user',
      content: toolResults,
    });

    // If we also got text alongside tools and this is end_turn, capture it
    if (response.stop_reason === 'end_turn' && textBlocks.length > 0) {
      finalResponse = textBlocks.map((b) => b.text).join('\n');
      break;
    }
  }

  // 4. Save the assistant's final response
  if (finalResponse) {
    await db.insert(messages).values({
      conversationId,
      role: 'assistant',
      content: finalResponse,
    });
  }

  // 5. Update conversation's updatedAt
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return {
    response: finalResponse,
    toolsUsed,
  };
}
