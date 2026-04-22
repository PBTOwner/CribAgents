# CribAgents — AI-Powered Real Estate Platform

**West Palm Beach, FL** | Built for Rasha, Licensed Florida Realtor

CribAgents is a full-stack real estate platform where an AI agent acts as a scalable realtor assistant — scheduling showings, generating Florida-compliant contracts, analyzing comps, managing offers, and guiding buyers and sellers through every step of a transaction.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React Native / Expo (TypeScript) |
| **Backend** | Express.js (TypeScript) |
| **Database** | PostgreSQL + Drizzle ORM |
| **AI** | Claude API with tool-use (agentic) |
| **Payments** | Stripe |
| **Documents** | PDFKit (Florida FAR/BAR contracts) |

---

## Project Structure

```
CribAgents/
├── backend/
│   ├── src/
│   │   ├── db/              # Drizzle schema + connection
│   │   ├── middleware/       # JWT auth middleware
│   │   ├── routes/           # Express API routes
│   │   │   ├── auth.ts       # Register, login, profile
│   │   │   ├── properties.ts # Property CRUD with filters
│   │   │   ├── ai.ts         # AI agent conversations
│   │   │   ├── documents.ts  # Document generation + signing
│   │   │   ├── offers.ts     # Offer management
│   │   │   ├── showings.ts   # Showing scheduler
│   │   │   ├── payments.ts   # Stripe integration
│   │   │   └── scraped-listings.ts
│   │   ├── services/
│   │   │   ├── ai-agent.ts           # Claude tool-use agent
│   │   │   ├── document-generator.ts  # PDF contract generation
│   │   │   ├── esign.ts              # E-signature system
│   │   │   └── payments.ts           # Stripe service
│   │   └── scrapers/         # Rental listing scrapers
│   │       ├── zillow-scraper.ts
│   │       ├── apartments-scraper.ts
│   │       ├── realtor-scraper.ts
│   │       ├── craigslist-scraper.ts
│   │       └── redfin-scraper.ts
│   ├── drizzle/              # SQL migrations
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── SignupScreen.tsx
│   │   │   ├── HomeScreen.tsx          # Property search (buy/rent)
│   │   │   ├── PropertyDetailScreen.tsx
│   │   │   ├── AIChatScreen.tsx        # AI realtor chat
│   │   │   ├── ListPropertyScreen.tsx  # Seller listing
│   │   │   ├── DocumentsScreen.tsx
│   │   │   ├── DocumentViewerScreen.tsx
│   │   │   ├── ESignatureScreen.tsx
│   │   │   └── ProfileScreen.tsx
│   │   ├── components/
│   │   │   ├── PropertyCard.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── ChatBubble.tsx
│   │   │   └── ActionCard.tsx
│   │   ├── navigation/
│   │   ├── utils/
│   │   │   ├── api.ts         # Axios client
│   │   │   ├── store.ts       # Zustand state
│   │   │   └── theme.ts       # Design tokens
│   ├── App.tsx
│   ├── app.json
│   └── package.json
│
├── .env.example
├── .gitignore
└── package.json               # Monorepo root (workspaces)
```

> **Note:** You may see a `mobile/` directory — this is a duplicate and can be safely deleted.

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Expo CLI (`npm install -g expo-cli`)
- Stripe account (for payments)
- Anthropic API key (for Claude AI agent)

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/CribAgents.git
cd CribAgents
npm install        # installs all workspace dependencies
```

### 2. Environment Variables

```bash
cp .env.example backend/.env
```

Edit `backend/.env` and fill in:

```
DATABASE_URL=postgresql://user:password@localhost:5432/cribagents
JWT_SECRET=your-secure-random-secret
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=3001
```

### 3. Database Setup

```bash
# Create the database
createdb cribagents

# Run migrations
cd backend
npx drizzle-kit push
# OR apply the raw migration:
# psql cribagents < drizzle/0000_initial_migration.sql
```

### 4. Start the Backend

```bash
cd backend
npm run dev        # starts with tsx watch
```

The API will be running at `http://localhost:3001`. Test with:
```bash
curl http://localhost:3001/api/health
```

### 5. Start the Frontend

```bash
cd frontend
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) or press `w` for web.

---

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in (returns JWT)
- `GET /api/auth/me` — Current user profile

### Properties
- `GET /api/properties` — Search/filter listings
- `GET /api/properties/:id` — Property detail
- `POST /api/properties` — Create listing
- `PUT /api/properties/:id` — Update listing
- `DELETE /api/properties/:id` — Withdraw listing

### AI Agent
- `POST /api/agent/conversations` — Start new conversation
- `POST /api/agent/conversations/:id/message` — Chat with AI
- `GET /api/agent/conversations` — List conversations

### Documents
- `POST /api/documents/generate` — Generate contract/lease/disclosure
- `POST /api/documents/:id/sign` — E-sign a document
- `GET /api/documents/:id/pdf` — Download PDF

### Offers & Showings
- `POST /api/offers` — Submit offer
- `PUT /api/offers/:id` — Accept/reject/counter
- `POST /api/showings` — Request showing
- `PUT /api/showings/:id` — Confirm/cancel

### Payments
- `POST /api/payments/create-intent` — Create Stripe payment
- `GET /api/payments/fees/:propertyId` — Calculate fees

### Scraped Listings
- `GET /api/scraped-listings` — Browse scraped rentals
- `POST /api/scraped-listings/scrape` — Trigger scrape run

---

## AI Agent Tools

The Claude-powered AI agent has access to these tools:

| Tool | Description |
|------|-------------|
| `schedule_showing` | Book property showings with date/time coordination |
| `search_properties` | Query listings with filters (price, beds, type) |
| `generate_document` | Create FAR/BAR contracts, leases, disclosures |
| `send_message` | Notify buyers, sellers, or landlords |
| `create_offer` | Submit purchase offers with terms and conditions |
| `analyze_comps` | Run comparable sales analysis for pricing |

---

## Fee Structure

| Transaction Type | Fee | Who Pays |
|-----------------|-----|----------|
| Purchase (buy side) | 1% of sale price | Buyer |
| Listing (sell side) | 1% of list price | Seller |
| Rental | 1 month's rent | Split/configurable |

---

## Document Templates

All documents are generated as PDFs with Florida-specific legal content:

- **FAR/BAR "AS IS" Residential Purchase Contract** — Full 11-section contract with inspection period, financing terms, closing costs allocation
- **Florida Residential Lease Agreement** — Including radon disclosure, lead paint (pre-1978), security deposit terms per F.S. 83.49
- **Seller's Property Disclosure** — Structural, mechanical, environmental (sinkhole, flood zone, mold, termites)

---

## Database Schema

12 tables with full relational integrity:

`users` · `properties` · `conversations` · `messages` · `transactions` · `showings` · `documents` · `signatures` · `offers` · `payments` · `scraped_listings` · `document_templates`

See `backend/src/db/schema.ts` for the complete Drizzle ORM schema.

---

## License

Private — All rights reserved.
