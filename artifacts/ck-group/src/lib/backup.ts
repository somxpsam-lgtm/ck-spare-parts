import type ExcelJSNS from "exceljs";
import { listParts, listStockMovements } from "@workspace/api-client-react";

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const movementTypeLabel: Record<string, string> = {
  in: "In (Added)",
  out: "Out (Used)",
  adjustment: "Adjustment",
};

const HEADER_FILL = "FF1B2A3F";

function styleHeader(ws: ExcelJSNS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  header.alignment = { vertical: "middle" };
  header.height = 20;
}

export interface BackupResult {
  parts: number;
  movements: number;
}

// Fetches the full inventory (including soft-deleted parts) and the complete stock
// movement history, then downloads a single .xlsx workbook with one tab each.
export async function downloadBackup(): Promise<BackupResult> {
  // Load ExcelJS lazily (~2MB) so it isn't pulled into the main app bundle.
  const [parts, movements, ExcelJSMod] = await Promise.all([
    listParts({ includeDeleted: true }),
    listStockMovements({ limit: 1_000_000 }),
    import("exceljs"),
  ]);
  const ExcelJS = ExcelJSMod.default;

  const wb = new ExcelJS.Workbook();
  wb.creator = "CK Group";
  wb.created = new Date();

  const inv = wb.addWorksheet("Inventory", { views: [{ state: "frozen", ySplit: 1 }] });
  inv.columns = [
    { header: "ID", key: "id", width: 6 },
    { header: "Name", key: "name", width: 28 },
    { header: "Model Number", key: "model", width: 18 },
    { header: "Category", key: "category", width: 16 },
    { header: "Condition", key: "condition", width: 12 },
    { header: "Location", key: "location", width: 16 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Unit Price", key: "unitPrice", width: 12 },
    { header: "Total Value", key: "totalValue", width: 14 },
    { header: "Low Stock Threshold", key: "lowStock", width: 18 },
    { header: "Status", key: "status", width: 10 },
    { header: "Image URLs", key: "images", width: 40 },
    { header: "Created At", key: "createdAt", width: 18 },
    { header: "Last Updated", key: "updatedAt", width: 18 },
  ];
  for (const p of parts) {
    inv.addRow({
      id: p.id,
      name: p.name,
      model: p.modelNumber,
      category: p.category,
      condition: p.condition,
      location: p.location ?? "",
      quantity: p.quantity,
      unit: p.unit,
      unitPrice: p.unitPrice,
      totalValue: p.totalValue,
      lowStock: p.lowStockThreshold,
      status: p.deletedAt ? "Deleted" : "Active",
      images: (p.imageUrls ?? []).join(" | "),
      createdAt: fmtDateTime(p.createdAt),
      updatedAt: fmtDateTime(p.updatedAt),
    });
  }

  const mv = wb.addWorksheet("Stock Movements", { views: [{ state: "frozen", ySplit: 1 }] });
  mv.columns = [
    { header: "ID", key: "id", width: 6 },
    { header: "Part Name", key: "partName", width: 28 },
    { header: "Part ID", key: "partId", width: 8 },
    { header: "Type", key: "type", width: 14 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Where Used", key: "whereUsed", width: 24 },
    { header: "Notes", key: "notes", width: 30 },
    { header: "Entry Date", key: "date", width: 14 },
    { header: "Recorded At", key: "recordedAt", width: 18 },
  ];
  for (const m of movements) {
    mv.addRow({
      id: m.id,
      partName: m.partName ?? `Part #${m.partId}`,
      partId: m.partId,
      type: movementTypeLabel[m.type] ?? m.type,
      quantity: m.quantity,
      unit: m.partUnit ?? "",
      whereUsed: m.whereUsed ?? "",
      notes: m.notes ?? "",
      date: m.date ?? "",
      recordedAt: fmtDateTime(m.createdAt),
    });
  }

  styleHeader(inv);
  styleHeader(mv);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ck-group-backup-${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Delay revocation so mobile WebView download wrappers can finish reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1500);

  return { parts: parts.length, movements: movements.length };
}
