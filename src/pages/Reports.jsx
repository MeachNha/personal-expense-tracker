import { useState } from 'react';
import { Download } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../api';
import { useLoad, useMoney, useDate, Status, Empty, PageHead, DateInput } from '../ui';

export default function Reports() {
  const money = useMoney(), fd = useDate();
  const [f, setF] = useState({ session_id: '', from: '', to: '' });
  const setFilter = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const meta = useLoad(() => api('/sessions'), []);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  const ex = useLoad(() => api('/expenses?sort=expense_date&dir=asc&' + qs), [qs]);

  const sessions = meta.data || [], rows = ex.data || [];
  const pool = f.session_id ? sessions.filter((s) => s.id === f.session_id) : sessions;
  const salary = pool.reduce((a, s) => a + s.salary, 0);
  const spent = rows.reduce((a, e) => a + Number(e.amount), 0);
  const byCat = {}, byDay = {};
  for (const e of rows) {
    const c = (byCat[e.categories?.name] ||= { name: e.categories?.name, total: 0, n: 0 });
    c.total += Number(e.amount); c.n++;
    byDay[e.expense_date] = (byDay[e.expense_date] || 0) + Number(e.amount);
  }
  const cats = Object.values(byCat).sort((a, b) => b.total - a.total);
  const chart = [{ name: 'Salary', v: salary, c: '#1A6BCC' }, { name: 'Expenses', v: spent, c: '#DC2626' }, { name: 'Remaining', v: salary - spent, c: '#16A34A' }];

  function exportCsv() {
    const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const lines = [['Date', 'Session', 'Category', 'Description', 'Amount', 'Notes'], ...rows.map((e) => [e.expense_date, e.sessions?.session_name, e.categories?.name, e.description, e.amount, e.notes])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = 'expenses.csv'; a.click();
  }
  const month = (e) => {
    if (!e.target.value) return setF({ ...f, from: '', to: '' });
    const d = parseISO(e.target.value + '-01');
    setF({ ...f, from: format(startOfMonth(d), 'yyyy-MM-dd'), to: format(endOfMonth(d), 'yyyy-MM-dd') });
  };

  return (
    <div>
      <PageHead title="Reports"><button className="btn" onClick={exportCsv} disabled={!rows.length}><Download size={18} />Export CSV</button></PageHead>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <select className="input col-span-2 lg:col-span-1" value={f.session_id} onChange={setFilter('session_id')}><option value="">All sessions</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.session_name}</option>)}</select>
        <DateInput value={f.from} onChange={setFilter('from')} aria-label="From date" />
        <DateInput value={f.to} onChange={setFilter('to')} aria-label="To date" />
        <input type="month" className="input" onChange={month} aria-label="Month filter (analysis only)" />
      </div>
      <Status loading={ex.loading} error={ex.error} onRetry={ex.reload} />
      {!ex.loading && !ex.error && (!rows.length ? <Empty text="No expenses match these filters." /> : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-2 font-semibold">Salary vs Expenses</h2>
              <p className="mb-2 text-sm text-slate-500">{rows.length} transactions · salary of selected session(s)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chart}><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis width={50} tick={{ fontSize: 11 }} /><Tooltip formatter={(v) => money(v)} /><Bar dataKey="v" radius={[8, 8, 0, 0]}>{chart.map((d) => <Cell key={d.name} fill={d.c} />)}</Bar></BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h2 className="mb-2 font-semibold">By Category</h2>
              {cats.map((c) => (
                <div key={c.name} className="mb-2"><div className="flex justify-between text-sm"><span>{c.name} <span className="text-xs text-slate-500">({c.n})</span></span><span className="font-medium">{money(c.total)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-1.5 rounded-full bg-brand" style={{ width: `${(c.total / spent) * 100}%` }} /></div></div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="mb-2 font-semibold">Daily Summary</h2>
            {Object.entries(byDay).map(([d, t]) => <div key={d} className="flex justify-between border-t border-slate-100 py-1.5 text-sm first:border-0 dark:border-slate-800"><span>{fd(d)}</span><span className="font-medium">{money(t)}</span></div>)}
          </div>
        </div>
      ))}
    </div>
  );
}
