# Security Rules

## Secrets
- NEVER read `.env`, `.env.local`, or `.env.*.local` files
- NEVER hardcode API keys, passwords, tokens, or secrets in source code
- Use environment variables for all sensitive configuration

## Database
- This project uses Prisma with SQLite (`prisma/dev.db`)
- NEVER run destructive database commands (DROP, TRUNCATE, DELETE without WHERE)
- Always use Prisma migrations for schema changes

## Before committing
- Verify no secrets are included in staged files
- Run `npx prisma validate` to check schema consistency

## Development process
- For complex changes, present a plan before implementing
- Write tests before implementing new features when possible
