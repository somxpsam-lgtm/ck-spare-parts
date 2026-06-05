import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetDashboardSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingDown, TrendingUp, AlertTriangle, BoxSelect, History, IndianRupee } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";

export default function DashboardPage() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity({ limit: 10 });

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
              You have {summary.lowStockCount} item(s) running low and {summary.outOfStockCount} out of stock. Please check the reports.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Parts" 
            value={summary?.totalParts} 
            icon={<Package className="h-4 w-4 text-muted-foreground" />} 
            isLoading={isLoadingSummary} 
          />
          <StatCard 
            title="Total Value" 
            value={summary ? formatCurrency(summary.totalValue) : undefined} 
            icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />} 
            isLoading={isLoadingSummary} 
          />
          <StatCard 
            title="Monthly Expense" 
            value={summary ? formatCurrency(summary.monthlyExpense) : undefined} 
            icon={<TrendingDown className="h-4 w-4 text-destructive" />} 
            isLoading={isLoadingSummary} 
          />
          <StatCard 
            title="Monthly Purchase" 
            value={summary ? formatCurrency(summary.monthlyPurchaseValue) : undefined} 
            icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} 
            isLoading={isLoadingSummary} 
          />
          <StatCard 
            title="Out of Stock" 
            value={summary?.outOfStockCount} 
            icon={<BoxSelect className="h-4 w-4 text-destructive" />} 
            isLoading={isLoadingSummary} 
          />
          <StatCard 
            title="Low Stock" 
            value={summary?.lowStockCount} 
            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} 
            isLoading={isLoadingSummary} 
          />
          <StatCard 
            title="Categories" 
            value={summary?.totalCategories} 
            icon={<BoxSelect className="h-4 w-4 text-muted-foreground" />} 
            isLoading={isLoadingSummary} 
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 lg:col-span-7">
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
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon, isLoading }: { title: string, value?: string | number, icon: React.ReactNode, isLoading: boolean }) {
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