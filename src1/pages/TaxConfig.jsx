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
import { Plus, Trash2, Percent, Star, Pencil } from 'lucide-react';

const appliesToColors = {
  all: 'bg-slate-100 text-slate-700',
  grocery: 'bg-emerald-100 text-emerald-700',
  pharmacy: 'bg-blue-100 text-blue-700',
  specific: 'bg-purple-100 text-purple-700',
};

export default function TaxConfig() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', region: '', rate: 0, is_default: false, applies_to: 'all', is_active: true, notes: '' });

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const list = await db.entities.TaxConfig.filter({ store_id: currentStore.id }, '-created_date');
      setConfigs(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const openNew = () => { setEditing(null); setForm({ name: '', category: '', region: '', rate: 0, is_default: false, applies_to: 'all', is_active: true, notes: '' }); setDialogOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, category: c.category || '', region: c.region || '', rate: c.rate, is_default: c.is_default, applies_to: c.applies_to, is_active: c.is_active, notes: c.notes || '' }); setDialogOpen(true); };

  const save = async () => {
    if (!form.name || form.rate < 0) {
      toast({ title: 'Name required and rate must be valid', variant: 'destructive' });
      return;
    }
    try {
      // If setting as default, unset other defaults
      if (form.is_default) {
        const existing = configs.filter(c => c.is_default && c.id !== editing?.id);
        for (const c of existing) {
          await db.entities.TaxConfig.update(c.id, { is_default: false });
        }
      }
      if (editing) {
        await db.entities.TaxConfig.update(editing.id, { ...form, store_id: currentStore.id });
        toast({ title: 'Tax rule updated' });
      } else {
        await db.entities.TaxConfig.create({ ...form, store_id: currentStore.id });
        toast({ title: 'Tax rule created' });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete tax rule "${c.name}"?`)) return;
    await db.entities.TaxConfig.delete(c.id);
    load();
  };

  const toggleActive = async (c) => {
    await db.entities.TaxConfig.update(c.id, { is_active: !c.is_active });
    load();
  };

  const defaultRate = configs.find(c => c.is_default);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Percent className="w-6 h-6" /> Tax Configuration</h1>
          <p className="text-slate-500 text-sm mt-1">Define tax rates by category, region, or business requirement</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Tax Rule</Button>
      </div>

      {defaultRate && (
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Star className="w-5 h-5 text-amber-500" />
          <div>
            <div className="text-sm text-slate-500">Default Tax Rate</div>
            <div className="text-lg font-bold">{defaultRate.name} — {(defaultRate.rate || 0).toFixed(2)}%</div>
          </div>
        </CardContent></Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-slate-500">{c.category || '-'}</TableCell>
                  <TableCell className="text-slate-500">{c.region || '-'}</TableCell>
                  <TableCell className="text-right font-bold">{(c.rate || 0).toFixed(2)}%</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${appliesToColors[c.applies_to]}`}>{c.applies_to}</span></TableCell>
                  <TableCell>{c.is_default && <Star className="w-4 h-4 text-amber-500" />}</TableCell>
                  <TableCell>
                    <button onClick={() => toggleActive(c)}>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(c)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {configs.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  <Percent className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No tax rules configured
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Tax Rule' : 'Add Tax Rule'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input placeholder="e.g. Standard Sales Tax" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label><Input placeholder="e.g. Groceries, Medicine" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Region</Label><Input placeholder="e.g. State, County" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
            </div>
            <div><Label>Rate (%)</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} /></div>
            <div>
              <Label>Applies To</Label>
              <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="grocery">Grocery Only</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy Only</SelectItem>
                  <SelectItem value="specific">Specific Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="is_default" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="is_default" className="text-sm font-normal">Set as default tax rate</Label>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}