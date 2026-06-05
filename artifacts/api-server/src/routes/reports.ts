import { Router } from "express";
import { db } from "@workspace/db";
import { partsTable, expenseRecordsTable } from "@workspace/db";
import { isNull, sql, asc } from "drizzle-orm";

const router = Router();

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// GET /reports/inventory
router.get("/inventory", async (req, res) => {
  try {
    const parts = await db
      .select()
      .from(partsTable)
      .where(isNull(partsTable.deletedAt));

    let totalQuantity = 0;
    let totalStockValue = 0;

    for (const p of parts) {
      totalQuantity += p.quantity;
      totalStockValue += parseFloat(p.unitPrice as string) * p.quantity;
    }

    res.json({
      totalParts: parts.length,
      totalQuantity,
      totalStockValue,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /reports/low-stock
router.get("/low-stock", async (req, res) => {
  try {
    const parts = await db
      .select()
      .from(partsTable)
      .where(isNull(partsTable.deletedAt));

    const lowStock = parts
      .filter((p) => p.quantity <= p.lowStockThreshold)
      .map((p) => ({
        id: p.id,
        name: p.name,
        modelNumber: p.modelNumber,
        category: p.category,
        quantity: p.quantity,
        lowStockThreshold: p.lowStockThreshold,
        reorderNeeded: Math.max(0, p.lowStockThreshold - p.quantity + 1),
        location: p.location ?? null,
      }))
      .sort((a, b) => a.quantity - b.quantity);

    res.json(lowStock);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /reports/category-wise
router.get("/category-wise", async (req, res) => {
  try {
    const parts = await db
      .select()
      .from(partsTable)
      .where(isNull(partsTable.deletedAt));

    const categoryMap = new Map<string, { totalParts: number; totalValue: number }>();

    for (const p of parts) {
      const existing = categoryMap.get(p.category) ?? { totalParts: 0, totalValue: 0 };
      existing.totalParts += 1;
      existing.totalValue += parseFloat(p.unitPrice as string) * p.quantity;
      categoryMap.set(p.category, existing);
    }

    const report = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.totalValue - a.totalValue);

    res.json(report);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /reports/monthly-expense
router.get("/monthly-expense", async (req, res) => {
  try {
    const year = parseInt(String(req.query.year ?? new Date().getFullYear()));

    const records = await db
      .select()
      .from(expenseRecordsTable)
      .where(sql`${expenseRecordsTable.year} = ${year}`)
      .orderBy(asc(expenseRecordsTable.month));

    // Group by month
    const monthMap = new Map<number, { total: number; categories: Map<string, number> }>();

    for (const r of records) {
      const existing = monthMap.get(r.month) ?? { total: 0, categories: new Map() };
      const cost = parseFloat(r.totalCost as string);
      existing.total += cost;
      existing.categories.set(
        r.category,
        (existing.categories.get(r.category) ?? 0) + cost
      );
      monthMap.set(r.month, existing);
    }

    const result = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const data = monthMap.get(month);
      const totalExpense = data?.total ?? 0;
      const categoryBreakdown = data
        ? Array.from(data.categories.entries()).map(([category, amount]) => ({
            category,
            amount,
          }))
        : [];

      // Find highest/lowest
      const highest = categoryBreakdown.reduce(
        (a, b) => (b.amount > a.amount ? b : a),
        categoryBreakdown[0]
      );
      const lowest = categoryBreakdown.reduce(
        (a, b) => (b.amount < a.amount ? b : a),
        categoryBreakdown[0]
      );

      const prevMonth = monthMap.get(month - 1)?.total ?? null;
      const growthPercentage =
        prevMonth && prevMonth > 0
          ? ((totalExpense - prevMonth) / prevMonth) * 100
          : null;

      return {
        month,
        year,
        monthName: MONTH_NAMES[month],
        totalExpense,
        previousMonthExpense: prevMonth,
        growthPercentage: growthPercentage !== null ? Math.round(growthPercentage * 10) / 10 : null,
        highestCategory: highest?.category ?? null,
        lowestCategory: lowest?.category ?? null,
        categoryBreakdown,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /reports/yearly-summary
router.get("/yearly-summary", async (req, res) => {
  try {
    const year = parseInt(String(req.query.year ?? new Date().getFullYear()));

    const records = await db
      .select()
      .from(expenseRecordsTable)
      .where(sql`${expenseRecordsTable.year} = ${year}`);

    let totalAnnualExpense = 0;
    const monthTotals = new Map<number, number>();
    const categoryTotals = new Map<string, number>();
    let totalPurchasedParts = 0;

    for (const r of records) {
      const cost = parseFloat(r.totalCost as string);
      totalAnnualExpense += cost;
      monthTotals.set(r.month, (monthTotals.get(r.month) ?? 0) + cost);
      categoryTotals.set(r.category, (categoryTotals.get(r.category) ?? 0) + cost);
      totalPurchasedParts += r.quantity;
    }

    let highestMonth = 1;
    let lowestMonth = 1;
    let highestVal = -Infinity;
    let lowestVal = Infinity;

    for (const [month, val] of monthTotals.entries()) {
      if (val > highestVal) { highestVal = val; highestMonth = month; }
      if (val < lowestVal) { lowestVal = val; lowestMonth = month; }
    }

    let mostExpensiveCategory = "N/A";
    let maxCatVal = -Infinity;
    for (const [cat, val] of categoryTotals.entries()) {
      if (val > maxCatVal) { maxCatVal = val; mostExpensiveCategory = cat; }
    }

    res.json({
      year,
      totalAnnualExpense,
      highestSpendingMonth: monthTotals.size > 0 ? MONTH_NAMES[highestMonth] : "N/A",
      lowestSpendingMonth: monthTotals.size > 0 ? MONTH_NAMES[lowestMonth] : "N/A",
      mostExpensiveCategory,
      totalPurchasedParts,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
