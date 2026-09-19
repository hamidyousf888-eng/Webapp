const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { ChefHat, Clock, CheckCircle, Package, Bell } from 'lucide-react';

const statusFlow = ['pending', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered'];
const statusColors = {
  pending: 'bg-amber-100 text-amber-700 border-amber-300',
  preparing: 'bg-blue-100 text-blue-700 border-blue-300',
  ready: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  picked_up: 'bg-purple-100 text-purple-700 border-purple-300',
  out_for_delivery: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  delivered: 'bg-slate-100 text-slate-700 border-slate-300',
  cancelled: 'bg-red-100 text-red-700 border-red-300',
};

export default function KitchenDisplay() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const list = await db.entities.OnlineOrder.filter({ store_id: currentStore.id }, '-created_date', 50);
      setOrders(list.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [currentStore]);

  const advance = async (order) => {
    const idx = statusFlow.indexOf(order.status);
    const next = statusFlow[idx + 1];
    if (!next) return;
    try {
      await db.entities.OnlineOrder.update(order.id, { status: next });
      toast({ title: `${order.order_number} → ${next}` });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const elapsed = (date) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'just now';
    return `${mins}m ago`;
  };

  const active = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
  const ready = orders.filter(o => o.status === 'ready');

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ChefHat className="w-6 h-6" /> Kitchen Display
          </h1>
          <p className="text-slate-500 text-sm mt-1">Real-time order queue — auto-refreshes every 10s</p>
        </div>
        <div className="flex gap-3">
          <Badge className="bg-amber-100 text-amber-700 text-sm px-3 py-1">{active.length} In Progress</Badge>
          <Badge className="bg-emerald-100 text-emerald-700 text-sm px-3 py-1">{ready.length} Ready</Badge>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <ChefHat className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg">No active orders</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase mb-2">In Progress</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {active.map(o => (
                  <Card key={o.id} className={cn('border-2', o.status === 'pending' ? 'border-amber-300' : 'border-blue-300')}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{o.order_number}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[o.status])}>{o.status}</span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {elapsed(o.created_date)}
                        <span className="ml-auto capitalize">{o.fulfillment_type}</span>
                      </div>
                      <div className="space-y-1 border-t pt-2">
                        {o.items?.map((item, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <Package className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                            <span><b>{item.quantity}x</b> {item.name}</span>
                          </div>
                        ))}
                      </div>
                      {o.notes && <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">⚠ {o.notes}</div>}
                      <Button className="w-full" onClick={() => advance(o)}>
                        {o.status === 'pending' ? 'Start Preparing' : 'Mark Ready'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {ready.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-emerald-600 uppercase mb-2">Ready for Pickup/Delivery</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {ready.map(o => (
                  <Card key={o.id} className="border-2 border-emerald-300 bg-emerald-50">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{o.order_number}</span>
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-xs text-slate-500">{o.customer_name} • {o.fulfillment_type === 'bopis' ? 'Pickup' : 'Delivery'}</div>
                      <div className="space-y-1">
                        {o.items?.map((item, i) => (
                          <div key={i} className="text-sm"><b>{item.quantity}x</b> {item.name}</div>
                        ))}
                      </div>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => advance(o)}>
                        {o.fulfillment_type === 'bopis' ? 'Mark Picked Up' : 'Send Out'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}