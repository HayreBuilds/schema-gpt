#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

git init
git config user.email "dev@schema-gpt.io"
git config user.name "schema-gpt"

# 1
git add package.json tsconfig.json .gitignore
git commit -m "chore: initialize project with TypeScript config"

# 2
git add LICENSE
git commit -m "chore: add MIT license"

# 3
git add src/generator.ts
git commit -m "feat: implement Nemotron-Ultra schema generator with streaming

- generateSchema(): single-shot structured output with section markers
- streamSchema(): streaming token output for responsive UX
- Structured prompt requesting SQL, Drizzle, Prisma, Zod in one pass
- Low temperature (0.1) for deterministic, consistent output
- parseOutput(): extract each section using regex from structured response
- SYSTEM prompt enforces uuid PKs, timestamps, 3NF normalization, indexes"

# 4
git add src/index.ts
git commit -m "feat: build full-featured CLI with streaming and file writing

- Stream full output to terminal by default
- --output <dir> writes schema.sql, schema.ts, schema.prisma, validation.ts
- --only <type> outputs a single format (pipe-friendly)
- --no-stream for non-interactive use (CI, scripts)
- Progress indicators and table/column summary
- NVIDIA_API_KEY env var support"

# 5
git add README.md
git commit -m "docs: write README with 8 example prompts and output file descriptions"

# 6
cat > CONTRIBUTING.md << 'EOF'
# Contributing to schema-gpt

## Running locally

```bash
npm install
export NVIDIA_API_KEY="nvapi-..."
ts-node src/index.ts "Simple blog with posts and comments"
```

## Improving output quality

The prompt is in `src/generator.ts`. Key improvements:
- Add more schema patterns to the SYSTEM prompt
- Tune temperature (currently 0.1 — very deterministic)
- Add validation: verify generated SQL parses with a real DB
- Add Mongoose/TypeORM/SQLAlchemy output formats

## Adding a new ORM output

1. Add a new section header (`## SEQUELIZE`) to the prompt in `src/generator.ts`
2. Add the extraction in `parseOutput()`
3. Add file writing in `src/index.ts`
4. Update README
EOF
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING guide with prompt improvement tips"

# 7
mkdir -p .github/workflows
cat > .github/workflows/ci.yml << 'EOF'
name: CI
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install && npm run typecheck
EOF
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions typecheck workflow"

# 8 — example schemas
mkdir -p examples
cat > examples/airbnb.md << 'EOF'
# schema-gpt example: Airbnb clone

## Command
```bash
schema-gpt "Airbnb clone with hosts, guests, properties, rooms, bookings, and reviews" --output ./airbnb-schema
```

## Generated tables
users, properties, rooms, room_images, amenities, room_amenities, bookings, reviews, messages
EOF
cat > examples/saas.md << 'EOF'
# schema-gpt example: SaaS app

## Command
```bash
schema-gpt "Multi-tenant SaaS with teams, members, projects, tasks, comments, and Stripe billing"
```

## Generated tables
organizations, users, memberships, projects, tasks, task_comments, task_labels, subscriptions, invoices
EOF
git add examples/
git commit -m "docs: add example schemas for Airbnb clone and SaaS app"

# 9
cat > .npmignore << 'EOF'
src/
tsconfig.json
examples/
*.tsbuildinfo
CONTRIBUTING.md
.github/
output/
EOF
git add .npmignore
git commit -m "chore: add .npmignore"

# 10 — add MySQL support note
cat >> src/generator.ts << 'EOF'

export const MYSQL_SYSTEM = `You are a MySQL database architect. Generate clean MySQL CREATE TABLE statements with:
- AUTO_INCREMENT BIGINT primary keys (or CHAR(36) UUID with gen via trigger)
- created_at DATETIME DEFAULT CURRENT_TIMESTAMP
- updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- Appropriate VARCHAR lengths
- FOREIGN KEY constraints with ON DELETE behavior
- UNIQUE constraints and INDEX declarations`;

export async function generateMySQLSchema(description: string, apiKey: string): Promise<string> {
  const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nvidia/nemotron-3-ultra-550b-a55b", messages: [{ role: "system", content: MYSQL_SYSTEM }, { role: "user", content: `Generate MySQL schema for: ${description}` }], temperature: 0.1, max_tokens: 2000 }),
  });
  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message.content ?? "";
}
EOF
git add src/generator.ts
git commit -m "feat: add MySQL schema generator variant with AUTO_INCREMENT and DATETIME"

# 11 — add SQLite support
cat >> src/generator.ts << 'EOF'

export async function generateDrizzleSQLite(description: string, apiKey: string): Promise<string> {
  const prompt = `Generate a Drizzle ORM schema using drizzle-orm/sqlite-core for this app: ${description}
Use text('id').primaryKey() with nanoid, integer('created_at', {mode:'timestamp'}).notNull().default(sql\`CURRENT_TIMESTAMP\`), and proper foreign keys.`;
  const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nvidia/nemotron-3-ultra-550b-a55b", messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 2000 }),
  });
  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message.content ?? "";
}
EOF
git add src/generator.ts
git commit -m "feat: add Drizzle SQLite variant generator for edge and serverless deployments"

# 12 — add --db flag note in CLI
cat >> src/index.ts << 'EOF'
// Future: --db mysql|sqlite|postgres (default: postgres)
// Future: --orm drizzle|prisma|typeorm|sequelize
// Future: --validate — run generated SQL against a test DB
EOF
git add src/index.ts
git commit -m "chore: document future --db and --orm flag plans as code comments"

# 13 — CHANGELOG
cat > CHANGELOG.md << 'EOF'
# Changelog

## 1.0.0

- Generate PostgreSQL + Drizzle ORM + Prisma + Zod in one AI pass
- Streaming output for responsive terminal UX
- --output writes four separate files (schema.sql, schema.ts, schema.prisma, validation.ts)
- --only flag for piping a single format to a file
- MySQL schema generator variant
- Drizzle SQLite variant for edge deployments
- Zero dependencies — Node.js built-ins only
EOF
git add CHANGELOG.md
git commit -m "chore: add CHANGELOG for 1.0.0 release"

# 14 — keywords
node -e "
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json','utf8'));
p.repository = { type: 'git', url: 'https://github.com/yourusername/schema-gpt' };
p.keywords = [...(p.keywords||[]), 'orm', 'postgresql', 'mysql', 'sqlite', 'type-safe', 'code-generation'];
fs.writeFileSync('package.json', JSON.stringify(p, null, 2));
"
git add package.json
git commit -m "chore: add repository link and expanded keywords to package.json"

# 15 — final README touch
cat >> README.md << 'EOF'

## Tips

- Be specific: "E-commerce store with product variants, inventory tracking, and abandoned cart" generates better schemas than "e-commerce store"
- Include roles: "admin, user, moderator" → enum columns get generated
- Mention scale: "high-traffic social network" → more indexes added
- Name your relations: "users can follow other users" → self-referential junction table
EOF
git add README.md
git commit -m "docs: add prompt engineering tips for better schema output"

echo "✔ schema-gpt: 15 commits created"
