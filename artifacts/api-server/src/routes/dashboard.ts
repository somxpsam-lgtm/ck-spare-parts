import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { partsTable, expenseRecordsTable, activityLogTable } from "@workspace/db";
import { isNull, sum, eq, and, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/summary", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const parts = await db.select().from(partsTable).where(and(eq(partsTable.userId, userId), isNull(partsTable.deletedAt)));
    let totalValue = 0, lowStockCount = 0, outOfStockCount = 0;
    const categorySet = new Set<string>();
    for (const p of parts) {
      const price = parseFloat(p.unitPrice as string);
      totalValue += price * p.quantity;
      categorySet.add(p.category);
      if (p.quantity === 0) outOfStockCount++;
      else if (p.quantity <= p.lowStockThreshold) lowStockCount++;
    }
    const [expenseResult] = await db
      .select({ total: sum(expenseRecordsTable.totalCost) })
      .from(expenseRecordsTable)
      .where(and(eq(expenseRecordsTable.userId, userId), sql`${expenseRecordsTable.month} = ${currentMonth} AND ${expenseRecordsTable.year} = ${currentYear}`));
    const monthlyExpense = parseFloat(expenseResult?.total ?? "0");
    const monthlyPurchase = parts
      .filter(p => { const d = new Date(p.createdAt); return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear; })
      .reduce((acc, p) => acc + parseFloat(p.unitPrice as string) * p.quantity, 0);
    res.json({ totalParts: parts.length, totalValue, totalCategories: categorySet.size, lowStockCount, outOfStockCount, monthlyExpense, monthlyPurchaseValue: monthlyPurchase });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/recent-activity", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const limit = parseInt(String(req.query.limit ?? "15"));
    const activities = await db.select().from(activityLogTable).where(eq(activityLogTable.userId, userId)).orderBy(desc(activityLogTable.createdAt)).limit(limit);
    res.json(activities.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
