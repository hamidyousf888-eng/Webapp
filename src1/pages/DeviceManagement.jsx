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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, Monitor, ScanLine, Printer, Tablet, Scale, Pencil } from 'lucide-react';

const typeIcons = {
  register: Monitor,
  scanner: ScanLine,
  printer: Printer,
  kitchen_display: Monitor,
  tablet: Tablet,
  scale: Scale,
  customer_display: Monitor,
};

const statusColors = {
  online: 'bg-emerald-100 text-emerald-700',
  offline: 'bg-red-100 text-red-700',
  maintenance: 'bg-amber-100 text-amber-700',
};

export default function DeviceManagement() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'register', status: 'online', location: '', ip_address: '', serial_number: '', notes: '', features: { self_checkout_enabled: false, scanner_enabled: true, printer_enabled: true, cash_drawer_enabled: true } });

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const list = await db.entities.Device.filter({ store_id: currentStore.id }, '-created_date');
      setDevices(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const openNew = () => { setEditing(null); setForm({ name: '', type: 'register', status: 'online', location: '', ip_address: '', serial_number: '', notes: '', features: { self_checkout_enabled: false, scanner_enabled: true, printer_enabled: true, cash_drawer_enabled: true } }); setDialogOpen(true); };
  const openEdit = (d) => { setEditing(d); setForm({ name: d.name, type: d.type, status: d.status, location: d.location || '', ip_address: d.ip_address || '', serial_number: d.serial_number || '', notes: d.notes || '', features: { self_checkout_enabled: d.features?.self_checkout_enabled || false, scanner_enabled: d.features?.scanner_enabled ?? true, printer_enabled: d.features?.printer_enabled ?? true, cash_drawer_enabled: d.features?.cash_drawer_enabled ?? true } }); setDialogOpen(true); };

  const save = async () => {
    if (!form.name) {
      toast({ title: 'Device name required', variant: 'destructive' });
      return;
    }
    try {
      if (editing) {
        await db.entities.Device.update(editing.id, { ...form, last_seen: new Date().toISOString() });
        toast({ title: 'Device updated' });
      } else {
        await db.entities.Device.create({ ...form, store_id: currentStore.id, last_seen: new Date().toISOString() });
        toast({ title: 'Device added' });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const toggleStatus = async (d) => {
    const next = d.status === 'online' ? 'offline' : 'online';
    await db.entities.Device.update(d.id, { status: next });
    load();
  };

  const remove = async (d) => {
    if (!confirm(`Remove ${d.name}?`)) return;
    await db.entities.Device.delete(d.id);
    load();
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Device Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage registers, scanners, printers, and per-device features</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Add Device</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-sm text-slate-500">Total Devices</div><div className="text-2xl font-bold">{devices.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-slate-500">Online</div><div className="text-2xl font-bold text-emerald-600">{devices.filter(d => d.status === 'online').length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-slate-500">Offline</div><div className="text-2xl font-bold text-red-600">{devices.filter(d => d.status === 'offline').length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-slate-500">Maintenance</div><div className="text-2xl font-bold text-amber-600">{devices.filter(d => d.status === 'maintenance').length}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {devices.map(d => {
          const Icon = typeIcons[d.type] || Monitor;
          return (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{d.name}</div>
                      <div className="text-xs text-slate-500 capitalize">{d.type.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status]}`}>{d.status}</span>
                </div>
                <div className="text-xs text-slate-500 space-y-0.5">
                  {d.location && <div>📍 {d.location}</div>}
                  {d.ip_address && <div>🌐 {d.ip_address}</div>}
                  {d.serial_number && <div>SN: {d.serial_number}</div>}
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {d.features?.self_checkout_enabled && <span className="px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600">Self-Checkout</span>}
                  {d.features?.scanner_enabled && <span className="px-1.5 py-0.5 rounded text-xs bg-teal-50 text-teal-600">Scanner</span>}
                  {d.features?.printer_enabled && <span className="px-1.5 py-0.5 rounded text-xs bg-purple-50 text-purple-600">Printer</span>}
                  {d.features?.cash_drawer_enabled && <span className="px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-600">Cash Drawer</span>}
                </div>
                <div className="flex gap-1 pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(d)}>{d.status === 'online' ? 'Take Offline' : 'Bring Online'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove(d)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {devices.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Monitor className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No devices registered
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Device' : 'Add Device'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Device Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(typeIcons).map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['online', 'offline', 'maintenance'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Location</Label><Input placeholder="e.g. Front Register, Aisle 3" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>IP Address</Label><Input value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} /></div>
              <div><Label>Serial Number</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
            </div>
            <div className="border-t pt-3 space-y-2">
              <Label>Features</Label>
              {[
                { key: 'self_checkout_enabled', label: 'Self-Checkout' },
                { key: 'scanner_enabled', label: 'Scanner' },
                { key: 'printer_enabled', label: 'Printer' },
                { key: 'cash_drawer_enabled', label: 'Cash Drawer' },
              ].map(f => (
                <div key={f.key} className="flex items-center gap-2">
                  <Switch checked={form.features[f.key]} onCheckedChange={(v) => setForm({ ...form, features: { ...form.features, [f.key]: v } })} />
                  <Label className="text-sm font-normal">{f.label}</Label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}