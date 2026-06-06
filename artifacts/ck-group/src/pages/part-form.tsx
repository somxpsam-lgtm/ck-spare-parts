import React, { useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useGetPart, 
  useCreatePart, 
  useUpdatePart, 
  useListCategories,
  getGetPartQueryKey,
  PartInputCondition,
  PartUpdateCondition
} from "@workspace/api-client-react";
import { useParams, useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";

const partSchema = z.object({
  name: z.string().min(1, "Name is required"),
  modelNumber: z.string().min(1, "Model number is required"),
  location: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  condition: z.enum(["new", "used"] as const),
  quantity: z.coerce.number().min(0, "Must be positive"),
  unitPrice: z.coerce.number().min(0, "Must be positive"),
  lowStockThreshold: z.coerce.number().min(0, "Must be positive"),
  imageUrls: z.array(z.string()).default([]),
});

export default function PartFormPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const isNew = !id || id === "new";
  const partId = isNew ? 0 : parseInt(id, 10);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories } = useListCategories();
  const { data: part, isLoading: isLoadingPart } = useGetPart(partId, { 
    query: { enabled: !isNew && !!partId, queryKey: getGetPartQueryKey(partId) } 
  });

  const createMutation = useCreatePart();
  const updateMutation = useUpdatePart();

  const form = useForm<z.infer<typeof partSchema>>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      name: "",
      modelNumber: "",
      location: "",
      category: "",
      condition: "new",
      quantity: 0,
      unitPrice: 0,
      lowStockThreshold: 5,
      imageUrls: [],
    }
  });

  useEffect(() => {
    if (part && !isNew) {
      form.reset({
        name: part.name,
        modelNumber: part.modelNumber,
        location: part.location || "",
        category: part.category,
        condition: part.condition,
        quantity: part.quantity,
        unitPrice: part.unitPrice,
        lowStockThreshold: part.lowStockThreshold,
        imageUrls: part.imageUrls ?? [],
      });
    }
  }, [part, isNew, form]);

  const onSubmit = (values: z.infer<typeof partSchema>) => {
    if (isNew) {
      createMutation.mutate({
        data: {
          ...values,
          imageUrls: values.imageUrls,
          condition: values.condition as PartInputCondition,
        }
      }, {
        onSuccess: () => {
          toast({ title: "Part created successfully" });
          setLocation("/parts");
        }
      });
    } else {
      updateMutation.mutate({
        id: partId,
        data: {
          ...values,
          imageUrls: values.imageUrls,
          condition: values.condition as PartUpdateCondition,
        }
      }, {
        onSuccess: () => {
          toast({ title: "Part updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetPartQueryKey(partId) });
          setLocation("/parts");
        }
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoadingPart) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unitPrice");
  const totalValue = (quantity || 0) * (unitPrice || 0);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-9 w-9">
            <Link href="/parts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{isNew ? "Add New Part" : "Edit Part"}</h1>
            <p className="text-sm text-muted-foreground">{isNew ? "Enter details for a new inventory item" : `Editing details for ${part?.name}`}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Part Details</CardTitle>
            <CardDescription>Comprehensive information about the spare part.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Part Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Hydraulic Pump X1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="modelNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model / Part Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. PMP-459-B" {...field} />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
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

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Storage Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Rack A, Shelf 3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Condition</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                            className="flex flex-row space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="new" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">New</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="used" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">Used / Refurbished</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="imageUrls"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Part Images</FormLabel>
                        <FormControl>
                          <ImageUploader
                            value={field.value}
                            onChange={field.onChange}
                            maxImages={5}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2 border-t border-border pt-6 mt-2">
                    <h3 className="text-sm font-medium mb-4 text-foreground">Stock & Pricing</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lowStockThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Low Stock Alert At</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
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
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 bg-muted/50 p-4 rounded-lg flex items-center justify-between border border-border">
                    <span className="text-sm font-medium text-muted-foreground">Total Stock Value</span>
                    <span className="text-xl font-bold text-primary">₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-4 border-t border-border pt-6">
                  <Button variant="outline" type="button" asChild>
                    <Link href="/parts">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    {isNew ? "Create Part" : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
