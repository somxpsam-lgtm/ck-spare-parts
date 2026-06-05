import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListCategories, useCreateCategory, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Tags, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function CategoriesPage() {
  const [newCategoryName, setNewCategoryName] = useState("");
  const { data: categories, isLoading } = useListCategories();
  const createMutation = useCreateCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    createMutation.mutate({
      data: { name: newCategoryName.trim() }
    }, {
      onSuccess: () => {
        setNewCategoryName("");
        toast({ title: "Category created successfully" });
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to create category", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">Manage part categories and classifications</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Add Category</CardTitle>
              <CardDescription>Create a new category for spare parts.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Input 
                    placeholder="e.g. Hydraulics, Electrical" 
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={!newCategoryName.trim() || createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tags className="h-5 w-5" />
                All Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead className="text-right pr-6">Created On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : categories?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                        No categories found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories?.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="pl-6 font-medium">{cat.name}</TableCell>
                        <TableCell className="text-right pr-6 text-muted-foreground">
                          {format(new Date(cat.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}