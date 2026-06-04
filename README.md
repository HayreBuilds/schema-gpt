# 🏗️ schema-gpt

[![Build Status](https://img.shields.io/github/actions/workflow/status/HayreBuilds/schema-gpt/ci.yml?branch=main)](https://github.com/HayreBuilds/schema-gpt/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA-NIM-76B900?logo=nvidia&logoColor=white)](https://build.nvidia.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/HayreBuilds/schema-gpt/pulls)

**Generate full database schemas from plain English. SQL, Drizzle, Prisma, and Zod—all in seconds.**

> Starting a new project? Skip the manual schema design. **schema-gpt** turns your application description into a production-ready, normalized database architecture.

---

## 🚀 Quick Start

```bash
# Generate a schema for a SaaS app
npx schema-gpt "SaaS app with multi-tenant teams, projects, tasks, and Stripe billing"
```

---

## ✨ Key Features

- **📄 Multi-Target Output**: Generates SQL (PostgreSQL/MySQL), Drizzle ORM, Prisma, and Zod schemas.
- **🧠 Intelligent Normalization**: Automatically handles primary keys, foreign keys, and 3NF normalization.
- **⚡ Zero Setup**: No local database needed. Uses high-performance NVIDIA NIM models.
- **📂 Full Project Scaffold**: Generates a clean directory structure with all necessary files.
- **🎨 Context-Aware**: Understands complex relationships like "users can follow other users" or "multi-tenant teams."

---

## 💻 Installation

```bash
npm install -g schema-gpt
```

---

## 🛠️ Usage Examples

### Airbnb Clone
```bash
schema-gpt "Airbnb clone with hosts, guests, listings, bookings, and reviews" --output ./schema
```

### E-commerce Store
```bash
schema-gpt "E-commerce store with products, variants, inventory, cart, and orders"
```

### Social Network
```bash
schema-gpt "Twitter-like social network with tweets, follows, likes, and DMs"
```

---

## 📂 Output Structure

When using the `--output` flag, **schema-gpt** generates:

```text
schema/
  ├── schema.sql        # PostgreSQL CREATE TABLE statements
  ├── schema.ts         # Drizzle ORM TypeScript models
  ├── schema.prisma     # Prisma schema file
  ├── validation.ts     # Zod validation schemas
  └── README.md         # Documentation of the generated schema
```

---

## 🔍 How it Works

1. **Prompt Engineering**: Your description is wrapped in a specialized database architecture prompt.
2. **AI Reasoning**: `nvidia/nemotron-4-340b-instruct` designs the normalized schema.
3. **Parser Engine**: Extracts the SQL, TypeScript, and Prisma code from the AI response.
4. **File Generation**: Writes the formatted code to your local machine.

---

## 🤝 Contributing

We love contributions! Check out our [Contributing Guide](CONTRIBUTING.md) for tips on improving the generation prompts.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 💖 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=HayreBuilds/schema-gpt&type=Date)](https://star-history.com/#HayreBuilds/schema-gpt&Date)
