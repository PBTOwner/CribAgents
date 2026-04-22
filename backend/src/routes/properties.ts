import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and, gte, lte, ilike, or, sql, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { properties, users } from '../db/schema.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ── Validation Schemas ─────────────────────────────────────────────────────

const createPropertySchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  propertyType: z.enum(['house', 'condo', 'townhouse', 'apartment', 'land']),
  listingType: z.enum(['sale', 'rent']),
  price: z.string().or(z.number()).transform(String),
  bedrooms: z.number().int().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  sqft: z.number().int().min(0).optional(),
  address: z.string().min(1).max(500),
  city: z.string().default('West Palm Beach'),
  state: z.string().max(2).default('FL'),
  zipCode: z.string().max(10).optional(),
  latitude: z.string().or(z.number()).transform(String).optional(),
  longitude: z.string().or(z.number()).transform(String).optional(),
  images: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  yearBuilt: z.number().int().optional(),
  parkingSpaces: z.number().int().min(0).optional(),
  petFriendly: z.boolean().optional(),
  mlsNumber: z.string().optional(),
});

const updatePropertySchema = createPropertySchema.partial().extend({
  status: z.enum(['active', 'pending', 'sold', 'rented', 'withdrawn']).optional(),
  aiGeneratedDescription: z.string().optional(),
  aiSuggestedPrice: z.string().or(z.number()).transform(String).optional(),
});

// ── GET / — List properties with filters + pagination ──────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      listing_type,
      property_type,
      min_price,
      max_price,
      bedrooms,
      bathrooms,
      city,
      search,
      status,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];

    // Default to only active listings for public
    conditions.push(eq(properties.status, (status as any) || 'active'));

    if (listing_type) {
      conditions.push(eq(properties.listingType, listing_type as any));
    }
    if (property_type) {
      conditions.push(eq(properties.propertyType, property_type as any));
    }
    if (min_price) {
      conditions.push(gte(properties.price, min_price as string));
    }
    if (max_price) {
      conditions.push(lte(properties.price, max_price as string));
    }
    if (bedrooms) {
      conditions.push(gte(properties.bedrooms, parseInt(bedrooms as string, 10)));
    }
    if (bathrooms) {
      conditions.push(gte(properties.bathrooms, bathrooms as string));
    }
    if (city) {
      conditions.push(ilike(properties.city, `%${city}%`));
    }
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(properties.title, searchTerm),
          ilike(properties.description, searchTerm),
          ilike(properties.address, searchTerm)
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [results, countResult] = await Promise.all([
      db
        .select({
          id: properties.id,
          title: properties.title,
          propertyType: properties.propertyType,
          listingType: properties.listingType,
          price: properties.price,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          sqft: properties.sqft,
          address: properties.address,
          city: properties.city,
          state: properties.state,
          zipCode: properties.zipCode,
          images: properties.images,
          status: properties.status,
          petFriendly: properties.petFriendly,
          yearBuilt: properties.yearBuilt,
          parkingSpaces: properties.parkingSpaces,
          createdAt: properties.createdAt,
        })
        .from(properties)
        .where(whereClause)
        .orderBy(desc(properties.createdAt))
        .limit(limitNum)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(properties)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    res.json({
      properties: results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('List properties error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /:id — Single property with owner info ────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const results = await db
      .select({
        property: properties,
        owner: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          role: users.role,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(properties)
      .innerJoin(users, eq(properties.ownerId, users.id))
      .where(eq(properties.id, id))
      .limit(1);

    if (results.length === 0) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    res.json(results[0]);
  } catch (err) {
    console.error('Get property error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST / — Create property (seller/landlord/agent only) ──────────────────

router.post(
  '/',
  authenticate,
  requireRole('seller', 'landlord', 'agent'),
  async (req: AuthRequest, res: Response) => {
    try {
      const parsed = createPropertySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const data = parsed.data;

      const [property] = await db
        .insert(properties)
        .values({
          ownerId: req.user!.id,
          title: data.title,
          description: data.description || null,
          propertyType: data.propertyType,
          listingType: data.listingType,
          price: data.price,
          bedrooms: data.bedrooms ?? null,
          bathrooms: data.bathrooms != null ? String(data.bathrooms) : null,
          sqft: data.sqft ?? null,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          images: data.images || null,
          features: data.features || null,
          yearBuilt: data.yearBuilt ?? null,
          parkingSpaces: data.parkingSpaces ?? null,
          petFriendly: data.petFriendly ?? false,
          mlsNumber: data.mlsNumber || null,
        })
        .returning();

      res.status(201).json({ property });
    } catch (err) {
      console.error('Create property error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ── PUT /:id — Update property (owner only) ────────────────────────────────

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const [existing] = await db
      .select({ ownerId: properties.ownerId })
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    if (existing.ownerId !== req.user!.id && req.user!.role !== 'agent') {
      res.status(403).json({ error: 'You can only update your own properties' });
      return;
    }

    const parsed = updatePropertySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parsed.data;
    const updateFields: Record<string, any> = { updatedAt: new Date() };

    if (data.title !== undefined) updateFields.title = data.title;
    if (data.description !== undefined) updateFields.description = data.description;
    if (data.propertyType !== undefined) updateFields.propertyType = data.propertyType;
    if (data.listingType !== undefined) updateFields.listingType = data.listingType;
    if (data.price !== undefined) updateFields.price = data.price;
    if (data.bedrooms !== undefined) updateFields.bedrooms = data.bedrooms;
    if (data.bathrooms !== undefined) updateFields.bathrooms = String(data.bathrooms);
    if (data.sqft !== undefined) updateFields.sqft = data.sqft;
    if (data.address !== undefined) updateFields.address = data.address;
    if (data.city !== undefined) updateFields.city = data.city;
    if (data.state !== undefined) updateFields.state = data.state;
    if (data.zipCode !== undefined) updateFields.zipCode = data.zipCode;
    if (data.latitude !== undefined) updateFields.latitude = data.latitude;
    if (data.longitude !== undefined) updateFields.longitude = data.longitude;
    if (data.images !== undefined) updateFields.images = data.images;
    if (data.features !== undefined) updateFields.features = data.features;
    if (data.yearBuilt !== undefined) updateFields.yearBuilt = data.yearBuilt;
    if (data.parkingSpaces !== undefined) updateFields.parkingSpaces = data.parkingSpaces;
    if (data.petFriendly !== undefined) updateFields.petFriendly = data.petFriendly;
    if (data.mlsNumber !== undefined) updateFields.mlsNumber = data.mlsNumber;
    if (data.status !== undefined) updateFields.status = data.status;
    if (data.aiGeneratedDescription !== undefined)
      updateFields.aiGeneratedDescription = data.aiGeneratedDescription;
    if (data.aiSuggestedPrice !== undefined)
      updateFields.aiSuggestedPrice = data.aiSuggestedPrice;

    const [updated] = await db
      .update(properties)
      .set(updateFields)
      .where(eq(properties.id, id))
      .returning();

    res.json({ property: updated });
  } catch (err) {
    console.error('Update property error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /:id — Withdraw property (soft delete) ──────────────────────────

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select({ ownerId: properties.ownerId })
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    if (existing.ownerId !== req.user!.id && req.user!.role !== 'agent') {
      res.status(403).json({ error: 'You can only withdraw your own properties' });
      return;
    }

    const [withdrawn] = await db
      .update(properties)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();

    res.json({ property: withdrawn, message: 'Property withdrawn successfully' });
  } catch (err) {
    console.error('Delete property error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
