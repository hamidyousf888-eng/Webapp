const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Receipt, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function PriceHistory() {
  const { currentStore } = useStore();
  const [history, setHistory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState('all');

  const load = async () => {
    if (!currentStore) return;
    setLoading(true);
    try {
      const [h, p] = await Promise.all([
        db.entities.PriceHistory.filter({ store_id: currentStore.id }, '-created_date', 500),
        db.entities.Product.filter({ store_id: currentStore.id }, '-created_date', 200),
      ]);
      setHistory(h); setProducts(p);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentStore]);

  const filtered = filterProduct === 'all' ? history : history.filter(h => h.product_id === filterProduct);

  const increases = filtered.filter(h => (h.change_amount || 0) > 0).length;
  const decreases = filtered.filter(h => (h.change_amount || 0) < 0).length;

  const byProduct = (() => {
    const map = {};
    filtered.forEach(h => {
      if (!map[h.product_name]) map[h.product_name] = { name: h.product_name, changes: 0, net: 0 };
      map[h.product_name].changes++;
      map[h.product_name].net += (h.change_amount || 0);
    });
    return Object.values(map).sort((a, b) => b.changes - a.changes).slice(0, 10);
  })();

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Price History</h1>
        <p className="text-slate-500 text-sm mt-1">Log of all historical price changes with audit trail</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Receipt className="w-4 h-4" /> Total Changes</div>
          <div className="text-2xl font-bold text-slate-900">{filtered.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><TrendingUp className="w-4 h-4" /> Increases</div>
          <div className="text-2xl font-bold text-emerald-600">{increases}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><TrendingUp className="w-4 h-4 rotate-180" /> Decreases</div>
          <div className="text-2xl font-bold text-red-600">{decreases}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><DollarSign className="w-4 h-4" /> Products Tracked</div>
          <div className="text-2xl font-bold text-slate-900">{new Set(filtered.map(h => h.product_id)).size}</div>
        </CardContent></Card>
      </div>

      {byProduct.length > 0 && (
        <Card><CardContent className="p-4">
          <h3 className="font-semibold mb-3">Most Changed Products</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byProduct}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="changes" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}

      <div className="flex items-center gap-2">
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Old Price</TableHead>
                <TableHead className="text-right">New Price</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead>Changed By</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.product_name}</TableCell>
                  <TableCell className="text-right text-slate-500">${(h.old_price || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">${(h.new_price || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-medium ${(h.change_amount || 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {(h.change_amount || 0) > 0 ? '+' : ''}${(h.change_amount || 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{h.changed_by || '-'}</TableCell>
                  <TableCell className="text-slate-500 text-sm flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(h.created_date).toLocaleString()}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{h.reason || '-'}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No price changes logged
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}