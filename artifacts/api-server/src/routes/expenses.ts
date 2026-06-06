import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { expenseRecordsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateExpenseBody, UpdateExpenseBody, ListExpensesQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const query = ListExpensesQueryParams.parse(req.query);
    const conditions = [eq(expenseRecordsTable.userId, userId)];
    if (query.year) conditions.push(eq(expenseRecordsTable.year, query.year));
    if (query.month) conditions.push(eq(expenseRecordsTable.month, query.month));
    if (query.category) conditions.push(eq(expenseRecordsTable.category, query.category));
    const records = await db.select().from(expenseRecordsTable).where(and(...conditions)).orderBy(expenseRecordsTable.date);
    res.json(records.map(r => ({ ...r, unitPrice: parseFloat(r.unitPrice as string), totalCost: parseFloat(r.totalCost as string), createdAt: r.createdAt.toISOString() })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const body = CreateExpenseBody.parse(req.body);
    const [record] = await db.insert(expenseRecordsTable).values({ userId, date: body.date, partName: body.partName ?? null, category: body.category, quantity: body.quantity, unitPrice: String(body.unitPrice), totalCost: String(body.totalCost), supplierName: body.supplierName ?? null, notes: body.notes ?? null, month: body.month, year: body.year }).returning();
    res.status(201).json({ ...record, unitPrice: parseFloat(record.unitPrice as string), totalCost: parseFloat(record.totalCost as string), createdAt: record.createdAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/:id", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const id = parseInt(req.params.id);
    const body = UpdateExpenseBody.parse(req.body);
    const updateData: Record<string, unknown> = {};
    if (body.date !== undefined) updateData.date = body.date;
    if (body.partName !== undefined) updateData.partName = body.partName;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.quantity !== undefined) updateData.quantity = body.quantity;
    if (body.unitPrice !== undefined) updateData.unitPrice = String(body.unitPrice);
    if (body.totalCost !== undefined) updateData.totalCost = String(body.totalCost);
    if (body.supplierName !== undefined) updateData.supplierName = body.supplierName;
    if (body.notes !== undefined) updateData.notes = body.notes;
    const rb = req.body as Record<string, unknown>;
    if (rb.month !== undefined) updateData.month = rb.month;
    if (rb.year !== undefined) updateData.year = rb.year;
    const [record] = await db.update(expenseRecordsTable).set(updateData).where(and(eq(expenseRecordsTable.id, id), eq(expenseRecordsTable.userId, userId))).returning();
    if (!record) { res.status(404).json({ error: "Expense not found" }); return; }
    res.json({ ...record, unitPrice: parseFloat(record.unitPrice as string), totalCost: parseFloat(record.totalCost as string), createdAt: record.createdAt.toISOString() });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const id = parseInt(req.params.id);
    await db.delete(expenseRecordsTable).where(and(eq(expenseRecordsTable.id, id), eq(expenseRecordsTable.userId, userId)));
    res.status(204).send();
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
