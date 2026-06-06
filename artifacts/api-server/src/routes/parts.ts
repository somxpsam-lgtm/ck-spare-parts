import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { partsTable, activityLogTable } from "@workspace/db";
import { eq, ilike, and, isNull, isNotNull, sql } from "drizzle-orm";
import { CreatePartBody, UpdatePartBody, ListPartsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const query = ListPartsQueryParams.parse(req.query);
    const conditions = [eq(partsTable.userId, userId)];
    if (query.includeDeleted !== true) conditions.push(isNull(partsTable.deletedAt));
    if (query.search) conditions.push(sql`(${ilike(partsTable.name, `%${query.search}%`)} OR ${ilike(partsTable.modelNumber, `%${query.search}%`)})`);
    if (query.category) conditions.push(eq(partsTable.category, query.category));
    if (query.condition) conditions.push(eq(partsTable.condition, query.condition));
    let rows = await db.select().from(partsTable).where(and(...conditions)).orderBy(partsTable.createdAt);
    if (query.stockStatus === "out") rows = rows.filter(p => p.quantity === 0);
    else if (query.stockStatus === "low") rows = rows.filter(p => p.quantity > 0 && p.quantity <= p.lowStockThreshold);
    else if (query.stockStatus === "ok") rows = rows.filter(p => p.quantity > p.lowStockThreshold);
    res.json(rows.map(p => ({ ...p, unitPrice: parseFloat(p.unitPrice as string), totalValue: parseFloat(p.unitPrice as string) * p.quantity, imageUrls: p.imageUrls ?? [], deletedAt: p.deletedAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const body = CreatePartBody.parse(req.body);
    const [part] = await db.insert(partsTable).values({ userId, name: body.name, modelNumber: body.modelNumber, location: body.location ?? null, category: body.category, condition: body.condition, quantity: body.quantity, unitPrice: String(body.unitPrice), lowStockThreshold: body.lowStockThreshold, imageUrls: body.imageUrls ?? [] }).returning();
    await db.insert(activityLogTable).values({ userId, type: "created", description: `Part "${part.name}" was added to inventory`, partName: part.name });
    res.status(201).json({ ...part, unitPrice: parseFloat(part.unitPrice as string), totalValue: parseFloat(part.unitPrice as string) * part.quantity, imageUrls: part.imageUrls ?? [], deletedAt: null, createdAt: part.createdAt.toISOString(), updatedAt: part.updatedAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/:id", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const id = parseInt(req.params.id);
    const [part] = await db.select().from(partsTable).where(and(eq(partsTable.id, id), eq(partsTable.userId, userId)));
    if (!part) { res.status(404).json({ error: "Part not found" }); return; }
    res.json({ ...part, unitPrice: parseFloat(part.unitPrice as string), totalValue: parseFloat(part.unitPrice as string) * part.quantity, imageUrls: part.imageUrls ?? [], deletedAt: part.deletedAt?.toISOString() ?? null, createdAt: part.createdAt.toISOString(), updatedAt: part.updatedAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const id = parseInt(req.params.id);
    const body = UpdatePartBody.parse(req.body);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.modelNumber !== undefined) updateData.modelNumber = body.modelNumber;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.condition !== undefined) updateData.condition = body.condition;
    if (body.quantity !== undefined) updateData.quantity = body.quantity;
    if (body.unitPrice !== undefined) updateData.unitPrice = String(body.unitPrice);
    if (body.lowStockThreshold !== undefined) updateData.lowStockThreshold = body.lowStockThreshold;
    if (body.imageUrls !== undefined) updateData.imageUrls = body.imageUrls;
    const [part] = await db.update(partsTable).set(updateData).where(and(eq(partsTable.id, id), eq(partsTable.userId, userId))).returning();
    if (!part) { res.status(404).json({ error: "Part not found" }); return; }
    await db.insert(activityLogTable).values({ userId, type: "updated", description: `Part "${part.name}" was updated`, partName: part.name });
    res.json({ ...part, unitPrice: parseFloat(part.unitPrice as string), totalValue: parseFloat(part.unitPrice as string) * part.quantity, imageUrls: part.imageUrls ?? [], deletedAt: part.deletedAt?.toISOString() ?? null, createdAt: part.createdAt.toISOString(), updatedAt: part.updatedAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const id = parseInt(req.params.id);
    const [part] = await db.update(partsTable).set({ deletedAt: new Date(), updatedAt: new Date() }).where(and(eq(partsTable.id, id), eq(partsTable.userId, userId), isNull(partsTable.deletedAt))).returning();
    if (!part) { res.status(404).json({ error: "Part not found" }); return; }
    await db.insert(activityLogTable).values({ userId, type: "deleted", description: `Part "${part.name}" was removed from inventory`, partName: part.name });
    res.status(204).send();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/:id/restore", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const id = parseInt(req.params.id);
    const [part] = await db.update(partsTable).set({ deletedAt: null, updatedAt: new Date() }).where(and(eq(partsTable.id, id), eq(partsTable.userId, userId), isNotNull(partsTable.deletedAt))).returning();
    if (!part) { res.status(404).json({ error: "Part not found or not deleted" }); return; }
    await db.insert(activityLogTable).values({ userId, type: "updated", description: `Part "${part.name}" was restored`, partName: part.name });
    res.json({ ...part, unitPrice: parseFloat(part.unitPrice as string), totalValue: parseFloat(part.unitPrice as string) * part.quantity, imageUrls: part.imageUrls ?? [], deletedAt: null, createdAt: part.createdAt.toISOString(), updatedAt: part.updatedAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
