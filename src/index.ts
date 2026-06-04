#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { generateSchema, streamSchema } from "./generator.js";

const VERSION = "1.0.0";
const HELP = `
schema-gpt v${VERSION} — Generate database schemas from plain English

Usage:
  schema-gpt "I'm building an Airbnb clone"
  schema-gpt "SaaS app with teams, projects, tasks, and billing"

Options:
  --api-key <key>    NVIDIA NIM API key (or NVIDIA_API_KEY env var)
  --output <dir>     Write files to directory (creates sql/drizzle/prisma/zod files)
  --only <type>      Output only: sql, drizzle, prisma, or zod
  --no-stream        Disable streaming output
  -v, --version      Print version
  -h, --help         Show help

Environment:
  NVIDIA_API_KEY     Free at https://build.nvidia.com

Examples:
  schema-gpt "Airbnb clone with rooms, bookings, and reviews"
  schema-gpt "SaaS with multi-tenant teams" --output ./schema
  schema-gpt "E-commerce store" --only sql
  schema-gpt "Blog platform" --only drizzle > src/db/schema.ts
`;

const R = "\x1b[0m", B = "\x1b[1m", DIM = "\x1b[2m";
const GR = "\x1b[32m", CY = "\x1b[36m", YE = "\x1b[33m", RE = "\x1b[31m", MA = "\x1b[35m", BL = "\x1b[34m";
const c = (col: string, t: string) => process.stderr.isTTY ? `${col}${t}${R}` : t;
const log = (m: string) => process.stderr.write(`  ${c(CY,"→")} ${m}\n`);
const ok  = (m: string) => process.stderr.write(`  ${c(GR,"✔")} ${m}\n`);
const err = (m: string) => process.stderr.write(`  ${c(RE,"✖")} ${m}\n`);

function parseArgs(argv: string[]) {
  const opts = { description: "", apiKey: process.env.NVIDIA_API_KEY ?? "", output: "", only: "", stream: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-h" || a === "--help") { process.stdout.write(HELP); process.exit(0); }
    if (a === "-v" || a === "--version") { process.stdout.write(`schema-gpt v${VERSION}\n`); process.exit(0); }
    if (a === "--no-stream") { opts.stream = false; continue; }
    if (a === "--api-key" && argv[i+1]) { opts.apiKey = argv[++i]!; continue; }
    if (a === "--output" && argv[i+1]) { opts.output = argv[++i]!; continue; }
    if (a === "--only" && argv[i+1]) { opts.only = argv[++i]!; continue; }
    if (!a.startsWith("--")) opts.description = a;
  }
  return opts;
}

const SECTION_HEADERS: Record<string, string> = {
  sql: "## SQL", drizzle: "## DRIZZLE", prisma: "## PRISMA", zod: "## ZOD",
};

const FILE_NAMES: Record<string, string> = {
  sql: "schema.sql", drizzle: "schema.ts", prisma: "schema.prisma", zod: "validation.ts",
};

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.description) { process.stdout.write(HELP); process.exit(0); }
  if (!opts.apiKey) {
    err("NVIDIA API key required"); process.stderr.write(`  Get free key: ${c(CY,"https://build.nvidia.com")}\n`); process.exit(1);
  }

  process.stderr.write(`\n  ${c(B, c(MA, "◆ schema-gpt"))}\n\n`);
  log(`Generating schema for: ${c(B, `"${opts.description}"`)}`);
  log("Model: nvidia/nemotron-3-ultra-550b-a55b\n");

  if (opts.only && opts.stream && !opts.output) {
    log(`Streaming ${opts.only.toUpperCase()} output...\n`);
    process.stderr.write(`\n`);
    let inSection = false;
    let buf = "";
    const header = SECTION_HEADERS[opts.only];
    for await (const token of streamSchema(opts.description, opts.apiKey)) {
      buf += token;
      if (!inSection && header && buf.includes(header)) {
        inSection = true;
        const afterHeader = buf.slice(buf.indexOf(header) + header.length);
        process.stdout.write(afterHeader);
      } else if (inSection) {
        if (buf.includes("## ") && buf.split("## ").length > 2) break;
        process.stdout.write(token);
      }
    }
    process.stderr.write("\n");
    ok("Done!");
    return;
  }

  if (!opts.output && opts.stream && !opts.only) {
    process.stderr.write(`  Streaming schema...\n\n`);
    for await (const token of streamSchema(opts.description, opts.apiKey)) {
      process.stdout.write(token);
    }
    process.stderr.write("\n\n");
    ok("Done!");
    return;
  }

  const schema = await generateSchema(opts.description, opts.apiKey);

  if (schema.tables.length > 0) ok(`Tables: ${c(B, schema.tables.join(", "))}`);
  if (schema.description) process.stderr.write(`  ${c(DIM, schema.description)}\n`);
  process.stderr.write("\n");

  if (opts.output) {
    fs.mkdirSync(opts.output, { recursive: true });
    const files: Record<string, string> = {
      "schema.sql": schema.sql,
      "schema.ts": schema.drizzle,
      "schema.prisma": schema.prisma,
      "validation.ts": schema.zod,
    };
    for (const [file, content] of Object.entries(files)) {
      if (!content) continue;
      const outPath = path.join(opts.output, file);
      fs.writeFileSync(outPath, content, "utf-8");
      ok(`Written: ${c(B, outPath)}`);
    }
    const indexPath = path.join(opts.output, "index.md");
    fs.writeFileSync(indexPath, `# Schema: ${opts.description}\n\nGenerated: ${new Date().toISOString()}\n\nTables: ${schema.tables.join(", ")}\n\n${schema.description}\n`);
    ok(`Written: ${c(B, indexPath)}`);
  } else if (opts.only) {
    const content = schema[opts.only as keyof typeof schema];
    if (typeof content === "string") process.stdout.write(content + "\n");
    else { err(`Unknown type: ${opts.only}. Use: sql, drizzle, prisma, zod`); process.exit(1); }
  } else {
    const out = [
      `## SQL\n\`\`\`sql\n${schema.sql}\n\`\`\``,
      `## Drizzle ORM\n\`\`\`typescript\n${schema.drizzle}\n\`\`\``,
      `## Prisma\n\`\`\`prisma\n${schema.prisma}\n\`\`\``,
      `## Zod Validation\n\`\`\`typescript\n${schema.zod}\n\`\`\``,
    ].join("\n\n");
    process.stdout.write(out + "\n");
  }

  ok("Done!");
}

main().catch(e => { err((e as Error).message); process.exit(1); });
// Future: --db mysql|sqlite|postgres (default: postgres)
// Future: --orm drizzle|prisma|typeorm|sequelize
// Future: --validate — run generated SQL against a test DB
