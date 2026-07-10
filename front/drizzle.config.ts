import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// The project's env file lives in scripts/.env.local (not front/.env)
config({ path: './scripts/.env.local' });

export default defineConfig({
  out: './drizzle',
  schema: './db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

