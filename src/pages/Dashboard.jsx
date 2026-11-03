import { Wallet, Receipt, PiggyBank, Hash } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { api } from '../api';
import { useApp, useLoad, useMoney, useDate, Status, Empty, CatIcon } from '../ui';

const Stat = ({ icon: I, label, value, tone = '' }) => (
  <div className="card hover:shadow-md">
    <div className="flex items-center justify-between text-sm text-slate-500">{label}<I size={18} /></div>
    <p className={`mt-2 break-all text-lg font-semibold sm:text-2xl ${tone}`}>{value}</p>
  </div>
);

export default function Dashboard() {
  const { sessionId, setSessionId } = useApp();
  const money = useMoney(), fd = useDate();
  const ss = useLoad(() => api('/sessions'), []);
  const list = ss.data || [];
  const cur = list.find((s) => s.id === sessionId) || list.find((s) => s.status === 'active') || list[0];
  const id = cur?.id;
  const rep = useLoad(() => (id ? api(`/reports/session/${id}`) : Promise.resolve(null)), [id]);
  const recent = useLoad(() => (id ? api(`/expenses?session_id=${id}&limit=5`) : Promise.resolve([])), [id]);

  if (ss.loading || ss.error) return <Status {...ss} onRetry={ss.reload} />;
  if (!cur) return <Empty text="No sessions yet. Create your first one on the Sessions page." />;

  const cats = rep.data?.categories || [];
  const daily = (rep.data?.daily || []).map((d) => ({ date: fd(d.expense_date), amount: Number(d.total_amount) }));
  const top = cats[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">{fd(cur.start_date)} – {fd(cur.end_date)} · {cur.status}</p>
        </div>
        <select className="input md:w-72" value={cur.id} onChange={(e) => setSessionId(e.target.value)}>
          {list.map((s) => <option key={s.id} value={s.id}>{s.session_name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Wallet} label="Total Salary" value={money(cur.salary)} />
        <Stat icon={Receipt} label="Total Expenses" value={money(cur.total_expenses)} tone="text-red-600" />
        <Stat icon={PiggyBank} label="Remaining" value={money(cur.remaining_balance)} tone={cur.remaining_balance < 0 ? 'text-red-600' : 'text-green-600'} />
        <Stat icon={Hash} label="Transactions" value={cur.transaction_count} />
      </div>

      {rep.loading || rep.error ? <Status {...rep} onRetry={rep.reload} /> : !cats.length ? <Empty text="No expenses in this session yet." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-2 font-semibold">Expense by Category</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={cats} dataKey="total_amount" nameKey="category_name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {cats.map((c) => <Cell key={c.category_id} fill={c.color || '#64748B'} />)}
                </Pie>
                <Tooltip formatter={(v) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {cats.map((c) => <span key={c.category_id} className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: c.color || '#64748B' }} />{c.category_name}</span>)}
            </div>
          </div>
          <div className="card">
            <h2 className="mb-2 font-semibold">Daily Expense Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={45} />
                <Tooltip formatter={(v) => money(v)} />
                <Line type="monotone" dataKey="amount" stroke="#1A6BCC" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {top && (
          <div className="card">
            <h2 className="mb-3 font-semibold">Highest Spending Category</h2>
            <div className="flex items-center gap-3"><CatIcon name={top.icon} color={top.color} /><div><p className="font-medium">{top.category_name}</p><p className="text-sm text-slate-500">{money(top.total_amount)}</p></div></div>
          </div>
        )}
        <div className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Recent Transactions</h2><a className="text-sm text-brand" href="#expenses">View all</a></div>
          {recent.loading ? <p className="text-sm text-slate-500">Loading…</p> : !(recent.data || []).length ? <p className="text-sm text-slate-500">Nothing yet.</p> : (recent.data || []).map((e) => (
            <div key={e.id} className="flex items-center gap-3 border-t border-slate-100 py-2 first:border-0 dark:border-slate-800">
              <CatIcon name={e.categories?.icon} color={e.categories?.color} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{e.description || e.categories?.name}</p><p className="text-xs text-slate-500">{fd(e.expense_date)}</p></div>
              <p className="shrink-0 whitespace-nowrap text-sm font-semibold">{money(e.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
