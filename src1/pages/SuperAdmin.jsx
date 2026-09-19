const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Crown, Check, X, Users, DollarSign, ToggleLeft, UserPlus, Loader2, AlertTriangle, CalendarClock, CalendarX } from 'lucide-react';

const tierColors = {
  starter: 'bg-slate-100 text-slate-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

export default function SuperAdmin() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({
    company_name: '', contact_email: '', store_name: '', admin_email: '',
    subscription_tier: 'starter', plan_type: 'per_register',
    subscription_expiry: '', expiry_alert_message: '', use_custom_message: false,
  });

  const DEFAULT_ALERT_TEMPLATE = 'Your subscription is expiring soon. Please renew to avoid service interruption.';

  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        db.entities.Company.list('-created_date', 200),
        db.entities.Store.list('-created_date', 500),
      ]);
      setCompanies(c); setStores(s);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = companies.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  const storeCount = (companyId) => stores.filter(s => s.company_id === companyId).length;

  const toggleFeature = async (company, feature) => {
    const toggles = { ...(company.feature_toggles || {}), [feature]: !company.feature_toggles?.[feature] };
    await db.entities.Company.update(company.id, { feature_toggles: toggles });
    toast({ title: `${feature} ${toggles[feature] ? 'enabled' : 'disabled'} for ${company.name}` });
    load();
  };

  const changeTier = async (company, tier) => {
    await db.entities.Company.update(company.id, { subscription_tier: tier });
    toast({ title: `${company.name} moved to ${tier}` });
    load();
  };

  const platformFeatures = [
    { key: 'self_checkout', label: 'Self-Checkout' },
    { key: 'ai_loss_prevention', label: 'AI Loss Prevention' },
    { key: 'delivery_routing', label: 'Delivery Routing' },
    { key: 'marketing_campaigns', label: 'Marketing' },
    { key: 'online_storefront', label: 'Online Storefront' },
    { key: 'loyalty_program', label: 'Loyalty Program' },
    { key: 'offline_mode', label: 'Offline Mode' },
    { key: 'accounting_sync', label: 'Accounting Sync' },
    { key: 'white_label', label: 'White Label' },
    { key: 'shift_management', label: 'Shift Management' },
  ];

  const getExpiryStatus = (company) => {
    if (!company.subscription_expiry) return null;
    const expiry = new Date(company.subscription_expiry);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { status: 'expired', days: diffDays };
    if (diffDays <= 30) return { status: 'expiring', days: diffDays };
    return { status: 'active', days: diffDays };
  };

  const expiringCompanies = companies.filter(c => {
    const s = getExpiryStatus(c);
    return s && (s.status === 'expired' || s.status === 'expiring');
  });

  const tierCounts = {
    starter: companies.filter(c => c.subscription_tier === 'starter').length,
    professional: companies.filter(c => c.subscription_tier === 'professional').length,
    enterprise: companies.filter(c => c.subscription_tier === 'enterprise').length,
  };

  const inviteCompany = async () => {
    if (!form.company_name || !form.contact_email || !form.store_name || !form.admin_email) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    setInviting(true);
    try {
      // 1. Create the company (tenant)
      const company = await db.entities.Company.create({
        name: form.company_name,
        contact_email: form.contact_email,
        subscription_tier: form.subscription_tier,
        plan_type: form.plan_type,
        subscription_expiry: form.subscription_expiry || null,
        expiry_alert_message: form.expiry_alert_message || null,
      });
      // 2. Create their first store
      await db.entities.Store.create({
        name: form.store_name,
        company_id: company.id,
        store_type: 'grocery',
      });
      // 3. Invite the client as an admin so they can log in and manage their store
      await db.users.inviteUser(form.admin_email, 'admin');
      toast({ title: `${form.company_name} invited successfully` });
      setShowInvite(false);
      setForm({ company_name: '', contact_email: '', store_name: '', admin_email: '', subscription_tier: 'starter', plan_type: 'per_register', subscription_expiry: '', expiry_alert_message: '', use_custom_message: false });
      load();
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to invite company', description: e.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <Crown className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
        </div>
        <p className="text-slate-500 text-sm mt-1">Platform-wide oversight of all subscriber companies and feature toggles</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Building2 className="w-4 h-4" /> Total Companies</div>
          <div className="text-2xl font-bold text-slate-900">{companies.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Users className="w-4 h-4" /> Total Stores</div>
          <div className="text-2xl font-bold text-slate-900">{stores.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><DollarSign className="w-4 h-4" /> Enterprise</div>
          <div className="text-2xl font-bold text-purple-600">{tierCounts.enterprise}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><ToggleLeft className="w-4 h-4" /> Professional</div>
          <div className="text-2xl font-bold text-blue-600">{tierCounts.professional}</div>
        </CardContent></Card>
      </div>

      {expiringCompanies.length > 0 && (
        <div className="space-y-2">
          {expiringCompanies.map(c => {
            const s = getExpiryStatus(c);
            const isExpired = s.status === 'expired';
            return (
              <div key={c.id} className={`flex items-start gap-3 rounded-lg border p-3 ${isExpired ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
                {isExpired ? <CalendarX className="w-5 h-5 text-red-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <div className={`font-semibold text-sm ${isExpired ? 'text-red-800' : 'text-amber-800'}`}>
                    {c.name} — {isExpired ? 'Subscription Expired' : `Subscription expiring in ${s.days} day${s.days === 1 ? '' : 's'}`}
                  </div>
                  <div className={`text-sm mt-0.5 ${isExpired ? 'text-red-700' : 'text-amber-700'}`}>
                    {c.expiry_alert_message || 'Your subscription is expiring soon. Please renew to avoid service interruption.'}
                  </div>
                  {c.subscription_expiry && <div className={`text-xs mt-1 ${isExpired ? 'text-red-500' : 'text-amber-500'}`}>Expiry date: {new Date(c.subscription_expiry).toLocaleDateString()}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button onClick={() => setShowInvite(true)} className="ml-auto">
          <UserPlus className="w-4 h-4" /> Invite Company
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Stores</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Platform Features</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium flex items-center gap-2">
                      {c.logo_url ? <img src={c.logo_url} alt="" className="w-6 h-6 rounded object-cover" /> : <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">{c.name?.[0]}</div>}
                      {c.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={c.subscription_tier} onValueChange={(v) => changeTier(c, v)}>
                      <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(tierColors).map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-slate-500 capitalize text-sm">{c.plan_type?.replace('_', ' ') || '-'}</TableCell>
                  <TableCell>
                    {(() => {
                      const s = getExpiryStatus(c);
                      if (!c.subscription_expiry) return <span className="text-slate-300 text-sm">—</span>;
                      const dateStr = new Date(c.subscription_expiry).toLocaleDateString();
                      if (s.status === 'expired') return <Badge variant="destructive" className="gap-1"><CalendarX className="w-3 h-3" />{dateStr}</Badge>;
                      if (s.status === 'expiring') return <Badge className="bg-amber-100 text-amber-700 gap-1"><AlertTriangle className="w-3 h-3" />{dateStr}</Badge>;
                      return <span className="text-slate-500 text-sm flex items-center gap-1"><CalendarClock className="w-3 h-3" />{dateStr}</span>;
                    })()}
                  </TableCell>
                  <TableCell className="text-right font-medium">{storeCount(c.id)}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{c.contact_email || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {platformFeatures.map(f => {
                        const on = c.feature_toggles?.[f.key];
                        return (
                          <button key={f.key} onClick={() => toggleFeature(c, f.key)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${on ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                            {on && <Check className="w-3 h-3 inline mr-0.5" />}{f.label}
                          </button>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No companies found
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a New Company</DialogTitle>
            <DialogDescription>Create a tenant, their first store, and invite the client admin to log in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Acme Grocers Inc." />
            </div>
            <div className="space-y-1.5">
              <Label>Company Contact Email</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="billing@acme.com" />
            </div>
            <div className="space-y-1.5">
              <Label>First Store Name</Label>
              <Input value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} placeholder="Acme Downtown" />
            </div>
            <div className="space-y-1.5">
              <Label>Client Admin Email (login invite)</Label>
              <Input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} placeholder="owner@acme.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Subscription Tier</Label>
                <Select value={form.subscription_tier} onValueChange={(v) => setForm({ ...form, subscription_tier: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Plan Type</Label>
                <Select value={form.plan_type} onValueChange={(v) => setForm({ ...form, plan_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_register">Per Register</SelectItem>
                    <SelectItem value="per_user">Per User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Subscription Expiry Date</Label>
              <Input type="date" value={form.subscription_expiry} onChange={(e) => setForm({ ...form, subscription_expiry: e.target.value })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Expiry Alert Message</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{form.use_custom_message ? 'Custom' : 'Default template'}</span>
                  <Switch checked={form.use_custom_message} onCheckedChange={(v) => setForm({ ...form, use_custom_message: v, expiry_alert_message: v ? '' : '' })} />
                </div>
              </div>
              {form.use_custom_message ? (
                <Input value={form.expiry_alert_message} onChange={(e) => setForm({ ...form, expiry_alert_message: e.target.value })} placeholder="Enter a custom alert message..." />
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">{DEFAULT_ALERT_TEMPLATE}</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)} disabled={inviting}>Cancel</Button>
            <Button onClick={inviteCompany} disabled={inviting}>
              {inviting ? <><Loader2 className="w-4 h-4 animate-spin" /> Inviting...</> : <><UserPlus className="w-4 h-4" /> Invite Company</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}