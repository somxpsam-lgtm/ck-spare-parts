import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const router = Router();

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
  return createClient(url, key);
}

const BUCKET = "ck-uploads";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (JPEG, PNG, GIF, WEBP)"));
    }
  },
});

router.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No image file provided" });
    return;
  }

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      req.log.error({ err: error }, "Supabase storage upload failed");
      res.status(500).json({ error: "Upload failed: " + error.message });
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filename);

    res.json({ url: publicUrlData.publicUrl, filename });
  } catch (err) {
    req.log.error({ err }, "Upload error");
    res.status(500).json({ error: "Upload failed" });
  }
});

router.delete("/:filename", async (req, res) => {
  const { filename } = req.params;
  if (filename.includes("..") || filename.includes("/")) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage.from(BUCKET).remove([filename]);
    if (error) {
      req.log.warn({ err: error }, "Supabase storage delete failed");
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Delete error");
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
