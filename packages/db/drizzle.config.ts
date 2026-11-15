import { defineConfig } from "drizzle-kit";

// Generating migrations reads only the schema file, so no database is needed for it.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  // PostGIS brings its own tables; leave them alone.
  extensionsFilters: ["postgis"],
});
