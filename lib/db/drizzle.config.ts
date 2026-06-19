import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "path";

// Load .env from artifacts/api-server directory
config({ path: path.join(__dirname, "../../artifacts/api-server/.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

console.log("[Drizzle Kit] DATABASE_URL loaded:", process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  },
  verbose: true,
});
