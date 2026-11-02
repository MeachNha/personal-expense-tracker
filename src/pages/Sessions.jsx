import { useState } from 'react';
import { Plus, Pencil, Trash2, Lock, Unlock, ExternalLink } from 'lucide-react';
import { api } from '../api';
import { useApp, useLoad, useMoney, useDate, Status, Empty, Modal, Field, PageHead, today } from '../ui';

export default function Sessions() {
  const money = useMoney(), fd = useDate();
  const { setSessionId } = useApp();
  const [q, setQ] = useState(''), [st, setSt] = useState(''), [form, setForm] = useState(null), [err, setErr] = useState('');
  const { data, loading, error, reload } = useLoad(() => api('/sessions'), []);
  const rows = (data || []).filter((s) => (!st || s.status === st) && s.session_name.toLowerCase().includes(q.toLowerCase()));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setErr('');
    try {
      const body = { session_name: form.session_name, start_date: form.start_date, end_date: form.end_date, salary: Number(form.salary) || 0, notes: form.notes || null };
      await api(form.id ? `/sessions/${form.id}` : '/sessions', { method: form.id ? 'PUT' : 'POST', body });
      setForm(null); reload();
    } catch (x) { setErr(x.message); }
  }
  async function toggle(s) { await api(`/sessions/${s.id}`, { method: 'PUT', body: { status: s.status === 'active' ? 'closed' : 'active' } }); reload(); }
  async function del(s) {
    if (!confirm(`Delete "${s.session_name}"?`)) return;
    try { await api(`/sessions/${s.id}`, { method: 'DELETE' }); }
    catch (x) {
      if (x.status === 409) {
        if (confirm(`"${s.session_name}" has ${s.transaction_count} expense(s).\nDelete the session AND all its expenses permanently?`)) await api(`/sessions/${s.id}?force=true`, { method: 'DELETE' });
      } else alert(x.message);
    }
    reload();
  }

  return (
    <div>
      <PageHead title="Sessions"><button className="btn btn-primary" onClick={() => { setErr(''); setForm({ session_name: '', start_date: today(), end_date: today(), salary: '', notes: '' }); }}><Plus size={18} />New session</button></PageHead>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Search sessions…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={st} onChange={(e) => setSt(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="closed">Closed</option></select>
      </div>
      <Status loading={loading} error={error} onRetry={reload} />
      {!loading && !error && !rows.length && <Empty text="No sessions found." />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((s) => (
          <div key={s.id} className="card hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="truncate font-semibold">{s.session_name}</p><p className="text-xs text-slate-500">{fd(s.start_date)} – {fd(s.end_date)}</p></div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${s.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>{s.status}</span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div><dt className="text-xs text-slate-500">Salary</dt><dd className="truncate font-medium">{money(s.salary)}</dd></div>
              <div><dt className="text-xs text-slate-500">Spent</dt><dd className="truncate font-medium text-red-600">{money(s.total_expenses)}</dd></div>
              <div><dt className="text-xs text-slate-500">Left</dt><dd className={`truncate font-medium ${s.remaining_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>{money(s.remaining_balance)}</dd></div>
            </dl>
            {s.notes && <p className="mt-2 text-xs text-slate-500">{s.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn px-3 py-2" onClick={() => { setSessionId(s.id); location.hash = '#dashboard'; }}><ExternalLink size={16} />Open</button>
              <button className="btn px-3 py-2" onClick={() => { setErr(''); setForm({ ...s, notes: s.notes || '' }); }} aria-label="Edit"><Pencil size={16} /></button>
              <button className="btn px-3 py-2" onClick={() => toggle(s)} aria-label="Close or reopen">{s.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}</button>
              <button className="btn btn-danger px-3 py-2" onClick={() => del(s)} aria-label="Delete"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      {form && (
        <Modal title={form.id ? 'Edit session' : 'New session'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Session name"><input className="input" required value={form.session_name} onChange={set('session_name')} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date"><input type="date" className="input" required value={form.start_date} onChange={set('start_date')} /></Field>
              <Field label="End date"><input type="date" className="input" required min={form.start_date} value={form.end_date} onChange={set('end_date')} /></Field>
            </div>
            <Field label="Salary"><input type="number" min="0" step="0.01" className="input" value={form.salary} onChange={set('salary')} /></Field>
            <Field label="Notes"><textarea className="input" rows="2" value={form.notes} onChange={set('notes')} /></Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button className="btn btn-primary w-full">Save</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
