'use client';

import {
  Bell,
  Shield,
  Palette,
  Globe,
  CreditCard,
  Truck,
  Mail,
  Save,
  Loader2,
  Building2,
  Smartphone,
  Store,
  QrCode,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/shared/ui/toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = async (section: string) => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast({
      title: 'Settings saved (mock)',
      description: `${section} settings have been updated. Backend endpoints coming soon.`,
    });
  };

  const ComingSoon = ({ title }: { title: string }) => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            Mock
          </Badge>
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This section will be wired once the corresponding admin API endpoints exist.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your store configuration</p>
        <Badge variant="outline" className="w-fit text-xs">
          Mock implementation &mdash; backend endpoints not yet implemented
        </Badge>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>Basic store details and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input id="storeName" defaultValue="Toko" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeSlug">Store Slug</Label>
                  <Input id="storeSlug" defaultValue="toko" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeDescription">Description</Label>
                <Textarea
                  id="storeDescription"
                  defaultValue="Welcome to Toko - your trusted online marketplace"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeEmail">Contact Email</Label>
                <Input id="storeEmail" type="email" defaultValue="admin@toko.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storePhone">Contact Phone</Label>
                <Input id="storePhone" defaultValue="+62 21 1234 5678" />
              </div>
              <Separator />
              <Button onClick={() => handleSave('General')} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Localization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select defaultValue="IDR">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="Asia/Jakarta">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Jakarta">WIB - Asia/Jakarta (UTC+7)</SelectItem>
                      <SelectItem value="Asia/Makassar">WITA - Asia/Makassar (UTC+8)</SelectItem>
                      <SelectItem value="Asia/Jayapura">WIT - Asia/Jayapura (UTC+9)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Default Language</Label>
                  <Select defaultValue="id">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id">Indonesian</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select defaultValue="DD/MM/YYYY">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>New Order Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email when a new order is placed
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Order Status Changes</Label>
                  <p className="text-sm text-muted-foreground">
                    Email customer when order status updates
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when product stock falls below threshold
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Daily Sales Summary</Label>
                  <p className="text-sm text-muted-foreground">Receive end-of-day sales report</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Customize transactional email templates (coming soon).
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" size="sm">
                  Order Confirmation
                </Button>
                <Button variant="outline" size="sm">
                  Shipping Update
                </Button>
                <Button variant="outline" size="sm">
                  Delivery Confirmation
                </Button>
                <Button variant="outline" size="sm">
                  Refund Notice
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all admin accounts
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">
                      Auto-logout after inactivity (minutes)
                    </p>
                  </div>
                  <Input type="number" defaultValue={60} className="w-24" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Password Expiry</Label>
                    <p className="text-sm text-muted-foreground">
                      Force password change every N days (0 = never)
                    </p>
                  </div>
                  <Input type="number" defaultValue={90} className="w-24" />
                </div>
              </div>
              <Button variant="outline" onClick={() => handleSave('Security')} disabled={saving}>
                Save Security Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage API keys and webhook secrets (coming soon).
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Generate New API Key
                </Button>
                <Button variant="outline" size="sm">
                  Rotate Webhook Secrets
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateway</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gatewayProvider">Provider</Label>
                <Select defaultValue="midtrans">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midtrans">Midtrans</SelectItem>
                    <SelectItem value="xendit">Xendit</SelectItem>
                    <SelectItem value="doku">DOKU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchantId">Merchant ID</Label>
                <Input id="merchantId" placeholder="Your merchant ID" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientKey">Client Key</Label>
                <Input id="clientKey" type="password" placeholder="Client key" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serverKey">Server Key</Label>
                <Input id="serverKey" type="password" placeholder="Server key" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sandbox Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use test environment for development
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button variant="outline" onClick={() => handleSave('Payments')} disabled={saving}>
                Save Payment Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'Credit Card',
                  'Bank Transfer',
                  'VA (BRI, BNI, Mandiri)',
                  'E-Wallet (GoPay, OVO, DANA)',
                  'QRIS',
                  'Convenience Store (Alfamart, Indomaret)',
                ].map((method) => (
                  <div key={method} className="flex items-center gap-2 rounded-lg border p-2">
                    <Switch defaultChecked className="shrink-0" />
                    <Label className="cursor-pointer text-sm">{method}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping */}
        <TabsContent value="shipping">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Zones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure shipping regions and rates (coming soon).
              </p>
              <Button variant="outline" size="sm">
                Add Zone
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Courier Integrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {['JNE', 'J&T Express', 'Sicepat', 'Ninja Xpress', 'Wahana', 'Pos Indonesia'].map(
                  (courier) => (
                    <div key={courier} className="flex items-center gap-2 rounded-lg border p-2">
                      <Switch className="shrink-0" />
                      <Label className="cursor-pointer text-sm">{courier}</Label>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Free Shipping Threshold</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="freeShippingMin">Minimum Order (Rp)</Label>
                  <Input id="freeShippingMin" type="number" defaultValue={250000} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freeShippingZones">Applicable Zones</Label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="All zones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All zones</SelectItem>
                      <SelectItem value="java">Java</SelectItem>
                      <SelectItem value="sumatra">Sumatra</SelectItem>
                      <SelectItem value="kalimantan">Kalimantan</SelectItem>
                      <SelectItem value="sulawesi">Sulawesi</SelectItem>
                      <SelectItem value="papua">Papua</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Multi-zone selection coming with backend support.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
