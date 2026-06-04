# schema-gpt

> Generate complete database schemas from plain English. Describe your app, get back PostgreSQL, Drizzle ORM, Prisma, and Zod — all at once.

```
$ schema-gpt "I'm building an Airbnb clone with hosts, guests, listings, bookings, and reviews"

  ◆ schema-gpt

  ✔ Tables: users, listings, rooms, bookings, reviews, amenities, listing_amenities
  Normalized schema for a property rental marketplace with user roles...

## SQL
CREATE TYPE user_role AS ENUM ('host', 'guest', 'admin');
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'guest',
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ... 6 more tables

## Drizzle ORM
import { pgTable, uuid, text, pgEnum, timestamp } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['host', 'guest', 'admin']);
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  ...
```

---

## Install

```bash
npm install -g schema-gpt
```

**Get your free NVIDIA API key:** [build.nvidia.com](https://build.nvidia.com)

## Usage

```bash
# Stream full schema output to terminal
schema-gpt "SaaS app with teams, projects, tasks, and billing"

# Write all files to a directory
schema-gpt "E-commerce store with products, orders, and reviews" --output ./schema

# Get only specific output
schema-gpt "Blog with posts and comments" --only sql
schema-gpt "Blog with posts and comments" --only drizzle > src/db/schema.ts
schema-gpt "Blog with posts and comments" --only prisma > prisma/schema.prisma
schema-gpt "Blog with posts and comments" --only zod > src/lib/validation.ts

# Non-interactive mode
schema-gpt "Twitter clone" --no-stream --output ./db
```

## Example Prompts

```
schema-gpt "Airbnb clone with hosts, guests, listings, bookings, and reviews"
schema-gpt "SaaS app with multi-tenant teams, projects, tasks, and Stripe billing"
schema-gpt "Twitter-like social network with tweets, follows, likes, and DMs"
schema-gpt "E-commerce store with products, variants, inventory, cart, and orders"
schema-gpt "Job board with companies, job postings, applications, and interviews"
schema-gpt "Discord-like chat app with servers, channels, messages, and roles"
schema-gpt "Learning management system with courses, lessons, students, and progress"
schema-gpt "Food delivery app with restaurants, menus, orders, drivers, and ratings"
```

## Output Files (with `--output`)

```
schema/
  schema.sql        — PostgreSQL CREATE TABLE statements with indexes and enums
  schema.ts         — Drizzle ORM TypeScript schema
  schema.prisma     — Prisma schema with datasource and generator
  validation.ts     — Zod validation schemas for create/update operations
  index.md          — Description and table list
```

## What Gets Generated

- ✅ `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` on every table
- ✅ `created_at` and `updated_at` timestamps
- ✅ Foreign keys with appropriate `ON DELETE` behavior
- ✅ Indexes on frequently-queried columns
- ✅ PostgreSQL enums for status fields
- ✅ Normalized to 3NF
- ✅ Drizzle: exports each table, uses `drizzle-orm/pg-core`
- ✅ Prisma: full schema with datasource and generator blocks
- ✅ Zod: separate `createSchema` and `updateSchema` for each table

## Powered By

- **`nvidia/nemotron-3-ultra-550b-a55b`** — 550B reasoning model (free on NVIDIA NIM)

## License

MIT

## Tips

- Be specific: "E-commerce store with product variants, inventory tracking, and abandoned cart" generates better schemas than "e-commerce store"
- Include roles: "admin, user, moderator" → enum columns get generated
- Mention scale: "high-traffic social network" → more indexes added
- Name your relations: "users can follow other users" → self-referential junction table

## Tips

- Be specific: "E-commerce store with product variants, inventory tracking, and abandoned cart" generates better schemas than "e-commerce store"
- Include roles: "admin, user, moderator" → enum columns get generated
- Mention scale: "high-traffic social network" → more indexes added
- Name your relations: "users can follow other users" → self-referential junction table
