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
