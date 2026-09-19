const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Store, Building2, Save, Plus, Shield, Scan, Route, Mail, ShoppingBag, Star, Wifi, RefreshCw, Palette, CalendarClock } from 'lucide-react';

const featureDefs = [
  { key: 'self_checkout', label: 'Self-Checkout Mode', icon: Scan, desc: 'Allow customers to scan and pay without a cashier' },
  { key: 'ai_loss_prevention', label: 'AI Loss Prevention', icon: Shield, desc: 'AI-monitored self-checkout for theft detection' },
  { key: 'delivery_routing', label: 'Delivery Route Optimization', icon: Route, desc: 'In-house fleet route optimization with proof-of-delivery' },
  { key: 'marketing_campaigns', label: 'SMS/Email Marketing', icon: Mail, desc: 'Run targeted marketing campaigns to customers' },
  { key: 'online_storefront', label: 'Online Storefront', icon: ShoppingBag, desc: 'BOPIS and delivery ordering for customers' },
  { key: 'loyalty_program', label: 'Loyalty Program', icon: Star, desc: 'Customer loyalty points and rewards' },
  { key: 'offline_mode', label: 'Offline POS Mode', icon: Wifi, desc: 'Continue selling during internet outages with periodic sync' },
  { key: 'accounting_sync', label: 'Accounting Sync', icon: RefreshCw, desc: 'Sync end-of-day financials to accounting software' },
  { key: 'white_label', label: 'White-Label Branding', icon: Palette, desc: 'Custom branding for your POS and storefront' },
  { key: 'shift_management', label: 'Shift Management', icon: CalendarClock, desc: 'Staff scheduling, clock-in, and shift trading' },
];

export default function Settings() {
  const { currentStore, stores, switchStore } = useStore();
  const { toast } = useToast();
  const [company, setCompany] = useState(null);
  const [storeForm, setStoreForm] = useState(null);
  const [companyForm, setCompanyForm] = useState(null);
  const [newStoreOpen, setNewStoreOpen] = useState(false);
  const [newStore, setNewStore] = useState({ name: '', address: '', city: '', phone: '', store_type: 'grocery' });

  useEffect(() => {
    (async () => {
      try {
        const companies = await db.entities.Company.list();
        if (companies.length > 0) {
          setCompany(companies[0]);
          setCompanyForm({ ...companies[0] });
        }
      } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => {
    if (currentStore) setStoreForm({ ...currentStore });
  }, [currentStore]);

  const toggleCompanyFeature = (key) => {
    setCompanyForm(prev => ({
      ...prev,
      feature_toggles: { ...(prev?.feature_toggles || {}), [key]: !prev?.feature_toggles?.[key] }
    }));
  };

  const toggleStoreFeature = (key) => {
    setStoreForm(prev => ({
      ...prev,
      feature_toggles: { ...(prev?.feature_toggles || {}), [key]: !prev?.feature_toggles?.[key] }
    }));
  };

  const saveCompany = async () => {
    try {
      await db.entities.Company.update(company.id, companyForm);
      setCompany(companyForm);
      toast({ title: 'Company settings saved' });
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const saveStore = async () => {
    try {
      await db.entities.Store.update(currentStore.id, storeForm);
      toast({ title: 'Store settings saved' });
      switchStore(storeForm);
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const createStore = async () => {
    try {
      const created = await db.entities.Store.create({
        ...newStore,
        company_id: company?.id || 'default',
        is_active: true,
        feature_toggles: { self_checkout: false, ai_loss_prevention: false, delivery_routing: false, online_storefront: false },
      });
      toast({ title: 'Store created' });
      setNewStoreOpen(false);
      setNewStore({ name: '', address: '', city: '', phone: '', store_type: 'grocery' });
      switchStore(created);
      window.location.reload();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const createCompany = async () => {
    try {
      const c = await db.entities.Company.create({
        name: 'My Retail Company',
        subscription_tier: 'professional',
        plan_type: 'per_register',
        feature_toggles: {},
        contact_email: '',
        contact_phone: '',
      });
      setCompany(c);
      setCompanyForm({ ...c });
      toast({ title: 'Company created' });
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage company, store, and feature toggle settings</p>
      </div>

      {/* Company section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Company / Tenant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!company ? (
            <Button onClick={createCompany}><Plus className="w-4 h-4 mr-2" /> Create Company</Button>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Company Name</Label><Input value={companyForm?.name || ''} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} /></div>
                <div>
                  <Label>Subscription Tier</Label>
                  <Select value={companyForm?.subscription_tier} onValueChange={(v) => setCompanyForm({ ...companyForm, subscription_tier: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plan Type</Label>
                  <Select value={companyForm?.plan_type} onValueChange={(v) => setCompanyForm({ ...companyForm, plan_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_register">Per Register</SelectItem>
                      <SelectItem value="per_user">Per User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Contact Email</Label><Input value={companyForm?.contact_email || ''} onChange={(e) => setCompanyForm({ ...companyForm, contact_email: e.target.value })} /></div>
              </div>
              <Button onClick={saveCompany}><Save className="w-4 h-4 mr-2" /> Save Company</Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Company-level feature toggles */}
      {companyForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Feature Toggles (Company Level)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featureDefs.map(f => {
                const Icon = f.icon;
                const enabled = companyForm.feature_toggles?.[f.key] || false;
                return (
                  <div key={f.key} className="flex items-start justify-between p-3 rounded-lg border border-slate-200">
                    <div className="flex gap-3 flex-1">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-slate-900">{f.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{f.desc}</div>
                      </div>
                    </div>
                    <Switch checked={enabled} onCheckedChange={() => toggleCompanyFeature(f.key)} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store section */}
      {storeForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Store className="w-5 h-5" /> Store: {currentStore?.name}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setNewStoreOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Store</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Store Name</Label><Input value={storeForm.name || ''} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} /></div>
              <div>
                <Label>Store Type</Label>
                <Select value={storeForm.store_type} onValueChange={(v) => setStoreForm({ ...storeForm, store_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grocery">Grocery</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Address</Label><Input value={storeForm.address || ''} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={storeForm.phone || ''} onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} /></div>
            </div>

            {/* Store-level overrides */}
            <div className="pt-2">
              <div className="text-sm font-medium text-slate-700 mb-3">Per-Location Overrides</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {featureDefs.filter(f => ['self_checkout','ai_loss_prevention','delivery_routing','online_storefront'].includes(f.key)).map(f => {
                  const Icon = f.icon;
                  const enabled = storeForm.feature_toggles?.[f.key] || false;
                  return (
                    <div key={f.key} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                      <div className="flex gap-2 items-center">
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium">{f.label}</span>
                      </div>
                      <Switch checked={enabled} onCheckedChange={() => toggleStoreFeature(f.key)} />
                    </div>
                  );
                })}
              </div>
            </div>

            <Button onClick={saveStore}><Save className="w-4 h-4 mr-2" /> Save Store</Button>
          </CardContent>
        </Card>
      )}

      {/* New store dialog */}
      {newStoreOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setNewStoreOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Add New Store</h3>
            <div className="space-y-3">
              <div><Label>Store Name</Label><Input value={newStore.name} onChange={(e) => setNewStore({ ...newStore, name: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={newStore.address} onChange={(e) => setNewStore({ ...newStore, address: e.target.value })} /></div>
              <div><Label>City</Label><Input value={newStore.city} onChange={(e) => setNewStore({ ...newStore, city: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={newStore.phone} onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })} /></div>
              <div>
                <Label>Store Type</Label>
                <Select value={newStore.store_type} onValueChange={(v) => setNewStore({ ...newStore, store_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grocery">Grocery</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNewStoreOpen(false)}>Cancel</Button>
              <Button onClick={createStore}>Create Store</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}