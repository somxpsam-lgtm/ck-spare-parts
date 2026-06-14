import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { stockMovementsTable, partsTable, activityLogTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { CreateStockMovementBody, ListStockMovementsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const query = ListStockMovementsQueryParams.parse(req.query);
    const conditions = [eq(stockMovementsTable.userId, userId)];
    if (query.partId) conditions.push(eq(stockMovementsTable.partId, query.partId));
    const limit = query.limit ?? 500;
    const movements = await db
      .select({
        id: stockMovementsTable.id,
        partId: stockMovementsTable.partId,
        partName: partsTable.name,
        partUnit: partsTable.unit,
        type: stockMovementsTable.type,
        quantity: stockMovementsTable.quantity,
        notes: stockMovementsTable.notes,
        whereUsed: stockMovementsTable.whereUsed,
        date: stockMovementsTable.date,
        createdAt: stockMovementsTable.createdAt,
      })
      .from(stockMovementsTable)
      .leftJoin(partsTable, eq(stockMovementsTable.partId, partsTable.id))
      .where(and(...conditions))
      .orderBy(desc(stockMovementsTable.createdAt))
      .limit(limit);
    res.json(movements.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const body = CreateStockMovementBody.parse(req.body);
    const [part] = await db.select().from(partsTable).where(and(eq(partsTable.id, body.partId), eq(partsTable.userId, userId)));
    if (!part) { res.status(404).json({ error: "Part not found" }); return; }

    let newQty = part.quantity;
    if (body.type === "in") newQty += body.quantity;
    else if (body.type === "out") newQty = Math.max(0, newQty - body.quantity);
    else newQty = body.quantity;

    await db.update(partsTable).set({ quantity: newQty, updatedAt: new Date() }).where(eq(partsTable.id, body.partId));

    const rb = req.body as Record<string, unknown>;
    const [movement] = await db.insert(stockMovementsTable).values({
      userId,
      partId: body.partId,
      type: body.type,
      quantity: body.quantity,
      notes: body.notes ?? null,
      whereUsed: (rb.whereUsed as string | undefined) ?? null,
      date: (rb.date as string | undefined) ?? null,
    }).returning();

    const actType = body.type === "in" ? "stock_in" : "stock_out";
    await db.insert(activityLogTable).values({
      userId,
      type: actType,
      description: `Stock ${body.type === "in" ? "added to" : body.type === "out" ? "removed from" : "adjusted for"} "${part.name}": ${body.quantity} ${part.unit}`,
      partName: part.name,
    });

    res.status(201).json({ ...movement, partName: part.name, partUnit: part.unit, createdAt: movement.createdAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const id = parseInt(req.params.id);
    const body = req.body as { type?: "in" | "out" | "adjustment"; quantity?: number; notes?: string; whereUsed?: string; date?: string };

    const [existing] = await db.select().from(stockMovementsTable).where(and(eq(stockMovementsTable.id, id), eq(stockMovementsTable.userId, userId)));
    if (!existing) { res.status(404).json({ error: "Movement not found" }); return; }

    const [part] = await db.select().from(partsTable).where(eq(partsTable.id, existing.partId));
    if (part) {
      let revertedQty = part.quantity;
      if (existing.type === "in") revertedQty -= existing.quantity;
      else if (existing.type === "out") revertedQty += existing.quantity;

      const newType = body.type ?? existing.type;
      const newQty = body.quantity ?? existing.quantity;
      let finalQty = revertedQty;
      if (newType === "in") finalQty += newQty;
      else if (newType === "out") finalQty = Math.max(0, finalQty - newQty);
      else finalQty = newQty;

      await db.update(partsTable).set({ quantity: Math.max(0, finalQty), updatedAt: new Date() }).where(eq(partsTable.id, existing.partId));
    }

    const updateData: Record<string, unknown> = {};
    if (body.type !== undefined) updateData.type = body.type;
    if (body.quantity !== undefined) updateData.quantity = body.quantity;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.whereUsed !== undefined) updateData.whereUsed = body.whereUsed;
    if (body.date !== undefined) updateData.date = body.date;

    const [updated] = await db.update(stockMovementsTable).set(updateData).where(eq(stockMovementsTable.id, id)).returning();
    res.json({ ...updated, partName: part?.name ?? null, partUnit: part?.unit ?? null, createdAt: updated.createdAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const id = parseInt(req.params.id);

    const [existing] = await db.select().from(stockMovementsTable).where(and(eq(stockMovementsTable.id, id), eq(stockMovementsTable.userId, userId)));
    if (!existing) { res.status(404).json({ error: "Movement not found" }); return; }

    const [part] = await db.select().from(partsTable).where(eq(partsTable.id, existing.partId));
    if (part) {
      let revertedQty = part.quantity;
      if (existing.type === "in") revertedQty = Math.max(0, revertedQty - existing.quantity);
      else if (existing.type === "out") revertedQty += existing.quantity;
      await db.update(partsTable).set({ quantity: revertedQty, updatedAt: new Date() }).where(eq(partsTable.id, existing.partId));
    }

    await db.delete(stockMovementsTable).where(eq(stockMovementsTable.id, id));
    res.status(204).send();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
