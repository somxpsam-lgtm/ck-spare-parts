import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useGetInventoryReport, 
  useGetLowStockReport, 
  useGetCategoryReport 
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Link } from "wouter";
import { ArrowRight, FileBarChart, PackageSearch, AlertTriangle, Download, FileSpreadsheet, FileText } from "lucide-react";

export default function ReportsPage() {
  const { data: inventory, isLoading: isLoadingInv } = useGetInventoryReport();
  const { data: lowStock, isLoading: isLoadingLow } = useGetLowStockReport();
  const { data: categories, isLoading: isLoadingCat } = useGetCategoryReport();

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  const CHART_COLORS = [
    "hsl(var(--chart-1))", 
    "hsl(var(--chart-2))", 
    "hsl(var(--chart-3))", 
    "hsl(var(--chart-4))", 
    "hsl(var(--chart-5))",
    "hsl(var(--primary))"
  ];

  // ── Export helpers (new) ─────────────────────────────────────────────────
  const exportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const escape = (v: string | number) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map(row => row.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const date = new Date().toISOString().split("T")[0];

    // Inventory summary sheet
    exportCSV(`inventory-report-${date}.csv`, 
      ["Metric", "Value"],
      [
        ["Total Parts", inventory?.totalParts ?? 0],
        ["Total Quantity (Units)", inventory?.totalQuantity ?? 0],
        ["Total Stock Value (₹)", inventory?.totalStockValue ?? 0],
      ]
    );

    // Categories sheet (second file)
    if (categories?.length) {
      setTimeout(() => {
        exportCSV(`categories-report-${date}.csv`,
          ["Category", "Unique Parts", "Total Value (₹)"],
          categories.map(c => [c.category, c.totalParts, c.totalValue])
        );
      }, 300);
    }

    // Low stock sheet (third file)
    if (lowStock?.length) {
      setTimeout(() => {
        exportCSV(`low-stock-report-${date}.csv`,
          ["Part Name", "Model Number", "Category", "Location", "Current Stock", "Threshold", "Deficit"],
          lowStock.map(i => [i.name, i.modelNumber, i.category, i.location ?? "", i.quantity, i.lowStockThreshold, i.reorderNeeded])
        );
      }, 600);
    }
  };

  const handleExportPDF = () => {
    const date = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const catRows = categories?.map(c =>
      `<tr><td>${c.category}</td><td style="text-align:right">${c.totalParts}</td><td style="text-align:right">₹${c.totalValue.toLocaleString("en-IN")}</td></tr>`
    ).join("") ?? "<tr><td colspan='3'>No data</td></tr>";
    const lowRows = lowStock?.map(i =>
      `<tr><td>${i.name}</td><td>${i.category}</td><td style="text-align:right;color:#ef4444">${i.quantity}</td><td style="text-align:right">${i.lowStockThreshold}</td><td style="text-align:right;color:#ef4444">-${i.reorderNeeded}</td></tr>`
    ).join("") ?? "<tr><td colspan='5'>All items sufficiently stocked</td></tr>";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Inventory Report</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px}
      h1{font-size:22px;margin-bottom:4px}
      h2{font-size:15px;margin:24px 0 8px;color:#374151}
      .meta{color:#6b7280;margin-bottom:24px;font-size:12px}
      .stats{display:flex;gap:24px;margin-bottom:24px}
      .stat{background:#f3f4f6;border-radius:8px;padding:16px 20px;min-width:120px}
      .stat-label{font-size:11px;color:#6b7280;margin-bottom:4px}
      .stat-value{font-size:22px;font-weight:700}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f3f4f6;padding:8px 12px;text-align:left;font-size:11px;font-weight:600;border-bottom:2px solid #e5e7eb}
      td{padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px}
      @media print{body{padding:16px}}
    </style></head><body>
    <h1>Inventory Report</h1>
    <p class="meta">Generated: ${date}</p>
    <div class="stats">
      <div class="stat"><div class="stat-label">Total Parts</div><div class="stat-value">${inventory?.totalParts ?? 0}</div></div>
      <div class="stat"><div class="stat-label">Total Units</div><div class="stat-value">${inventory?.totalQuantity ?? 0}</div></div>
      <div class="stat"><div class="stat-label">Stock Value</div><div class="stat-value">₹${(inventory?.totalStockValue ?? 0).toLocaleString("en-IN")}</div></div>
    </div>
    <h2>Category Breakdown</h2>
    <table><thead><tr><th>Category</th><th style="text-align:right">Unique Parts</th><th style="text-align:right">Total Value</th></tr></thead><tbody>${catRows}</tbody></table>
    <h2>Low Stock Items</h2>
    <table><thead><tr><th>Part</th><th>Category</th><th style="text-align:right">Current Stock</th><th style="text-align:right">Threshold</th><th style="text-align:right">Deficit</th></tr></thead><tbody>${lowRows}</tbody></table>
    <script>window.onload=()=>window.print()</script></body></html>`;

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };
  // ── End export helpers ────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground mt-1">Analytics and inventory insights</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export dropdown (new) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-border">
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" />
                  Export as Excel (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                  <FileText className="mr-2 h-4 w-4 text-red-500" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button asChild variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
              <Link href="/reports/monthly">
                View Monthly Financials <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 mb-6 rounded-lg border border-border">
            <TabsTrigger value="inventory" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <FileBarChart className="h-4 w-4 mr-2 hidden sm:inline" />
              Inventory Summary
            </TabsTrigger>
            <TabsTrigger value="low-stock" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <AlertTriangle className="h-4 w-4 mr-2 hidden sm:inline" />
              Low Stock
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <PackageSearch className="h-4 w-4 mr-2 hidden sm:inline" />
              Categories
            </TabsTrigger>
          </TabsList>

          {/* INVENTORY TAB */}
          <TabsContent value="inventory" className="space-y-6 animate-in fade-in-50">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Parts</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingInv ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-bold">{inventory?.totalParts}</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Quantity (Units)</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingInv ? <Skeleton className="h-8 w-20" /> : <div className="text-3xl font-bold">{inventory?.totalQuantity}</div>}
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Total Stock Value</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingInv ? <Skeleton className="h-8 w-32" /> : <div className="text-3xl font-bold text-primary">{inventory ? formatCurrency(inventory.totalStockValue) : "₹0"}</div>}
                </CardContent>
              </Card>
            </div>

            {/* Stock Value by Category bar chart (new) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stock Value by Category</CardTitle>
                <CardDescription>Total inventory value distributed across categories</CardDescription>
              </CardHeader>
              <CardContent className="h-[260px]">
                {isLoadingCat ? (
                  <Skeleton className="w-full h-full" />
                ) : categories?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories} margin={{ top: 4, right: 12, left: 0, bottom: 32 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                        width={52}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Stock Value"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Bar dataKey="totalValue" name="Stock Value" radius={[4, 4, 0, 0]}>
                        {categories.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data available</div>
                )}
              </CardContent>
            </Card>

            {inventory && (
              <p className="text-xs text-muted-foreground text-right">
                Report generated at {new Date(inventory.generatedAt).toLocaleString()}
              </p>
            )}
          </TabsContent>

          {/* LOW STOCK TAB */}
          <TabsContent value="low-stock" className="space-y-6 animate-in fade-in-50">
            {/* Deficit bar chart (new) */}
            {!isLoadingLow && lowStock && lowStock.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-amber-500">Reorder Deficit Chart</CardTitle>
                  <CardDescription>How many units each item is below its threshold</CardDescription>
                </CardHeader>
                <CardContent className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={lowStock.map(i => ({ name: i.name.length > 16 ? i.name.substring(0, 14) + "…" : i.name, deficit: i.reorderNeeded }))}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                        width={110}
                      />
                      <Tooltip
                        formatter={(v: number) => [`${v} units`, "Deficit"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Bar dataKey="deficit" name="Deficit" fill="hsl(var(--destructive))" opacity={0.8} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-amber-500 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Items Requiring Reorder
                </CardTitle>
                <CardDescription>Parts that have fallen to or below their low stock threshold.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Part</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        <TableHead className="text-right">Threshold</TableHead>
                        <TableHead className="text-right text-destructive font-bold">Deficit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingLow ? (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center"><Skeleton className="h-6 w-6 mx-auto rounded-full" /></TableCell></TableRow>
                      ) : lowStock?.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">All items are sufficiently stocked.</TableCell></TableRow>
                      ) : (
                        lowStock?.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium text-foreground">{item.name}</div>
                              <div className="text-xs text-muted-foreground">{item.modelNumber}</div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{item.category}</TableCell>
                            <TableCell className="text-muted-foreground">{item.location || "—"}</TableCell>
                            <TableCell className="text-right font-bold">
                              {item.quantity === 0 ? (
                                <span className="text-destructive">0</span>
                              ) : (
                                <span className="text-amber-500">{item.quantity}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{item.lowStockThreshold}</TableCell>
                            <TableCell className="text-right text-destructive font-bold">-{item.reorderNeeded}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CATEGORIES TAB */}
          <TabsContent value="categories" className="space-y-6 animate-in fade-in-50">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Value by Category</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {isLoadingCat ? (
                    <Skeleton className="w-full h-full rounded-full" />
                  ) : categories?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categories}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="totalValue"
                          nameKey="category"
                        >
                          {categories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Unique Parts</TableHead>
                          <TableHead className="text-right">Total Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingCat ? (
                          <TableRow><TableCell colSpan={3} className="h-24 text-center"><Skeleton className="h-6 w-6 mx-auto rounded-full" /></TableCell></TableRow>
                        ) : categories?.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No categories found.</TableCell></TableRow>
                        ) : (
                          categories?.map(c => (
                            <TableRow key={c.category}>
                              <TableCell className="font-medium">{c.category}</TableCell>
                              <TableCell className="text-right">{c.totalParts}</TableCell>
                              <TableCell className="text-right font-medium text-primary">{formatCurrency(c.totalValue)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
