import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListStockMovements,
  useListParts,
  useCreateStockMovement,
  getListStockMovementsQueryKey,
  getListPartsQueryKey,
  getGetDashboardSummaryQueryKey,
  StockMovementInputType
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, TrendingUp, TrendingDown, RefreshCcw, Loader2, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

const movementSchema = z.object({
  partId: z.coerce.number().min(1, "Select a part"),
  type: z.enum(["in", "out", "adjustment"] as const),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
  date: z.string().optional(),
});

const editSchema = z.object({
  type: z.enum(["in", "out", "adjustment"] as const),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
  date: z.string().optional(),
});

type Movement = {
  id: number;
  partId: number;
  partName: string | null;
  type: string;
  quantity: number;
  notes: string | null;
  date?: string | null;
  createdAt: string;
};

export default function StockMovementsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Movement | null>(null);
  const [deleteItem, setDeleteItem] = useState<Movement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: movements, isLoading } = useListStockMovements({ limit: 200 });
  const { data: parts } = useListParts({ includeDeleted: false });

  const createMutation = useCreateStockMovement();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof movementSchema>>({
    resolver: zodResolver(movementSchema),
    defaultValues: { partId: 0, type: "in", quantity: 1, notes: "", date: "" }
  });

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { type: "in", quantity: 1, notes: "", date: "" }
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListStockMovementsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const onSubmit = (values: z.infer<typeof movementSchema>) => {
    createMutation.mutate({
      data: {
        partId: values.partId,
        type: values.type as StockMovementInputType,
        quantity: values.quantity,
        notes: values.notes,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Movement recorded successfully" });
        setCreateOpen(false);
        form.reset();
        invalidate();
      },
      onError: (err: any) => {
        toast({ title: "Failed to record movement", description: err.message, variant: "destructive" });
      }
    });
  };

  const openEdit = (m: Movement) => {
    setEditItem(m);
    editForm.reset({
      type: m.type as "in" | "out" | "adjustment",
      quantity: m.quantity,
      notes: m.notes || "",
      date: m.date || m.createdAt.split("T")[0],
    });
  };

  const onEditSubmit = async (values: z.infer<typeof editSchema>) => {
    if (!editItem) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/stock-movements/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Update failed");
      toast({ title: "Movement updated successfully" });
      setEditItem(null);
      invalidate();
    } catch {
      toast({ title: "Failed to update movement", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const onDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/stock-movements/${deleteItem.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Movement deleted successfully" });
      setDeleteItem(null);
      invalidate();
    } catch {
      toast({ title: "Failed to delete movement", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch(type) {
      case "in": return <TrendingUp className="h-4 w-4 text-emerald-500 mr-2" />;
      case "out": return <TrendingDown className="h-4 w-4 text-primary mr-2" />;
      default: return <RefreshCcw className="h-4 w-4 text-amber-500 mr-2" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch(type) {
      case "in": return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Stock In</Badge>;
      case "out": return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Stock Out</Badge>;
      default: return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Adjustment</Badge>;
    }
  };

  const displayDate = (m: Movement) => {
    const d = m.date || m.createdAt;
    try { return format(new Date(d), "MMM d, yyyy"); } catch { return d; }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Movements</h1>
            <p className="text-muted-foreground mt-1">Audit log of all inventory changes</p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Record Movement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Stock Movement</DialogTitle>
                <DialogDescription>Manually log a stock check-in, checkout, or correction.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="partId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Part</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value ? String(field.value) : undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a part" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {parts?.map(p => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.modelNumber})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="in">Stock In (Receive)</SelectItem>
                              <SelectItem value="out">Stock Out (Consume)</SelectItem>
                              <SelectItem value="adjustment">Adjustment (Correction)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl><Input type="number" min="1" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes / Reason</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g. Received from supplier PO-449" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90">
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Movement
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Part</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : movements?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No stock movements recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                movements?.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {displayDate(m as Movement)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getMovementIcon(m.type)}
                        {getMovementLabel(m.type)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{m.partName}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={m.type === 'out' ? 'text-primary' : m.type === 'in' ? 'text-emerald-500' : 'text-amber-500'}>
                        {m.type === 'out' ? '-' : '+'}{m.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate" title={m.notes || ""}>
                      {m.notes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(m as Movement)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteItem(m as Movement)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stock Movement</DialogTitle>
            <DialogDescription>Update the movement details. Stock quantities will be reconciled automatically.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="in">Stock In (Receive)</SelectItem>
                          <SelectItem value="out">Stock Out (Consume)</SelectItem>
                          <SelectItem value="adjustment">Adjustment (Correction)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl><Input type="number" min="1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add a note..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                <Button type="submit" disabled={isUpdating} className="bg-primary hover:bg-primary/90">
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Movement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this movement record and reverse its effect on the part&apos;s stock quantity. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
