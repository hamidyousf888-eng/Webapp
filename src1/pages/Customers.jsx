const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Pencil, Trash2, Users, Star } from 'lucide-react';

const empty = { name: '', email: '', phone: '', address: '', loyalty_points: 0, has_house_account: false, house_account_balance: 0, notes: '' };

export default function Customers() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const list = await db.entities.Customer.filter({ store_id: currentStore.id });
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setCustomers(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const filtered = customers.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));

  const openNew = () => { setEditing(null); setForm(empty); setDialogOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...empty, ...c }); setDialogOpen(true); };

  const save = async () => {
    try {
      if (editing) {
        await db.entities.Customer.update(editing.id, form);
        toast({ title: 'Customer updated' });
      } else {
        await db.entities.Customer.create({ ...form, store_id: currentStore.id });
        toast({ title: 'Customer created' });
      }
      setDialogOpen(false);
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const remove = async (c) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    await db.entities.Customer.delete(c.id);
    toast({ title: 'Customer deleted' });
    load();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 text-sm mt-1">CRM, loyalty, and house accounts</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Customer</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Loyalty Points</TableHead>
                <TableHead>House Account</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-slate-500">{c.email || '-'}</TableCell>
                  <TableCell className="text-slate-500">{c.phone || '-'}</TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                      <Star className="w-3.5 h-3.5" /> {c.loyalty_points || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    {c.has_house_account ? (
                      <span className="text-sm font-medium text-blue-600">${(c.house_account_balance || 0).toFixed(2)}</span>
                    ) : <span className="text-slate-400">No</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(c)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" /> No customers found
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>Loyalty Points</Label><Input type="number" value={form.loyalty_points} onChange={(e) => setForm({ ...form, loyalty_points: parseInt(e.target.value) || 0 })} /></div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.has_house_account} onCheckedChange={(v) => setForm({ ...form, has_house_account: v })} />
              <Label>House Account</Label>
            </div>
            {form.has_house_account && (
              <div className="col-span-2"><Label>Account Balance ($)</Label><Input type="number" step="0.01" value={form.house_account_balance} onChange={(e) => setForm({ ...form, house_account_balance: parseFloat(e.target.value) || 0 })} /></div>
            )}
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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