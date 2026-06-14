import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useListParts, 
  useListCategories, 
  useDeletePart, 
  useRestorePart,
  getListPartsQueryKey,
  ListPartsCondition,
  ListPartsStockStatus
} from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Plus, Search, Image as ImageIcon, Trash2, RotateCcw, Edit, MoreVertical } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { formatQuantity } from "@/lib/quantity";

export default function PartsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [condition, setCondition] = useState<string>("all");
  const [stockStatus, setStockStatus] = useState<string>("all");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories } = useListCategories();

  const { data: parts, isLoading } = useListParts({
    search: search || undefined,
    category: category !== "all" ? category : undefined,
    condition: condition !== "all" ? (condition as ListPartsCondition) : undefined,
    stockStatus: stockStatus !== "all" ? (stockStatus as ListPartsStockStatus) : undefined,
    includeDeleted: includeDeleted || undefined
  });

  const deleteMutation = useDeletePart();
  const restoreMutation = useRestorePart();

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this part?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Part deleted" });
        queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
      }
    });
  };

  const handleRestore = (id: number) => {
    restoreMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Part restored" });
        queryClient.invalidateQueries({ queryKey: getListPartsQueryKey() });
      }
    });
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Spare Parts</h1>
            <p className="text-muted-foreground mt-1">Manage inventory and stock levels</p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-md">
            <Link href="/parts/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Part
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search parts by name or model..." 
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map(c => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger className="w-full sm:w-[150px] bg-background">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="used">Used</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stockStatus} onValueChange={setStockStatus}>
            <SelectTrigger className="w-full sm:w-[150px] bg-background">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="ok">In Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2 shrink-0 pr-2">
            <Checkbox 
              id="includeDeleted" 
              checked={includeDeleted} 
              onCheckedChange={(c) => setIncludeDeleted(!!c)} 
            />
            <label htmlFor="includeDeleted" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Show Deleted
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[60px]">Image</TableHead>
                <TableHead>Part</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-3 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 mx-auto rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : parts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No parts found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                parts?.map((part) => {
                  const isLowStock = part.quantity > 0 && part.quantity <= part.lowStockThreshold;
                  const isOutOfStock = part.quantity === 0;
                  const isDeleted = !!part.deletedAt;
                  
                  return (
                    <TableRow key={part.id} className={isDeleted ? "opacity-60 bg-muted/20" : ""}>
                      <TableCell>
                        <div className="h-10 w-10 rounded-md overflow-hidden bg-muted flex items-center justify-center border border-border">
                          {part.imageUrls && part.imageUrls[0] ? (
                            <img src={part.imageUrls[0]} alt={part.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{part.name}</div>
                        <div className="text-xs text-muted-foreground">{part.modelNumber} {part.location && `• ${part.location}`}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{part.category}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          part.condition === "new" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }>
                          {part.condition === "new" ? "New" : "Used"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatQuantity(part.quantity, part.unit)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(part.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(part.totalValue)}</TableCell>
                      <TableCell className="text-center">
                        {isOutOfStock ? (
                          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-transparent hover:bg-destructive/20">Out of Stock</Badge>
                        ) : isLowStock ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Low Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            {isDeleted ? (
                              <DropdownMenuItem onClick={() => handleRestore(part.id)} className="text-emerald-500">
                                <RotateCcw className="mr-2 h-4 w-4" /> Restore
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link href={`/parts/${part.id}`} className="flex w-full cursor-pointer items-center">
                                    <Edit className="mr-2 h-4 w-4" /> Edit Part
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(part.id)} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}