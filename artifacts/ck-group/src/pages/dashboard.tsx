import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  getGetDashboardSummaryQueryOptions,
  getGetRecentActivityQueryOptions,
  useGetMonthlyExpenseReport,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingDown, TrendingUp, AlertTriangle, BoxSelect, History, IndianRupee, BarChart2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import type { DashboardSummary, ActivityItem } from "@workspace/api-client-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function DashboardPage() {
  const { data: summary, isLoading: isLoadingSummary } = useQuery<DashboardSummary>({
    ...getGetDashboardSummaryQueryOptions(),
    refetchInterval: 30000,
  });

  const { data: activity, isLoading: isLoadingActivity } = useQuery<ActivityItem[]>({
    ...getGetRecentActivityQueryOptions({ limit: 10 }),
    refetchInterval: 30000,
  });

  const currentYear = new Date().getFullYear();
  const { data: monthlyData, isLoading: isLoadingTrend } = useGetMonthlyExpenseReport({ year: currentYear });

  const trendData = React.useMemo(() => {
    if (!monthlyData?.length) return [];
    return monthlyData.map((m) => ({
      month: m.monthName?.substring(0, 3) ?? `M${m.month}`,
      expense: m.totalExpense ?? 0,
      prev: m.previousMonthExpense ?? 0,
    }));
  }, [monthlyData]);

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your spare parts inventory</p>
        </div>

        {summary?.lowStockCount ? (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Low Stock Warning</AlertTitle>
            <AlertDescription>
              You have {summary.lowStockCount} item(s) running low and {summary.outOfStockCount} out of stock.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Parts" value={summary?.totalParts} icon={<Package className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingSummary} />
          <StatCard title="Total Value" value={summary ? formatCurrency(summary.totalValue) : undefined} icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingSummary} />
          <StatCard title="Monthly Expense" value={summary ? formatCurrency(summary.monthlyExpense) : undefined} icon={<TrendingDown className="h-4 w-4 text-destructive" />} isLoading={isLoadingSummary} />
          <StatCard title="Monthly Purchase" value={summary ? formatCurrency(summary.monthlyPurchaseValue) : undefined} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} isLoading={isLoadingSummary} />
          <StatCard title="Out of Stock" value={summary?.outOfStockCount} icon={<BoxSelect className="h-4 w-4 text-destructive" />} isLoading={isLoadingSummary} />
          <StatCard title="Low Stock" value={summary?.lowStockCount} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} isLoading={isLoadingSummary} />
          <StatCard title="Categories" value={summary?.totalCategories} icon={<BoxSelect className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingSummary} />
        </div>

        {/* ── TREND GRAPH (new) ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5" />
              Monthly Expense Trend — {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTrend ? (
              <Skeleton className="h-56 w-full" />
            ) : trendData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 text-center gap-3">
                <BarChart2 className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No expense data for {currentYear} yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Expense"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }} />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Monthly Expense"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#gradExpense)"
                    dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activity?.length ? (
              <div className="space-y-6">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      {item.type === 'stock_out' ? <TrendingDown className="h-4 w-4 text-primary" /> :
                       item.type === 'stock_in' ? <TrendingUp className="h-4 w-4 text-emerald-500" /> :
                       <Package className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{item.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.partName || 'System'}</span>
                        <span>•</span>
                        <span>{format(new Date(item.createdAt), "MMM d, h:mm a")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                <History className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">No recent activity yet</p>
                <p className="text-xs text-muted-foreground/70">Activities will appear here as you add parts, record stock movements, and log expenses.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon, isLoading }: { title: string; value?: string | number; icon: React.ReactNode; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value !== undefined ? value : "0"}</div>
        )}
      </CardContent>
    </Card>
  );
}
