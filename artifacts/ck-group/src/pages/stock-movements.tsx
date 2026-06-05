import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useListStockMovements, 
  useListParts, 
  useCreateStockMovement,
  getListStockMovementsQueryKey,
  getListPartsQueryKey,
  StockMovementInputType
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ArrowRightLeft, TrendingUp, TrendingDown, RefreshCcw, Loader2 } from "lucide-react";
import { format } from "date-fns";

const movementSchema = z.object({
  partId: z.coerce.number().min(1, "Select a part"),
  type: z.enum(["in", "out", "adjustment"] as const),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
});

export default function StockMovementsPage() {
  const [open, setOpen] = useState(false);
  const { data: movements, isLoading } = useListStockMovements({ limit: 100 });
  const { data: parts } = useListParts({ includeDeleted: false });
  
  const createMutation = useCreateStockMovement();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof movementSchema>>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      partId: 0,
      type: "in",
      quantity: 1,
      notes: "",
    }
  });

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
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListStockMovementsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() }); // Refresh parts stock
      },
      onError: (err: any) => {
        toast({ title: "Failed to record movement", description: err.message, variant: "destructive" });
      }
    });
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Movements</h1>
            <p className="text-muted-foreground mt-1">Audit log of all inventory changes</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
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
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
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
                          <FormControl>
                            <Input type="number" min="1" {...field} />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : movements?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No stock movements recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                movements?.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(m.createdAt), "MMM d, yyyy h:mm a")}
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
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate" title={m.notes || ""}>
                      {m.notes || "—"}
                    </TableCell>
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