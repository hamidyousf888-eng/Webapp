const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, FileText, MessageSquare, Check, X, Mail } from 'lucide-react';

const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-700',
};

export default function SupplierPortal() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(null);
  const [form, setForm] = useState({ supplier_id: '', product_name: '', unit_cost: 0, moq: 1, lead_time_days: 7, valid_until: '', notes: '' });
  const [comm, setComm] = useState({ channel: 'email', subject: '', notes: '' });

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const [q, s, p] = await Promise.all([
        db.entities.SupplierQuote.filter({ store_id: currentStore.id }, '-created_date'),
        db.entities.Supplier.filter({ store_id: currentStore.id }),
        db.entities.Product.filter({ store_id: currentStore.id }),
      ]);
      setQuotes(q);
      setSuppliers(s);
      setProducts(p);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const save = async () => {
    if (!form.supplier_id || !form.product_name || form.unit_cost <= 0) {
      toast({ title: 'Supplier, product, and cost required', variant: 'destructive' });
      return;
    }
    try {
      const supplier = suppliers.find(s => s.id === form.supplier_id);
      await db.entities.SupplierQuote.create({
        ...form,
        supplier_name: supplier.name,
        store_id: currentStore.id,
        status: 'pending',
      });
      toast({ title: 'Quote recorded' });
      setDialogOpen(false);
      setForm({ supplier_id: '', product_name: '', unit_cost: 0, moq: 1, lead_time_days: 7, valid_until: '', notes: '' });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const updateStatus = async (quote, status) => {
    await db.entities.SupplierQuote.update(quote.id, { status });
    toast({ title: `Quote ${status}` });
    load();
  };

  const addComm = async () => {
    if (!comm.subject) return;
    try {
      const updated = [...(commOpen.communications || []), { ...comm, date: new Date().toISOString(), by_user: 'Staff' }];
      await db.entities.SupplierQuote.update(commOpen.id, { communications: updated });
      toast({ title: 'Communication logged' });
      setCommOpen(null);
      setComm({ channel: 'email', subject: '', notes: '' });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Compare quotes for same product
  const comparison = {};
  quotes.forEach(q => {
    const key = q.product_name;
    if (!comparison[key]) comparison[key] = [];
    comparison[key].push(q);
  });

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Compare vendor quotations and track communication history</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Record Quote</Button>
      </div>

      {/* Price comparison cards */}
      {Object.keys(comparison).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(comparison).filter(([, qs]) => qs.length > 0).map(([product, qs]) => {
            const best = qs.reduce((min, q) => q.unit_cost < min.unit_cost ? q : min, qs[0]);
            return (
              <Card key={product}><CardContent className="p-4">
                <div className="text-sm font-medium text-slate-900 mb-1">{product}</div>
                <div className="text-xs text-slate-500 mb-2">{qs.length} quote{qs.length > 1 ? 's' : ''}</div>
                <div className="space-y-1">
                  {qs.sort((a, b) => a.unit_cost - b.unit_cost).map(q => (
                    <div key={q.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{q.supplier_name}</span>
                      <span className={q.id === best.id ? 'font-bold text-emerald-600' : 'text-slate-600'}>${q.unit_cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">MOQ</TableHead>
                <TableHead>Lead Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map(q => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.supplier_name}</TableCell>
                  <TableCell>{q.product_name}</TableCell>
                  <TableCell className="text-right font-medium">${(q.unit_cost || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{q.moq}</TableCell>
                  <TableCell>{q.lead_time_days}d</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[q.status]}`}>{q.status}</span></TableCell>
                  <TableCell className="text-slate-500 text-sm">{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Log communication" onClick={() => setCommOpen(q)}><MessageSquare className="w-4 h-4" /></Button>
                      {q.status === 'pending' && (
                        <>
                          <Button variant="ghost" size="icon" className="text-emerald-600" onClick={() => updateStatus(q, 'approved')}><Check className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => updateStatus(q, 'rejected')}><X className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {quotes.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No quotes recorded yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Supplier Quote</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Supplier</Label>
              <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Product</Label>
              <Select value={form.product_name} onValueChange={(v) => setForm({ ...form, product_name: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Unit Cost ($)</Label><Input type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>MOQ</Label><Input type="number" value={form.moq} onChange={(e) => setForm({ ...form, moq: parseInt(e.target.value) || 1 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Lead Time (days)</Label><Input type="number" value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save Quote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!commOpen} onOpenChange={(o) => !o && setCommOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
          {commOpen && (
            <div className="space-y-3">
              <div className="text-sm text-slate-500">{commOpen.supplier_name} — {commOpen.product_name}</div>
              {/* Existing communications */}
              {(commOpen.communications || []).length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {(commOpen.communications || []).map((c, i) => (
                    <div key={i} className="text-xs p-2 rounded bg-slate-50">
                      <div className="flex items-center gap-1 font-medium">
                        <Mail className="w-3 h-3" /> {c.channel} — {c.subject}
                      </div>
                      <div className="text-slate-500">{new Date(c.date).toLocaleDateString()}: {c.notes}</div>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <Label>Channel</Label>
                <Select value={comm.channel} onValueChange={(v) => setComm({ ...comm, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['email', 'phone', 'meeting', 'note'].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Subject</Label><Input value={comm.subject} onChange={(e) => setComm({ ...comm, subject: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={comm.notes} onChange={(e) => setComm({ ...comm, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommOpen(null)}>Close</Button>
            <Button onClick={addComm}>Add Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}