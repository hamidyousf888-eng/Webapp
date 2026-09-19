const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

const empty = { name: '', type: 'percentage', value: 0, start_date: '', end_date: '', active: true, applies_to_category: '', min_purchase: 0 };

export default function Promotions() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [promos, setPromos] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    if (!currentStore) return;
    try {
      const list = await db.entities.Promotion.filter({ store_id: currentStore.id }, '-created_date');
      setPromos(list);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const openNew = () => { setEditing(null); setForm(empty); setDialogOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...empty, ...p }); setDialogOpen(true); };

  const save = async () => {
    try {
      const data = { ...form, value: parseFloat(form.value), min_purchase: parseFloat(form.min_purchase || 0), store_id: currentStore.id };
      if (editing) {
        await db.entities.Promotion.update(editing.id, data);
        toast({ title: 'Promotion updated' });
      } else {
        await db.entities.Promotion.create(data);
        toast({ title: 'Promotion created' });
      }
      setDialogOpen(false);
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const remove = async (p) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    await db.entities.Promotion.delete(p.id);
    toast({ title: 'Promotion deleted' });
    load();
  };

  const toggleActive = async (p) => {
    await db.entities.Promotion.update(p.id, { active: !p.active });
    load();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Promotions</h1>
          <p className="text-slate-500 text-sm mt-1">Time-bound discounts and BOGO offers</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Promotion</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{p.type}</Badge></TableCell>
                  <TableCell className="text-right font-medium">
                    {p.type === 'percentage' ? `${p.value}%` : `$${p.value?.toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-slate-500">{p.start_date || '-'}</TableCell>
                  <TableCell className="text-slate-500">{p.end_date || '-'}</TableCell>
                  <TableCell className="text-slate-500">{p.applies_to_category || 'All'}</TableCell>
                  <TableCell>
                    <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(p)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {promos.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  <Tag className="w-10 h-10 mx-auto mb-2 text-slate-300" /> No promotions yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Promotion' : 'Add Promotion'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Off</SelectItem>
                  <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                  <SelectItem value="bogo">Buy One Get One</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Value {form.type === 'percentage' ? '(%)' : '($)'}</Label><Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            <div><Label>Category (optional)</Label><Input value={form.applies_to_category} onChange={(e) => setForm({ ...form, applies_to_category: e.target.value })} /></div>
            <div><Label>Min Purchase ($)</Label><Input type="number" step="0.01" value={form.min_purchase} onChange={(e) => setForm({ ...form, min_purchase: e.target.value })} /></div>
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