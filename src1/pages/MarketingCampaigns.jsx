const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Mail, Smartphone, Trash2, Send, BarChart3 } from 'lucide-react';

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sent: 'bg-emerald-100 text-emerald-700',
};

export default function MarketingCampaigns() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', channel: 'email', subject: '', body: '', target_segment: 'all', scheduled_date: '' });

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const [c, custs] = await Promise.all([
        db.entities.MarketingCampaign.filter({ store_id: currentStore.id }, '-created_date'),
        db.entities.Customer.filter({ store_id: currentStore.id }),
      ]);
      setCampaigns(c);
      setCustomers(custs);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const getSegmentCount = (segment) => {
    if (segment === 'all') return customers.length;
    if (segment === 'loyalty') return customers.filter(c => (c.loyalty_points || 0) > 0).length;
    if (segment === 'house_account') return customers.filter(c => c.has_house_account).length;
    if (segment === 'new') return customers.slice(0, 10).length;
    return customers.length;
  };

  const save = async () => {
    if (!form.name || !form.subject || !form.body) {
      toast({ title: 'Name, subject, and body required', variant: 'destructive' });
      return;
    }
    try {
      const status = form.scheduled_date ? 'scheduled' : 'draft';
      await db.entities.MarketingCampaign.create({
        ...form,
        store_id: currentStore.id,
        status,
      });
      toast({ title: 'Campaign saved', description: `${status === 'scheduled' ? 'Scheduled' : 'Saved as draft'}` });
      setDialogOpen(false);
      setForm({ name: '', channel: 'email', subject: '', body: '', target_segment: 'all', scheduled_date: '' });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const sendNow = async (campaign) => {
    const recipients = getSegmentCount(campaign.target_segment);
    if (recipients === 0) {
      toast({ title: 'No recipients in this segment', variant: 'destructive' });
      return;
    }
    try {
      // Send emails to matching customers
      const segmentCustomers = campaign.target_segment === 'all' ? customers
        : campaign.target_segment === 'loyalty' ? customers.filter(c => (c.loyalty_points || 0) > 0)
        : campaign.target_segment === 'house_account' ? customers.filter(c => c.has_house_account)
        : customers.slice(0, 10);

      let sentCount = 0;
      for (const c of segmentCustomers) {
        if (campaign.channel === 'email' && c.email) {
          try {
            await db.integrations.Core.SendEmail({
              to: c.email,
              subject: campaign.subject,
              body: campaign.body,
            });
            sentCount++;
          } catch (e) { console.error('Email failed', c.email, e); }
        }
      }
      await db.entities.MarketingCampaign.update(campaign.id, { status: 'sent', sent_count: sentCount || recipients });
      toast({ title: 'Campaign sent', description: `${sentCount} recipients reached` });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    await db.entities.MarketingCampaign.delete(c.id);
    load();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing Campaigns</h1>
          <p className="text-slate-500 text-sm mt-1">Draft, schedule, and track promotional emails and SMS</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Campaign</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-sm text-slate-500">Total Campaigns</div><div className="text-2xl font-bold">{campaigns.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-slate-500">Sent</div><div className="text-2xl font-bold text-emerald-600">{campaigns.filter(c => c.status === 'sent').length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-slate-500">Scheduled</div><div className="text-2xl font-bold text-blue-600">{campaigns.filter(c => c.status === 'scheduled').length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-slate-500">Total Recipients</div><div className="text-2xl font-bold">{campaigns.reduce((s, c) => s + (c.sent_count || 0), 0)}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Recipients</TableHead>
                <TableHead className="text-right">Opens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500 truncate max-w-xs">{c.subject}</div>
                  </TableCell>
                  <TableCell>{c.channel === 'email' ? <Mail className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}</TableCell>
                  <TableCell className="capitalize">{c.target_segment}</TableCell>
                  <TableCell className="text-right">{c.sent_count || getSegmentCount(c.target_segment)}</TableCell>
                  <TableCell className="text-right">{c.open_count || 0}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status]}`}>{c.status}</span></TableCell>
                  <TableCell className="text-slate-500 text-sm">{c.scheduled_date ? new Date(c.scheduled_date).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {c.status !== 'sent' && <Button size="sm" onClick={() => sendNow(c)}><Send className="w-3.5 h-3.5 mr-1" /> Send</Button>}
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(c)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {campaigns.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No campaigns yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Campaign Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email"><Mail className="w-4 h-4 mr-2" /> Email</SelectItem>
                    <SelectItem value="sms"><Smartphone className="w-4 h-4 mr-2" /> SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Segment</Label>
                <Select value={form.target_segment} onValueChange={(v) => setForm({ ...form, target_segment: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers ({customers.length})</SelectItem>
                    <SelectItem value="loyalty">Loyalty Members ({getSegmentCount('loyalty')})</SelectItem>
                    <SelectItem value="house_account">House Account ({getSegmentCount('house_account')})</SelectItem>
                    <SelectItem value="new">New Customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Subject</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div><Label>Body</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div><Label>Schedule Date (optional)</Label><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}