import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true, createdAt: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;

export const partsTable = pgTable("parts", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  modelNumber: text("model_number").notNull(),
  location: text("location"),
  category: text("category").notNull(),
  condition: text("condition").notNull().default("new"),
  quantity: integer("quantity").notNull().default(0),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  imageUrls: text("image_urls").array().notNull().default([]),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPartSchema = createInsertSchema(partsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type InsertPart = z.infer<typeof insertPartSchema>;
export type Part = typeof partsTable.$inferSelect;

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  partId: integer("part_id").notNull(),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  date: text("date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStockMovementSchema = createInsertSchema(stockMovementsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type StockMovement = typeof stockMovementsTable.$inferSelect;

export const expenseRecordsTable = pgTable("expense_records", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  date: text("date").notNull(),
  partName: text("part_name"),
  category: text("category").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  supplierName: text("supplier_name"),
  notes: text("notes"),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExpenseSchema = createInsertSchema(expenseRecordsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type ExpenseRecord = typeof expenseRecordsTable.$inferSelect;

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  type: text("type").notNull(),
  description: text("description").notNull(),
  partName: text("part_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogTable.$inferSelect;
