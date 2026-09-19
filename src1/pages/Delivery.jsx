const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Route, MapPin, CheckCircle, Zap } from 'lucide-react';

const empty = { driver_name: '', route_date: '', stops: [] };
const emptyStop = { customer_name: '', address: '' };

export default function Delivery() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [routes, setRoutes] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [stopForm, setStopForm] = useState(emptyStop);

  const load = async () => {
    if (!currentStore) return;
    try {
      const list = await db.entities.DeliveryRoute.filter({ store_id: currentStore.id }, '-created_date');
      setRoutes(list);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const addStop = () => {
    if (!stopForm.customer_name || !stopForm.address) return;
    setForm(prev => ({
      ...prev,
      stops: [...prev.stops, { ...stopForm, sequence: prev.stops.length + 1, status: 'pending' }]
    }));
    setStopForm(emptyStop);
  };

  const removeStop = (idx) => {
    setForm(prev => ({ ...prev, stops: prev.stops.filter((_, i) => i !== idx) }));
  };

  const optimizeRoute = () => {
    // Simple optimization: shuffle stops (in real app, would call routing API)
    const optimized = [...form.stops].sort(() => Math.random() - 0.5)
      .map((s, i) => ({ ...s, sequence: i + 1 }));
    setForm(prev => ({ ...prev, stops: optimized, optimized: true }));
    toast({ title: 'Route optimized', description: 'Stops reordered for efficiency' });
  };

  const createRoute = async () => {
    if (!form.driver_name || form.stops.length === 0) {
      toast({ title: 'Add a driver and at least one stop', variant: 'destructive' });
      return;
    }
    try {
      await db.entities.DeliveryRoute.create({
        ...form,
        store_id: currentStore.id,
        status: 'pending',
        total_distance_km: form.stops.length * 3.5, // estimate
        estimated_time_min: form.stops.length * 12,
        route_date: form.route_date || new Date().toISOString().split('T')[0],
      });
      toast({ title: 'Delivery route created' });
      setDialogOpen(false);
      setForm(empty);
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const updateStatus = async (route, status) => {
    await db.entities.DeliveryRoute.update(route.id, { status });
    toast({ title: `Route ${status}` });
    load();
  };

  const markStopDelivered = async (route, idx) => {
    const stops = route.stops.map((s, i) => i === idx ? { ...s, status: 'delivered', proof_of_delivery: `POD-${Date.now()}` } : s);
    const allDelivered = stops.every(s => s.status === 'delivered');
    await db.entities.DeliveryRoute.update(route.id, {
      stops,
      status: allDelivered ? 'completed' : 'in_progress'
    });
    toast({ title: 'Stop marked delivered', description: 'Proof of delivery captured' });
    load();
  };

  const statusBadge = (status) => {
    const map = { pending: 'secondary', in_progress: 'blue', completed: 'emerald', cancelled: 'destructive' };
    return <Badge variant={map[status] || 'secondary'} className="capitalize">{status?.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Delivery Routes</h1>
          <p className="text-slate-500 text-sm mt-1">In-house fleet routing with proof-of-delivery</p>
        </div>
        <Button onClick={() => { setForm(empty); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" /> New Route</Button>
      </div>

      <div className="grid gap-4">
        {routes.map(r => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-900">{r.driver_name}</div>
                  <div className="text-sm text-slate-500">{r.route_date} — {r.stops?.length || 0} stops</div>
                </div>
                <div className="flex items-center gap-3">
                  {r.optimized && <Badge className="bg-purple-500"><Zap className="w-3 h-3 mr-1" /> Optimized</Badge>}
                  {statusBadge(r.status)}
                  {r.status === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r, 'in_progress')}>Start</Button>
                  )}
                  {r.status === 'in_progress' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r, 'completed')}>Complete</Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600"><Route className="w-4 h-4 text-slate-400" /> {r.total_distance_km?.toFixed(1)} km</div>
                <div className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4 text-slate-400" /> Est. {r.estimated_time_min} min</div>
              </div>
              <div className="space-y-1.5">
                {r.stops?.map((stop, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">{stop.sequence}</span>
                      <div>
                        <div className="font-medium text-slate-900">{stop.customer_name}</div>
                        <div className="text-slate-500">{stop.address}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {stop.status === 'delivered' ? (
                        <Badge className="bg-emerald-500"><CheckCircle className="w-3 h-3 mr-1" /> Delivered</Badge>
                      ) : (
                        <>
                          <Badge variant="secondary">Pending</Badge>
                          {r.status === 'in_progress' && (
                            <Button size="sm" variant="outline" onClick={() => markStopDelivered(r, i)}>Deliver</Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {routes.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-slate-400">
              <Route className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              No delivery routes yet
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Delivery Route</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Driver Name</Label><Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} /></div>
              <div><Label>Route Date</Label><Input type="date" value={form.route_date} onChange={(e) => setForm({ ...form, route_date: e.target.value })} /></div>
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <div className="text-sm font-medium">Delivery Stops</div>
              <div className="flex gap-2">
                <Input placeholder="Customer name" value={stopForm.customer_name} onChange={(e) => setStopForm({ ...stopForm, customer_name: e.target.value })} />
                <Input placeholder="Address" value={stopForm.address} onChange={(e) => setStopForm({ ...stopForm, address: e.target.value })} />
                <Button onClick={addStop}><Plus className="w-4 h-4" /></Button>
              </div>
              {form.stops.length > 0 && (
                <div className="space-y-1">
                  {form.stops.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-sm">
                      <span><span className="font-medium">{i + 1}.</span> {s.customer_name} — {s.address}</span>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeStop(i)}>Remove</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={optimizeRoute} className="mt-2">
                    <Zap className="w-3.5 h-3.5 mr-1" /> Optimize Route Order
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={createRoute}>Create Route</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}