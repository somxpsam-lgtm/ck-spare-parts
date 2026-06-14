import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const companySettingsTable = pgTable("company_settings", {
  userId: text("user_id").primaryKey(),
  companyName: text("company_name").notNull().default("CK Group"),
  companyAddress: text("company_address").notNull().default(""),
  logoUrl: text("logo_url").notNull().default(""),
  gstNumber: text("gst_number").notNull().default(""),
  contactPhone: text("contact_phone").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CompanySettings = typeof companySettingsTable.$inferSelect;
