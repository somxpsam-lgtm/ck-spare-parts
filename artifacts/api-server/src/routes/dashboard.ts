import { Router } from "express";
import { db } from "@workspace/db";
import { partsTable, expenseRecordsTable, activityLogTable } from "@workspace/db";
import { isNull, sum, count, lte, eq, sql, desc } from "drizzle-orm";

const router = Router();

// GET /dashboard/summary
router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const parts = await db
      .select()
      .from(partsTable)
      .where(isNull(partsTable.deletedAt));

    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalParts = parts.length;
    const categorySet = new Set<string>();

    for (const p of parts) {
      const price = parseFloat(p.unitPrice as string);
      totalValue += price * p.quantity;
      categorySet.add(p.category);
      if (p.quantity === 0) outOfStockCount++;
      else if (p.quantity <= p.lowStockThreshold) lowStockCount++;
    }

    // Monthly expense from expense_records
    const [expenseResult] = await db
      .select({ total: sum(expenseRecordsTable.totalCost) })
      .from(expenseRecordsTable)
      .where(
        sql`${expenseRecordsTable.month} = ${currentMonth} AND ${expenseRecordsTable.year} = ${currentYear}`
      );

    const monthlyExpense = parseFloat(expenseResult?.total ?? "0");

    // Monthly purchase value from parts added this month
    const monthlyPurchase = parts
      .filter((p) => {
        const d = new Date(p.createdAt);
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, p) => acc + parseFloat(p.unitPrice as string) * p.quantity, 0);

    res.json({
      totalParts,
      totalValue,
      totalCategories: categorySet.size,
      lowStockCount,
      outOfStockCount,
      monthlyExpense,
      monthlyPurchaseValue: monthlyPurchase,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/recent-activity
router.get("/recent-activity", async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit ?? "15"));

    const activities = await db
      .select()
      .from(activityLogTable)
      .orderBy(desc(activityLogTable.createdAt))
      .limit(limit);

    res.json(
      activities.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
