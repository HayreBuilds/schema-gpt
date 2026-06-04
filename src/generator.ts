const NIM_BASE = "https://integrate.api.nvidia.com/v1";
const MODEL = "nvidia/nemotron-3-ultra-550b-a55b";

export interface SchemaOutput {
  description: string;
  sql: string;
  drizzle: string;
  prisma: string;
  zod: string;
  tables: string[];
}

const SYSTEM = `You are a senior database architect. When given an app description, you generate:
1. A clean, normalized PostgreSQL schema (SQL CREATE TABLE statements)
2. Drizzle ORM schema (TypeScript)
3. Prisma schema
4. Zod validation schemas (TypeScript)

Rules:
- Always include id (uuid primary key), created_at, updated_at
- Use proper foreign keys with ON DELETE behavior
- Add useful indexes
- Include enums where appropriate
- Follow 3NF normalization
- Drizzle: use drizzle-orm/pg-core, export each table
- Prisma: include datasource, generator, and all models
- Zod: use z.object() for create/update schemas, export them
- Be realistic and production-ready`;

export async function generateSchema(description: string, apiKey: string): Promise<SchemaOutput> {
  const prompt = `App description: "${description}"

Generate all four outputs in this EXACT format with these EXACT section headers:

## DESCRIPTION
Brief description of the data model (2-3 sentences).

## SQL
\`\`\`sql
-- PostgreSQL schema
\`\`\`

## DRIZZLE
\`\`\`typescript
// Drizzle ORM schema (drizzle-orm/pg-core)
\`\`\`

## PRISMA
\`\`\`prisma
// Prisma schema
\`\`\`

## ZOD
\`\`\`typescript
// Zod validation schemas
\`\`\`

## TABLES
Comma-separated list of table names.

Output all five sections. Be thorough and production-ready.`;

  const resp = await fetch(`${NIM_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`NIM API ${resp.status}: ${body}`);
  }

  const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0]?.message.content ?? "";

  return parseOutput(content);
}

export async function* streamSchema(description: string, apiKey: string): AsyncGenerator<string> {
  const prompt = `App: "${description}"\n\nGenerate: SQL schema, Drizzle ORM TypeScript, Prisma schema, Zod validation schemas. Include description and table list. Be thorough and production-ready.`;

  const resp = await fetch(`${NIM_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }],
      temperature: 0.1, max_tokens: 4000, stream: true,
    }),
  });

  if (!resp.ok || !resp.body) throw new Error(`API error ${resp.status}`);
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t || t === "data: [DONE]") continue;
      if (t.startsWith("data: ")) {
        try {
          const chunk = JSON.parse(t.slice(6)) as { choices: Array<{ delta: { content?: string } }> };
          const c = chunk.choices[0]?.delta?.content;
          if (c) yield c;
        } catch {}
      }
    }
  }
}

function extractBlock(content: string, header: string): string {
  const pattern = new RegExp(`## ${header}\\s*\`\`\`(?:sql|typescript|prisma)?\\s*([\\s\\S]*?)\`\`\``, "i");
  const match = content.match(pattern);
  if (match) return match[1]?.trim() ?? "";
  const simple = new RegExp(`## ${header}\\s*([\\s\\S]*?)(?=##|$)`, "i");
  const m2 = content.match(simple);
  return m2?.[1]?.trim().replace(/```\w*\n?/g, "").replace(/```/g, "") ?? "";
}

function parseOutput(content: string): SchemaOutput {
  const descMatch = content.match(/## DESCRIPTION\s*([\s\S]*?)(?=## SQL|$)/i);
  const tablesMatch = content.match(/## TABLES\s*([\s\S]*?)$/i);

  return {
    description: descMatch?.[1]?.trim() ?? "",
    sql: extractBlock(content, "SQL"),
    drizzle: extractBlock(content, "DRIZZLE"),
    prisma: extractBlock(content, "PRISMA"),
    zod: extractBlock(content, "ZOD"),
    tables: tablesMatch?.[1]?.trim().split(",").map(t => t.trim()).filter(Boolean) ?? [],
  };
}

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
