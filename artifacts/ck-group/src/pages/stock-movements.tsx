import React, { useState, useRef, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListStockMovements,
  useListParts,
  useCreateStockMovement,
  getListStockMovementsQueryKey,
  getListPartsQueryKey,
  getGetDashboardSummaryQueryKey,
  StockMovementInputType,
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { ArrowRightLeft, TrendingUp, TrendingDown, RefreshCcw, Loader2, Pencil, Trash2, Package, Search, X } from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const movementSchema = z.object({
  partId: z.coerce.number().min(1, "Select a part"),
  type: z.enum(["in", "out", "adjustment"] as const),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
  whereUsed: z.string().optional(),
  date: z.string().optional(),
});

const editSchema = z.object({
  type: z.enum(["in", "out", "adjustment"] as const),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
  whereUsed: z.string().optional(),
  date: z.string().optional(),
});

type Movement = {
  id: number;
  partId: number;
  partName: string | null;
  type: string;
  quantity: number;
  notes: string | null;
  whereUsed?: string | null;
  date?: string | null;
  createdAt: string;
};

type Part = { id: number; name: string; modelNumber: string; quantity: number; category: string };

function PartAutocomplete({
  parts,
  value,
  onChange,
}: {
  parts: Part[];
  value: number;
  onChange: (id: number, name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = query.length === 0
    ? parts.slice(0, 10)
    : parts.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.modelNumber.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);

  const select = (p: Part) => {
    setSelectedName(p.name);
    setQuery("");
    setOpen(false);
    onChange(p.id, p.name);
  };

  const clear = () => {
    setSelectedName("");
    setQuery("");
    onChange(0, "");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedPart = parts.find(p => p.id === value);

  if (selectedName || value > 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
        <Package className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-foreground truncate block">{selectedName || selectedPart?.name}</span>
          {selectedPart && (
            <span className="text-xs text-muted-foreground">
              {selectedPart.modelNumber} · Stock: <span className={cn("font-semibold", selectedPart.quantity === 0 ? "text-destructive" : selectedPart.quantity <= 5 ? "text-amber-500" : "text-emerald-500")}>{selectedPart.quantity}</span>
            </span>
          )}
        </div>
        <button type="button" onClick={clear} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search part name or model number..."
          className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      </div>

      {open && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-60 overflow-y-auto"
        >
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b border-border/50 last:border-0"
              onMouseDown={e => { e.preventDefault(); select(p); }}
            >
              <div className="text-left min-w-0">
                <div className="font-medium text-foreground truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.modelNumber} · {p.category}</div>
              </div>
              <div className="shrink-0 ml-3 text-right">
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  p.quantity === 0
                    ? "bg-destructive/10 text-destructive"
                    : p.quantity <= 5
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-emerald-500/10 text-emerald-500"
                )}>
                  Qty: {p.quantity}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg p-3 text-sm text-muted-foreground text-center">
          No parts found matching &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}

export default function StockMovementsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Movement | null>(null);
  const [deleteItem, setDeleteItem] = useState<Movement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedPartName, setSelectedPartName] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: movements, isLoading } = useListStockMovements({ limit: 500 });
  const { data: parts } = useListParts({ includeDeleted: false });

  const createMutation = useCreateStockMovement();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof movementSchema>>({
    resolver: zodResolver(movementSchema),
    defaultValues: { partId: 0, type: "out", quantity: 1, notes: "", whereUsed: "", date: format(new Date(), "yyyy-MM-dd") },
  });

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { type: "out", quantity: 1, notes: "", whereUsed: "", date: "" },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListStockMovementsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  }, [queryClient]);

  const onSubmit = (values: z.infer<typeof movementSchema>) => {
    createMutation.mutate({
      data: {
        partId: values.partId,
        type: values.type as StockMovementInputType,
        quantity: values.quantity,
        notes: values.notes,
        whereUsed: values.whereUsed,
        date: values.date,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Movement recorded", description: `${values.type === "out" ? "Stock Out" : values.type === "in" ? "Stock In" : "Adjustment"} saved successfully` });
        setCreateOpen(false);
        form.reset({ partId: 0, type: "out", quantity: 1, notes: "", whereUsed: "", date: format(new Date(), "yyyy-MM-dd") });
        setSelectedPartName("");
        invalidate();
      },
      onError: (err: Error) => {
        toast({ title: "Failed to record movement", description: err.message, variant: "destructive" });
      },
    });
  };

  const openEdit = (m: Movement) => {
    setEditItem(m);
    editForm.reset({
      type: m.type as "in" | "out" | "adjustment",
      quantity: m.quantity,
      notes: m.notes || "",
      whereUsed: m.whereUsed || "",
      date: m.date || m.createdAt.split("T")[0],
    });
  };

  const onEditSubmit = async (values: z.infer<typeof editSchema>) => {
    if (!editItem) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/stock-movements/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${await getClerkToken()}` },
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
      const res = await fetch(`/api/stock-movements/${deleteItem.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${await getClerkToken()}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Movement deleted and stock reversed" });
      setDeleteItem(null);
      invalidate();
    } catch {
      toast({ title: "Failed to delete movement", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "in": return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1"><TrendingUp className="h-3 w-3" />Stock In</Badge>;
      case "out": return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1"><TrendingDown className="h-3 w-3" />Stock Out</Badge>;
      default: return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1"><RefreshCcw className="h-3 w-3" />Adjustment</Badge>;
    }
  };

  const displayDate = (m: Movement) => {
    const d = m.date || m.createdAt;
    try {
      const parsed = d.includes("T") ? new Date(d) : parseISO(d);
      return isToday(parsed) ? `Today, ${format(parsed, "d MMM")}` : format(parsed, "d MMM yyyy");
    } catch { return d; }
  };

  const todayIn = movements?.filter(m => {
    const d = m.date || m.createdAt;
    try { return isToday(d.includes("T") ? new Date(d) : parseISO(d)) && m.type === "in"; } catch { return false; }
  }) ?? [];
  const todayOut = movements?.filter(m => {
    const d = m.date || m.createdAt;
    try { return isToday(d.includes("T") ? new Date(d) : parseISO(d)) && m.type === "out"; } catch { return false; }
  }) ?? [];

  const filtered = filterType === "all" ? (movements ?? []) : (movements ?? []).filter(m => m.type === filterType);

  const partsList: Part[] = (parts ?? []).map(p => ({
    id: p.id,
    name: p.name,
    modelNumber: p.modelNumber,
    quantity: p.quantity,
    category: p.category,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Material/Parts Used Details</h1>
            <p className="text-muted-foreground mt-1">Daily log of parts issued, received, and adjusted</p>
          </div>

          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { form.reset({ partId: 0, type: "out", quantity: 1, notes: "", whereUsed: "", date: format(new Date(), "yyyy-MM-dd") }); setSelectedPartName(""); } }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 shadow-md">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Record Movement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Record Material / Part Movement</DialogTitle>
                <DialogDescription>Log a stock-in, stock-out, or correction. Stock quantities update automatically.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

                  {/* Part autocomplete */}
                  <FormField
                    control={form.control}
                    name="partId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Part Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <PartAutocomplete
                            parts={partsList}
                            value={field.value}
                            onChange={(id) => { field.onChange(id); }}
                          />
                        </FormControl>
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
                          <FormLabel>Movement Type <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="out">📤 Stock Out (Used)</SelectItem>
                              <SelectItem value="in">📥 Stock In (Received)</SelectItem>
                              <SelectItem value="adjustment">🔄 Adjustment</SelectItem>
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
                          <FormLabel>Quantity <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input type="number" min="1" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="whereUsed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Where Used / Purpose</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Machine #3, Line B maintenance, Pump repair..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                        <FormLabel>Notes / Remarks</FormLabel>
                        <FormControl>
                          <Textarea rows={2} placeholder="Optional additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
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

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-border bg-card">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's Out</p>
              <p className="text-3xl font-bold text-blue-500 mt-1">{todayOut.reduce((s, m) => s + m.quantity, 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{todayOut.length} transaction{todayOut.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's In</p>
              <p className="text-3xl font-bold text-emerald-500 mt-1">{todayIn.reduce((s, m) => s + m.quantity, 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{todayIn.length} transaction{todayIn.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Out (All)</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {(movements ?? []).filter(m => m.type === "out").reduce((s, m) => s + m.quantity, 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{(movements ?? []).filter(m => m.type === "out").length} records</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total In (All)</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {(movements ?? []).filter(m => m.type === "in").reduce((s, m) => s + m.quantity, 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{(movements ?? []).filter(m => m.type === "in").length} records</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          {(["all", "out", "in", "adjustment"] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                filterType === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {t === "all" ? "All Movements" : t === "out" ? "📤 Stock Out" : t === "in" ? "📥 Stock In" : "🔄 Adjustments"}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Part Name</TableHead>
                <TableHead className="text-right w-[90px]">Qty</TableHead>
                <TableHead>Where Used / Purpose</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[90px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ArrowRightLeft className="h-8 w-8 opacity-30" />
                      <p className="text-sm">No movements recorded yet.</p>
                      <p className="text-xs">Use &quot;Record Movement&quot; to log parts used or received.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground font-mono">
                      {displayDate(m as Movement)}
                    </TableCell>
                    <TableCell>{getTypeBadge(m.type)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{m.partName ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      <span className={m.type === "out" ? "text-blue-500" : m.type === "in" ? "text-emerald-500" : "text-amber-500"}>
                        {m.type === "out" ? "−" : "+"}{m.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px]">
                      {(m as Movement).whereUsed ? (
                        <span className="text-foreground font-medium truncate block" title={(m as Movement).whereUsed ?? ""}>
                          {(m as Movement).whereUsed}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate" title={m.notes || ""}>
                      {m.notes || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(m as Movement)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteItem(m as Movement)}>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Movement — {editItem?.partName}</DialogTitle>
            <DialogDescription>Stock quantities are automatically reconciled on save.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={editForm.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="out">📤 Stock Out</SelectItem>
                        <SelectItem value="in">📥 Stock In</SelectItem>
                        <SelectItem value="adjustment">🔄 Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editForm.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={editForm.control} name="whereUsed" render={({ field }) => (
                <FormItem>
                  <FormLabel>Where Used / Purpose</FormLabel>
                  <FormControl><Input placeholder="Machine, line, purpose..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Optional notes..." {...field}></Textarea></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
            <AlertDialogTitle>Delete this movement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the record for <strong>{deleteItem?.partName}</strong> and reverse its effect on stock quantity. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete & Reverse Stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

async function getClerkToken(): Promise<string | null> {
  try {
    const store = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
    return store?.session?.getToken?.() ?? null;
  } catch { return null; }
}
