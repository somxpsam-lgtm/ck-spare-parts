import { Router } from "express";
import { db } from "@workspace/db";
import { stockMovementsTable, partsTable, activityLogTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { CreateStockMovementBody, ListStockMovementsQueryParams } from "@workspace/api-zod";

const router = Router();

// GET /stock-movements
router.get("/", async (req, res) => {
  try {
    const query = ListStockMovementsQueryParams.parse(req.query);
    const conditions = [];

    if (query.partId) {
      conditions.push(eq(stockMovementsTable.partId, query.partId));
    }

    const limit = query.limit ?? 50;

    const movements = await db
      .select({
        id: stockMovementsTable.id,
        partId: stockMovementsTable.partId,
        partName: partsTable.name,
        type: stockMovementsTable.type,
        quantity: stockMovementsTable.quantity,
        notes: stockMovementsTable.notes,
        createdAt: stockMovementsTable.createdAt,
      })
      .from(stockMovementsTable)
      .leftJoin(partsTable, eq(stockMovementsTable.partId, partsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(stockMovementsTable.createdAt))
      .limit(limit);

    res.json(
      movements.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /stock-movements
router.post("/", async (req, res) => {
  try {
    const body = CreateStockMovementBody.parse(req.body);

    // Get the part first
    const [part] = await db
      .select()
      .from(partsTable)
      .where(eq(partsTable.id, body.partId));

    if (!part) return res.status(404).json({ error: "Part not found" });

    // Update part quantity
    let newQty = part.quantity;
    if (body.type === "in") newQty += body.quantity;
    else if (body.type === "out") newQty = Math.max(0, newQty - body.quantity);
    else newQty = body.quantity; // adjustment sets absolute quantity

    await db
      .update(partsTable)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(partsTable.id, body.partId));

    const [movement] = await db
      .insert(stockMovementsTable)
      .values({
        partId: body.partId,
        type: body.type,
        quantity: body.quantity,
        notes: body.notes ?? null,
      })
      .returning();

    // Log activity
    const actType = body.type === "in" ? "stock_in" : "stock_out";
    await db.insert(activityLogTable).values({
      type: actType,
      description: `Stock ${body.type === "in" ? "added to" : body.type === "out" ? "removed from" : "adjusted for"} "${part.name}": ${body.quantity} units`,
      partName: part.name,
    });

    res.status(201).json({
      ...movement,
      partName: part.name,
      createdAt: movement.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
