import JSZip from "jszip";
import { listParts, listStockMovements } from "@workspace/api-client-react";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  let s = String(value);
  // Neutralize spreadsheet formula injection: a user-entered value starting with
  // = + - @ (or a leading tab/CR) can execute as a formula in Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  // RFC-4180 quoting.
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  // Leading BOM so Excel opens UTF-8 correctly.
  return "\uFEFF" + lines.join("\r\n");
}

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

export interface BackupResult {
  parts: number;
  movements: number;
}

// Fetches the full inventory (including soft-deleted parts) and the complete stock
// movement history, then triggers a download of a ZIP containing two CSV files.
export async function downloadBackup(): Promise<BackupResult> {
  const [parts, movements] = await Promise.all([
    listParts({ includeDeleted: true }),
    listStockMovements({ limit: 1_000_000 }),
  ]);

  const inventoryCsv = toCsv(
    [
      "ID", "Name", "Model Number", "Category", "Condition", "Location",
      "Quantity", "Unit", "Unit Price", "Total Value", "Low Stock Threshold",
      "Status", "Image URLs", "Created At", "Last Updated",
    ],
    parts.map((p) => [
      p.id, p.name, p.modelNumber, p.category, p.condition, p.location ?? "",
      p.quantity, p.unit, p.unitPrice, p.totalValue, p.lowStockThreshold,
      p.deletedAt ? "Deleted" : "Active",
      (p.imageUrls ?? []).join(" | "),
      fmtDateTime(p.createdAt), fmtDateTime(p.updatedAt),
    ]),
  );

  const movementsCsv = toCsv(
    [
      "ID", "Part Name", "Part ID", "Type", "Quantity", "Unit",
      "Where Used", "Notes", "Entry Date", "Recorded At",
    ],
    movements.map((m) => [
      m.id, m.partName ?? `Part #${m.partId}`, m.partId,
      movementTypeLabel[m.type] ?? m.type, m.quantity, m.partUnit ?? "",
      m.whereUsed ?? "", m.notes ?? "", m.date ?? "", fmtDateTime(m.createdAt),
    ]),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const zip = new JSZip();
  zip.file(`inventory_${stamp}.csv`, inventoryCsv);
  zip.file(`stock_movements_${stamp}.csv`, movementsCsv);
  const blob = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ck-group-backup-${stamp}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { parts: parts.length, movements: movements.length };
}
