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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileBarChart, PackageSearch, AlertTriangle } from "lucide-react";

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground mt-1">Analytics and inventory insights</p>
          </div>
          <Button asChild variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
            <Link href="/reports/monthly">
              View Monthly Financials <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
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
            
            {inventory && (
              <p className="text-xs text-muted-foreground text-right">
                Report generated at {new Date(inventory.generatedAt).toLocaleString()}
              </p>
            )}
          </TabsContent>

          {/* LOW STOCK TAB */}
          <TabsContent value="low-stock" className="animate-in fade-in-50">
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