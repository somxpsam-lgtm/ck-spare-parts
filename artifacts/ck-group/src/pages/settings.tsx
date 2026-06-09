import React, { useRef, useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { HardDriveDownload, Save, Settings2, Upload, X, Building2, Loader2, Receipt, Phone, Mail } from "lucide-react";
import { useAuth } from "@clerk/react";

function useSettings(userId: string | null | undefined) {
  const key = userId ? `ck_settings_${userId}` : null;
  const load = () => {
    if (!key) return { companyName: "CK Group", companyAddress: "Industrial Area, Phase 1", logoUrl: "", gstNumber: "", contactPhone: "", contactEmail: "" };
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; }
  };
  const [settings, setSettings] = useState(load);
  const save = (update: Record<string, string>) => {
    if (!key) return;
    const next = { ...settings, ...update };
    setSettings(next);
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(new Event("ck-settings-updated"));
  };
  return { settings, save };
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { userId } = useAuth();
  const { settings, save } = useSettings(userId);
  const [companyName, setCompanyName] = useState(settings.companyName || "CK Group");
  const [companyAddress, setCompanyAddress] = useState(settings.companyAddress || "Industrial Area, Phase 1");
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || "");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // New fields
  const [gstNumber, setGstNumber] = useState(settings.gstNumber || "");
  const [contactPhone, setContactPhone] = useState(settings.contactPhone || "");
  const [contactEmail, setContactEmail] = useState(settings.contactEmail || "");

  useEffect(() => {
    setCompanyName(settings.companyName || "CK Group");
    setCompanyAddress(settings.companyAddress || "Industrial Area, Phase 1");
    setLogoUrl(settings.logoUrl || "");
    setGstNumber(settings.gstNumber || "");
    setContactPhone(settings.contactPhone || "");
    setContactEmail(settings.contactEmail || "");
  }, [userId]);

  const handleSave = () => {
    save({ companyName, companyAddress, logoUrl, gstNumber, contactPhone, contactEmail });
    toast({ title: "Settings saved successfully" });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setLogoUrl(data.url);
      save({ companyName, companyAddress, logoUrl: data.url, gstNumber, contactPhone, contactEmail });
      toast({ title: "Logo uploaded successfully" });
    } catch {
      toast({ title: "Logo upload failed", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleRemoveLogo = () => {
    const filename = logoUrl.split("/").pop();
    if (filename) fetch(`/api/uploads/${filename}`, { method: "DELETE" }).catch(() => {});
    setLogoUrl("");
    save({ companyName, companyAddress, logoUrl: "", gstNumber, contactPhone, contactEmail });
    toast({ title: "Logo removed" });
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

        {/* Company Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Logo
            </CardTitle>
            <CardDescription>Upload your company logo to display in the sidebar and dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              {/* Preview */}
              <div className="flex-shrink-0 h-24 w-24 rounded-xl border-2 border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Company logo" className="h-full w-full object-contain p-1" />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>

              <div className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Supported formats: PNG, JPG, JPEG, WEBP — max 10 MB
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                    ) : (
                      <><Upload className="mr-2 h-4 w-4" />{logoUrl ? "Change Logo" : "Upload Logo"}</>
                    )}
                  </Button>
                  {logoUrl && (
                    <Button type="button" variant="outline" onClick={handleRemoveLogo} className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60">
                      <X className="mr-2 h-4 w-4" />Remove Logo
                    </Button>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Company Profile</CardTitle>
            <CardDescription>These details appear on reports and exports.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Input id="currency" defaultValue="INR (₹)" disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Registered Address</Label>
                <Input id="address" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" />Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Business Contact & Tax Details (new) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Business Contact &amp; Tax Details
            </CardTitle>
            <CardDescription>GST number and contact info printed on reports and invoices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="gstNumber" className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                  GST Number
                </Label>
                <Input
                  id="gstNumber"
                  value={gstNumber}
                  onChange={e => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                  maxLength={15}
                  className="font-mono tracking-wider"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Contact Phone
                </Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  type="tel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Contact Email
                </Label>
                <Input
                  id="contactEmail"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="accounts@company.com"
                  type="email"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
                <Save className="mr-2 h-4 w-4" />Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
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

        {/* Advanced */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-muted-foreground flex items-center gap-2">
              <Settings2 className="h-5 w-5" />Advanced Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
              <div>
                <p className="font-medium text-foreground">Database Backup</p>
                <p className="text-sm text-muted-foreground">Export all inventory and movement data</p>
              </div>
              <Button variant="outline" className="shrink-0" onClick={() => toast({ title: "Backup started. This may take a moment." })}>
                <HardDriveDownload className="mr-2 h-4 w-4" />Download CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
