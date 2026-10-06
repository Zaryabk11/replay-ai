import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Direct (non-pooled) Neon URL: used by the CLI for migrations.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
