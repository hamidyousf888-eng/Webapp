const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';

import { useStore } from '@/lib/storeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, ShoppingCart, Sparkles, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart, BarChart, Bar } from 'recharts';

export default function Forecasting() {
  const { currentStore } = useStore();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentStore) return;
    (async () => {
      setLoading(true);
      try {
        const [s, p] = await Promise.all([
          db.entities.Sale.filter({ store_id: currentStore.id, status: 'completed' }),
          db.entities.Product.filter({ store_id: currentStore.id }),
        ]);
        setSales(s);
        setProducts(p);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [currentStore]);

  // Build 14-day history
  const dailyData = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const daySales = sales.filter(s => s.created_date?.startsWith(dateStr));
    dailyData.push({
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      actual: daySales.reduce((sum, s) => sum + s.total, 0),
      count: daySales.length,
    });
  }

  // Simple forecast: moving average + trend
  const recentAvg = dailyData.slice(-7).reduce((s, d) => s + d.actual, 0) / 7;
  const olderAvg = dailyData.slice(0, 7).reduce((s, d) => s + d.actual, 0) / 7;
  const trend = recentAvg - olderAvg;

  const forecastData = [...dailyData];
  for (let i = 1; i <= 7; i++) {
    const lastVal = forecastData[forecastData.length - 1].actual || recentAvg;
    const predicted = Math.max(0, lastVal + trend * i / 7);
    const d = new Date(); d.setDate(d.getDate() + i);
    forecastData.push({
      date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      forecast: predicted,
    });
  }

  // Top products
  const productSales = {};
  sales.forEach(s => {
    (s.items || []).forEach(item => {
      if (!productSales[item.name]) productSales[item.name] = { qty: 0, revenue: 0 };
      productSales[item.name].qty += item.quantity;
      productSales[item.name].revenue += item.line_total;
    });
  });
  const topProducts = Object.entries(productSales).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 7)
    .map(([name, data]) => ({ name, ...data }));

  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
  const avgOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0;
  const projectedNext7 = forecastData.slice(-7).reduce((s, d) => s + d.forecast, 0);

  const generateAIInsight = async () => {
    setLoadingAI(true);
    try {
      const prompt = `You are a retail business analyst. Based on this store data, provide actionable insights and a 7-day sales forecast in 3-4 sentences:
      - Total historical sales: ${sales.length} transactions, $${totalRevenue.toFixed(2)} revenue
      - Average order value: $${avgOrderValue.toFixed(2)}
      - Recent 7-day avg daily sales: $${recentAvg.toFixed(2)}
      - Older 7-day avg daily sales: $${olderAvg.toFixed(2)}
      - Trend: ${trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat'} by $${Math.abs(trend).toFixed(2)}/day
      - Top products: ${topProducts.slice(0, 3).map(p => `${p.name} ($${p.revenue.toFixed(2)})`).join(', ')}
      - Total active products: ${products.length}
      
      Provide: 1) Revenue forecast for next 7 days, 2) Key trend observation, 3) One actionable recommendation.`;

      const res = await db.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            forecast: { type: 'string' },
            trend_observation: { type: 'string' },
            recommendation: { type: 'string' },
          },
        },
      });
      setAiInsight(res);
    } catch (e) {
      setAiInsight({ forecast: 'Unable to generate forecast', trend_observation: '', recommendation: e.message });
    } finally {
      setLoadingAI(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Forecasting</h1>
          <p className="text-slate-500 text-sm mt-1">Revenue analytics and AI-driven insights</p>
        </div>
        <Button onClick={generateAIInsight} disabled={loadingAI} className="bg-purple-600 hover:bg-purple-700">
          {loadingAI ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {loadingAI ? 'Analyzing...' : 'Generate AI Insights'}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-3"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
          <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          <div className="text-xs text-slate-500">Total Revenue</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3"><ShoppingCart className="w-5 h-5 text-blue-600" /></div>
          <div className="text-2xl font-bold">{sales.length}</div>
          <div className="text-xs text-slate-500">Transactions</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
          <div className="text-2xl font-bold">${avgOrderValue.toFixed(2)}</div>
          <div className="text-xs text-slate-500">Avg Order Value</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3"><Sparkles className="w-5 h-5 text-amber-600" /></div>
          <div className="text-2xl font-bold">${projectedNext7.toFixed(0)}</div>
          <div className="text-xs text-slate-500">Projected 7-Day Revenue</div>
        </CardContent></Card>
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <div><span className="font-semibold text-purple-900">7-Day Forecast: </span><span className="text-slate-700">{aiInsight.forecast}</span></div>
                {aiInsight.trend_observation && <div><span className="font-semibold text-purple-900">Trend: </span><span className="text-slate-700">{aiInsight.trend_observation}</span></div>}
                {aiInsight.recommendation && <div><span className="font-semibold text-purple-900">Recommendation: </span><span className="text-slate-700">{aiInsight.recommendation}</span></div>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">14-Day History + 7-Day Forecast</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
              <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} fill="url(#actualGrad)" name="Actual" />
              <Area type="monotone" dataKey="forecast" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" fill="url(#forecastGrad)" name="Forecast" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top products */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top Products by Revenue</CardTitle></CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-400">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}