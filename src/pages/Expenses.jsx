import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useApp, useLoad, useMoney, useDate, Status, Empty, Modal, Field, PageHead, CatIcon, today } from '../ui';

const Actions = ({ onEdit, onDel }) => (
  <div className="flex gap-1">
    <button className="btn px-2.5 py-2" onClick={onEdit} aria-label="Edit"><Pencil size={15} /></button>
    <button className="btn btn-danger px-2.5 py-2" onClick={onDel} aria-label="Delete"><Trash2 size={15} /></button>
  </div>
);

export default function Expenses() {
  const money = useMoney(), fd = useDate();
  const { sessionId } = useApp();
  const [f, setF] = useState({ q: '', session_id: '', category_id: '', from: '', to: '', sort: 'expense_date', dir: 'desc' });
  const [form, setForm] = useState(null), [err, setErr] = useState('');
  const setFilter = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const meta = useLoad(() => Promise.all([api('/sessions'), api('/categories')]), []);
  const [sessions = [], cats = []] = meta.data || [];
  const qs = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && k !== 'q')).toString();
  const ex = useLoad(() => api('/expenses?' + qs), [qs]);
  const rows = (ex.data || []).filter((e) => `${e.description || ''} ${e.notes || ''}`.toLowerCase().includes(f.q.toLowerCase()));

  async function save(e) {
    e.preventDefault(); setErr('');
    if (!(Number(form.amount) > 0)) return setErr('Amount must be greater than zero');
    if (!form.session_id || !form.category_id || !form.expense_date) return setErr('Session, category and date are required');
    try {
      const body = { session_id: form.session_id, category_id: form.category_id, expense_date: form.expense_date, amount: Number(form.amount), description: form.description || null, notes: form.notes || null };
      await api(form.id ? `/expenses/${form.id}` : '/expenses', { method: form.id ? 'PUT' : 'POST', body });
      setForm(null); ex.reload();
    } catch (x) { setErr(x.message); }
  }
  async function del(e) { if (confirm('Delete this expense?')) { try { await api(`/expenses/${e.id}`, { method: 'DELETE' }); ex.reload(); } catch (x) { alert(x.message); } } }
  const add = () => { setErr(''); setForm({ session_id: sessions.find((s) => s.id === sessionId)?.id || sessions[0]?.id || '', category_id: cats[0]?.id || '', expense_date: today(), description: '', amount: '', notes: '' }); };
  const edit = (e) => { setErr(''); setForm({ ...e, description: e.description || '', notes: e.notes || '' }); };

  return (
    <div>
      <PageHead title="Expenses"><button className="btn btn-primary" onClick={add}><Plus size={18} />Add expense</button></PageHead>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <input className="input col-span-2 lg:col-span-4" placeholder="Search description or notes…" value={f.q} onChange={setFilter('q')} />
        <select className="input" value={f.session_id} onChange={setFilter('session_id')}><option value="">All sessions</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.session_name}</option>)}</select>
        <select className="input" value={f.category_id} onChange={setFilter('category_id')}><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input type="date" className="input" value={f.from} onChange={setFilter('from')} aria-label="From date" />
        <input type="date" className="input" value={f.to} onChange={setFilter('to')} aria-label="To date" />
        <select className="input" value={f.sort} onChange={setFilter('sort')}><option value="expense_date">Sort by date</option><option value="amount">Sort by amount</option></select>
        <select className="input" value={f.dir} onChange={setFilter('dir')}><option value="desc">Descending</option><option value="asc">Ascending</option></select>
      </div>
      <Status loading={ex.loading} error={ex.error} onRetry={ex.reload} />
      {!ex.loading && !ex.error && !rows.length && <Empty text="No expenses found." />}

      <div className="space-y-2 md:hidden">
        {rows.map((e) => (
          <div key={e.id} className="card flex items-center gap-3 p-3">
            <CatIcon name={e.categories?.icon} color={e.categories?.color} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{e.description || e.categories?.name}</p><p className="truncate text-xs text-slate-500">{fd(e.expense_date)} · {e.sessions?.session_name}</p></div>
            <div className="text-right"><p className="text-sm font-semibold">{money(e.amount)}</p><Actions onEdit={() => edit(e)} onDel={() => del(e)} /></div>
          </div>
        ))}
      </div>
      {rows.length > 0 && (
        <div className="card hidden overflow-x-auto p-0 md:block">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th>Description</th><th>Category</th><th>Session</th><th className="text-right">Amount</th><th /></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="p-3 whitespace-nowrap">{fd(e.expense_date)}</td><td>{e.description || '—'}</td>
                  <td><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: e.categories?.color || '#64748B' }} />{e.categories?.name}</span></td>
                  <td>{e.sessions?.session_name}</td><td className="text-right font-semibold">{money(e.amount)}</td>
                  <td className="p-3"><Actions onEdit={() => edit(e)} onDel={() => del(e)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id ? 'Edit expense' : 'Add expense'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Session"><select className="input" required value={form.session_id} onChange={set('session_id')}><option value="" disabled>Select…</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.session_name}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><input type="date" className="input" required value={form.expense_date} onChange={set('expense_date')} /></Field>
              <Field label="Amount"><input type="number" inputMode="decimal" min="0.01" step="0.01" className="input" required value={form.amount} onChange={set('amount')} /></Field>
            </div>
            <Field label="Category"><select className="input" required value={form.category_id} onChange={set('category_id')}><option value="" disabled>Select…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Description"><input className="input" value={form.description} onChange={set('description')} /></Field>
            <Field label="Notes"><textarea className="input" rows="2" value={form.notes} onChange={set('notes')} /></Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button className="btn btn-primary w-full">Save</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
