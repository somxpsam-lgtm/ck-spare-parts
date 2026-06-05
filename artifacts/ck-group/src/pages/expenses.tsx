import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useListExpenses,
  useCreateExpense,
  useListCategories,
  getListExpensesQueryKey
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Loader2, Plus, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

const expenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  partName: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Unit price must be positive"),
  supplierName: z.string().optional(),
  notes: z.string().optional(),
});

export default function ExpensesPage() {
  const [open, setOpen] = useState(false);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const [filterMonth, setFilterMonth] = useState<string>(String(currentMonth));
  const [filterYear, setFilterYear] = useState<string>(String(currentYear));

  const { data: expenses, isLoading } = useListExpenses({ 
    month: parseInt(filterMonth), 
    year: parseInt(filterYear) 
  });
  
  const { data: categories } = useListCategories();
  
  const createMutation = useCreateExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: todayStr,
      partName: "",
      category: "",
      quantity: 1,
      unitPrice: 0,
      supplierName: "",
      notes: "",
    }
  });

  const onSubmit = (values: z.infer<typeof expenseSchema>) => {
    const totalCost = values.quantity * values.unitPrice;
    const dateObj = new Date(values.date);
    
    createMutation.mutate({
      data: {
        ...values,
        totalCost,
        month: dateObj.getMonth() + 1,
        year: dateObj.getFullYear(),
      }
    }, {
      onSuccess: () => {
        toast({ title: "Expense recorded successfully" });
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to record expense", description: err.message, variant: "destructive" });
      }
    });
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(i);
    return { value: String(i + 1), label: format(d, "MMMM") };
  });

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground mt-1">Track purchasing and spending records</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
                <DialogDescription>Log a new parts purchase or inventory cost.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map(c => (
                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="partName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Part / Item Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Engine Filter Array" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="supplierName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Acme Industrial" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="unitPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Price (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Invoice number, PO reference, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-muted p-4 rounded-md flex justify-between items-center mt-2 border border-border">
                    <span className="font-medium text-sm text-muted-foreground">Calculated Total</span>
                    <span className="font-bold text-lg text-primary">
                      {formatCurrency((form.watch("quantity") || 0) * (form.watch("unitPrice") || 0))}
                    </span>
                  </div>

                  <div className="flex justify-end pt-4 gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90">
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Expense
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4 bg-card p-4 rounded-xl border border-border shadow-sm items-center">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-[150px] bg-background">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[120px] bg-background">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right font-bold text-foreground">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : expenses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No expenses found for this month.
                  </TableCell>
                </TableRow>
              ) : (
                expenses?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(e.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">{e.partName || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{e.category}</TableCell>
                    <TableCell className="text-muted-foreground">{e.supplierName || "—"}</TableCell>
                    <TableCell className="text-right">{e.quantity}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(e.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium text-foreground">{formatCurrency(e.totalCost)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}