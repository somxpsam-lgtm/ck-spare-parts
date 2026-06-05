import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateCategoryBody } from "@workspace/api-zod";

const router = Router();

// GET /categories
router.get("/", async (req, res) => {
  try {
    const categories = await db
      .select()
      .from(categoriesTable)
      .orderBy(categoriesTable.name);

    res.json(
      categories.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /categories
router.post("/", async (req, res) => {
  try {
    const body = CreateCategoryBody.parse(req.body);

    const [category] = await db
      .insert(categoriesTable)
      .values({ name: body.name })
      .returning();

    res.status(201).json({
      ...category,
      createdAt: category.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
