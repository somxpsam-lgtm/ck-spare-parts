import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetMonthlyExpenseReport, useGetYearlySummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, IndianRupee } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function ReportsMonthlyPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<string>(String(currentYear));

  const { data: monthlyData, isLoading: isLoadingMonthly } = useGetMonthlyExpenseReport({ year: parseInt(year) });
  const { data: yearlyData, isLoading: isLoadingYearly } = useGetYearlySummary({ year: parseInt(year) });

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const CHART_COLORS = [
    "hsl(var(--chart-1))", 
    "hsl(var(--chart-2))", 
    "hsl(var(--chart-3))", 
    "hsl(var(--chart-4))", 
    "hsl(var(--chart-5))",
    "hsl(var(--primary))"
  ];

  // Aggregate category spending across all months
  const yearlyCategoryBreakdown = React.useMemo(() => {
    if (!monthlyData) return [];
    const catMap = new Map<string, number>();
    monthlyData.forEach(m => {
      m.categoryBreakdown.forEach(c => {
        catMap.set(c.category, (catMap.get(c.category) || 0) + c.amount);
      });
    });
    return Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyData]);

  // Format data for bar chart
  const barChartData = monthlyData?.map(m => ({
    name: m.monthName?.substring(0, 3) || m.month,
    total: m.totalExpense
  })) || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="h-9 w-9">
              <Link href="/reports"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Financial Analytics</h1>
              <p className="text-muted-foreground mt-1">Expense tracking and spending trends</p>
            </div>
          </div>
          
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px] bg-card border-border shadow-sm">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* YEARLY SUMMARY CARDS */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-primary/5 border-primary/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                <IndianRupee className="h-4 w-4" /> Total Annual Expense
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingYearly ? <Skeleton className="h-8 w-32" /> : (
                <div className="text-3xl font-bold text-primary">{yearlyData ? formatCurrency(yearlyData.totalAnnualExpense) : "₹0"}</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Parts Purchased</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingYearly ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{yearlyData?.totalPurchasedParts || 0}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Highest Spending Month</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingYearly ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{yearlyData?.highestSpendingMonth || "—"}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Category</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingYearly ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold truncate">{yearlyData?.mostExpensiveCategory || "—"}</div>}
            </CardContent>
          </Card>
        </div>

        {/* CHARTS */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Monthly Spending Trend</CardTitle>
              <CardDescription>Total expenses per month for {year}</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {isLoadingMonthly ? (
                <Skeleton className="w-full h-full" />
              ) : barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis 
                      tickFormatter={(val) => `₹${val / 1000}k`} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      formatter={(val: number) => formatCurrency(val)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No expense data for {year}</div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>Aggregate expenses across {year}</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {isLoadingMonthly ? (
                <Skeleton className="w-full h-full rounded-full" />
              ) : yearlyCategoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={yearlyCategoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {yearlyCategoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => formatCurrency(val)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No expense data for {year}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MONTHLY BREAKDOWN TABLE */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle>Month-over-Month Breakdown</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6">Month</TableHead>
                <TableHead className="text-right">Total Expense</TableHead>
                <TableHead className="text-right">Growth</TableHead>
                <TableHead>Highest Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingMonthly ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Skeleton className="h-6 w-6 mx-auto rounded-full" /></TableCell></TableRow>
              ) : monthlyData?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No data.</TableCell></TableRow>
              ) : (
                monthlyData?.slice().reverse().map(m => {
                  const isUp = m.growthPercentage && m.growthPercentage > 0;
                  const isDown = m.growthPercentage && m.growthPercentage < 0;
                  
                  return (
                    <TableRow key={m.month}>
                      <TableCell className="pl-6 font-medium">{m.monthName} {m.year}</TableCell>
                      <TableCell className="text-right font-medium text-foreground">{formatCurrency(m.totalExpense)}</TableCell>
                      <TableCell className="text-right">
                        {m.growthPercentage === null || m.growthPercentage === undefined ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={`inline-flex items-center justify-end w-full ${isUp ? 'text-destructive' : isDown ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                            {isUp && <ArrowUpRight className="h-3 w-3 mr-1" />}
                            {isDown && <ArrowDownRight className="h-3 w-3 mr-1" />}
                            {Math.abs(m.growthPercentage).toFixed(1)}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.highestCategory || "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppLayout>
  );
}