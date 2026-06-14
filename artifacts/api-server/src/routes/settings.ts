import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { companySettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router = Router();

const DEFAULTS = {
  companyName: "CK Group",
  companyAddress: "",
  logoUrl: "",
  gstNumber: "",
  contactPhone: "",
  contactEmail: "",
};

router.get("/", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const [row] = await db.select().from(companySettingsTable).where(eq(companySettingsTable.userId, userId));
    if (!row) {
      res.json({ ...DEFAULTS, updatedAt: new Date().toISOString() });
      return;
    }
    res.json({
      companyName: row.companyName,
      companyAddress: row.companyAddress,
      logoUrl: row.logoUrl,
      gstNumber: row.gstNumber,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.put("/", async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    const body = UpdateSettingsBody.parse(req.body);
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (body.companyName !== undefined) set.companyName = body.companyName;
    if (body.companyAddress !== undefined) set.companyAddress = body.companyAddress;
    if (body.logoUrl !== undefined) set.logoUrl = body.logoUrl;
    if (body.gstNumber !== undefined) set.gstNumber = body.gstNumber;
    if (body.contactPhone !== undefined) set.contactPhone = body.contactPhone;
    if (body.contactEmail !== undefined) set.contactEmail = body.contactEmail;

    const [row] = await db
      .insert(companySettingsTable)
      .values({ userId, ...DEFAULTS, ...set })
      .onConflictDoUpdate({ target: companySettingsTable.userId, set })
      .returning();

    res.json({
      companyName: row.companyName,
      companyAddress: row.companyAddress,
      logoUrl: row.logoUrl,
      gstNumber: row.gstNumber,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
