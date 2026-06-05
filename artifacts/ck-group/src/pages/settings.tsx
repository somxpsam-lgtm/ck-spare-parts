import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { HardDriveDownload, Save, Settings2 } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: "Settings saved successfully" });
  };

  const handleThemeToggle = () => {
    document.documentElement.classList.toggle("dark");
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure company details and app preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Profile</CardTitle>
            <CardDescription>These details appear on reports and exports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" defaultValue="CK Group" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Input id="currency" defaultValue="INR (₹)" disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Registered Address</Label>
                <Input id="address" defaultValue="Industrial Area, Phase 1" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Toggle between light and dark interface</p>
              </div>
              <Switch id="dark-mode" defaultChecked onCheckedChange={handleThemeToggle} />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">Show warnings on dashboard</p>
              </div>
              <Switch id="alerts" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-muted-foreground flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> Advanced Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
              <div>
                <p className="font-medium text-foreground">Database Backup</p>
                <p className="text-sm text-muted-foreground">Export all inventory and movement data</p>
              </div>
              <Button variant="outline" className="shrink-0" onClick={() => toast({ title: "Backup started. This may take a moment." })}>
                <HardDriveDownload className="mr-2 h-4 w-4" /> Download CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}