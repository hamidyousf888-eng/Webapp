const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingBag, Store, Truck, Clock } from 'lucide-react';

const statusFlow = ['pending', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered'];
const statusColors = {
  pending: 'secondary', preparing: 'blue', ready: 'amber',
  picked_up: 'emerald', out_for_delivery: 'blue', delivered: 'emerald', cancelled: 'destructive',
};

export default function OnlineOrders() {
  const { currentStore } = useStore();
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);

  const load = async () => {
    if (!currentStore) return;
    try {
      const list = await db.entities.OnlineOrder.filter({ store_id: currentStore.id }, '-created_date');
      setOrders(list);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const advanceStatus = async (order) => {
    const currentIdx = statusFlow.indexOf(order.status);
    const nextStatus = order.fulfillment_type === 'bopis'
      ? (order.status === 'preparing' ? 'ready' : order.status === 'ready' ? 'picked_up' : null)
      : (order.status === 'ready' ? 'out_for_delivery' : order.status === 'out_for_delivery' ? 'delivered' : null);

    if (order.status === 'pending') {
      const next = 'preparing';
      await db.entities.OnlineOrder.update(order.id, { status: next });
      toast({ title: `Order ${next}` });
      load();
      return;
    }
    if (nextStatus) {
      await db.entities.OnlineOrder.update(order.id, { status: nextStatus });
      toast({ title: `Order ${nextStatus.replace('_', ' ')}` });
      load();
    }
  };

  const cancelOrder = async (order) => {
    await db.entities.OnlineOrder.update(order.id, { status: 'cancelled' });
    toast({ title: 'Order cancelled' });
    load();
  };

  const getNextAction = (order) => {
    if (order.status === 'pending') return 'Start Preparing';
    if (order.status === 'preparing' && order.fulfillment_type === 'bopis') return 'Mark Ready';
    if (order.status === 'preparing' && order.fulfillment_type === 'delivery') return 'Mark Ready';
    if (order.status === 'ready' && order.fulfillment_type === 'bopis') return 'Mark Picked Up';
    if (order.status === 'ready' && order.fulfillment_type === 'delivery') return 'Send Out';
    if (order.status === 'out_for_delivery') return 'Mark Delivered';
    return null;
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Online Orders</h1>
        <p className="text-slate-500 text-sm mt-1">BOPIS and delivery order fulfillment</p>
      </div>

      <div className="grid gap-4">
        {orders.map(order => (
          <Card key={order.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{order.order_number}</span>
                    <Badge variant={statusColors[order.status] || 'secondary'} className="capitalize">{order.status?.replace('_', ' ')}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {order.fulfillment_type === 'bopis' ? <><Store className="w-3 h-3 mr-1" /> Pick Up</> : <><Truck className="w-3 h-3 mr-1" /> Delivery</>}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {order.customer_name} — {order.customer_phone}
                    {order.delivery_address && <span className="block">{order.delivery_address}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">${order.total?.toFixed(2)}</div>
                  <div className="text-xs text-slate-400">{new Date(order.created_date).toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm text-slate-600">
                    <span>{item.quantity}x {item.name}</span>
                    <span>${item.line_total?.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                {getNextAction(order) && (
                  <Button size="sm" onClick={() => advanceStatus(order)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Clock className="w-3.5 h-3.5 mr-1" /> {getNextAction(order)}
                  </Button>
                )}
                {(order.status === 'pending' || order.status === 'preparing') && (
                  <Button size="sm" variant="outline" className="text-red-500" onClick={() => cancelOrder(order)}>Cancel</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && (
          <Card><CardContent className="py-12 text-center text-slate-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300" /> No online orders yet
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}