import { Router } from "express";
import { db } from "@workspace/db";
import {
  partsTable,
  categoriesTable,
  stockMovementsTable,
  activityLogTable,
} from "@workspace/db";
import { eq, ilike, and, isNull, isNotNull, lte, sql } from "drizzle-orm";
import {
  CreatePartBody,
  UpdatePartBody,
  ListPartsQueryParams,
} from "@workspace/api-zod";

const router = Router();

// GET /parts
router.get("/", async (req, res) => {
  try {
    const query = ListPartsQueryParams.parse(req.query);
    const conditions = [];

    if (query.includeDeleted !== true) {
      conditions.push(isNull(partsTable.deletedAt));
    }

    if (query.search) {
      conditions.push(
        sql`(${ilike(partsTable.name, `%${query.search}%`)} OR ${ilike(partsTable.modelNumber, `%${query.search}%`)})`
      );
    }

    if (query.category) {
      conditions.push(eq(partsTable.category, query.category));
    }

    if (query.condition) {
      conditions.push(eq(partsTable.condition, query.condition));
    }

    let rows = await db
      .select()
      .from(partsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(partsTable.createdAt);

    // Apply stock status filter after fetch
    if (query.stockStatus) {
      if (query.stockStatus === "out") {
        rows = rows.filter((p) => p.quantity === 0);
      } else if (query.stockStatus === "low") {
        rows = rows.filter((p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold);
      } else if (query.stockStatus === "ok") {
        rows = rows.filter((p) => p.quantity > p.lowStockThreshold);
      }
    }

    const parts = rows.map((p) => ({
      ...p,
      unitPrice: parseFloat(p.unitPrice as string),
      totalValue: parseFloat(p.unitPrice as string) * p.quantity,
      imageUrls: p.imageUrls ?? [],
      deletedAt: p.deletedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    res.json(parts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /parts
router.post("/", async (req, res) => {
  try {
    const body = CreatePartBody.parse(req.body);

    const [part] = await db
      .insert(partsTable)
      .values({
        name: body.name,
        modelNumber: body.modelNumber,
        location: body.location ?? null,
        category: body.category,
        condition: body.condition,
        quantity: body.quantity,
        unitPrice: String(body.unitPrice),
        lowStockThreshold: body.lowStockThreshold,
        imageUrls: body.imageUrls ?? [],
      })
      .returning();

    // Log activity
    await db.insert(activityLogTable).values({
      type: "created",
      description: `Part "${part.name}" was added to inventory`,
      partName: part.name,
    });

    res.status(201).json({
      ...part,
      unitPrice: parseFloat(part.unitPrice as string),
      totalValue: parseFloat(part.unitPrice as string) * part.quantity,
      imageUrls: part.imageUrls ?? [],
      deletedAt: null,
      createdAt: part.createdAt.toISOString(),
      updatedAt: part.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /parts/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [part] = await db.select().from(partsTable).where(eq(partsTable.id, id));

    if (!part) return res.status(404).json({ error: "Part not found" });

    res.json({
      ...part,
      unitPrice: parseFloat(part.unitPrice as string),
      totalValue: parseFloat(part.unitPrice as string) * part.quantity,
      imageUrls: part.imageUrls ?? [],
      deletedAt: part.deletedAt?.toISOString() ?? null,
      createdAt: part.createdAt.toISOString(),
      updatedAt: part.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /parts/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdatePartBody.parse(req.body);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.modelNumber !== undefined) updateData.modelNumber = body.modelNumber;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.condition !== undefined) updateData.condition = body.condition;
    if (body.quantity !== undefined) updateData.quantity = body.quantity;
    if (body.unitPrice !== undefined) updateData.unitPrice = String(body.unitPrice);
    if (body.lowStockThreshold !== undefined) updateData.lowStockThreshold = body.lowStockThreshold;
    if (body.imageUrls !== undefined) updateData.imageUrls = body.imageUrls;

    const [part] = await db
      .update(partsTable)
      .set(updateData)
      .where(eq(partsTable.id, id))
      .returning();

    if (!part) return res.status(404).json({ error: "Part not found" });

    await db.insert(activityLogTable).values({
      type: "updated",
      description: `Part "${part.name}" was updated`,
      partName: part.name,
    });

    res.json({
      ...part,
      unitPrice: parseFloat(part.unitPrice as string),
      totalValue: parseFloat(part.unitPrice as string) * part.quantity,
      imageUrls: part.imageUrls ?? [],
      deletedAt: part.deletedAt?.toISOString() ?? null,
      createdAt: part.createdAt.toISOString(),
      updatedAt: part.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /parts/:id (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const [part] = await db
      .update(partsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(partsTable.id, id), isNull(partsTable.deletedAt)))
      .returning();

    if (!part) return res.status(404).json({ error: "Part not found" });

    await db.insert(activityLogTable).values({
      type: "deleted",
      description: `Part "${part.name}" was removed from inventory`,
      partName: part.name,
    });

    res.json({
      ...part,
      unitPrice: parseFloat(part.unitPrice as string),
      totalValue: parseFloat(part.unitPrice as string) * part.quantity,
      imageUrls: part.imageUrls ?? [],
      deletedAt: part.deletedAt?.toISOString() ?? null,
      createdAt: part.createdAt.toISOString(),
      updatedAt: part.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /parts/:id/restore
router.post("/:id/restore", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const [part] = await db
      .update(partsTable)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(and(eq(partsTable.id, id), isNotNull(partsTable.deletedAt)))
      .returning();

    if (!part) return res.status(404).json({ error: "Part not found or not deleted" });

    await db.insert(activityLogTable).values({
      type: "updated",
      description: `Part "${part.name}" was restored`,
      partName: part.name,
    });

    res.json({
      ...part,
      unitPrice: parseFloat(part.unitPrice as string),
      totalValue: parseFloat(part.unitPrice as string) * part.quantity,
      imageUrls: part.imageUrls ?? [],
      deletedAt: null,
      createdAt: part.createdAt.toISOString(),
      updatedAt: part.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
