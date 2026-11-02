import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useLoad, Status, Empty, Modal, Field, PageHead, CatIcon, ICONS, SaveButton } from '../ui';

export default function Categories() {
  const [form, setForm] = useState(null), [err, setErr] = useState(''), [saving, setSaving] = useState(false);
  const { data, loading, error, reload } = useLoad(() => api('/categories'), []);

  async function save(e) {
    e.preventDefault(); setErr('');
    if (saving) return;
    setSaving(true);
    try {
      const body = { name: form.name, icon: form.icon, color: form.color };
      await api(form.id ? `/categories/${form.id}` : '/categories', { method: form.id ? 'PUT' : 'POST', body });
      setForm(null); reload();
    } catch (x) { setErr(x.message); }
    finally { setSaving(false); }
  }
  async function del(c) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try { await api(`/categories/${c.id}`, { method: 'DELETE' }); reload(); }
    catch (x) { alert(x.status === 409 ? `"${c.name}" is used by expenses and cannot be deleted.` : x.message); }
  }

  return (
    <div>
      <PageHead title="Categories"><button className="btn btn-primary" onClick={() => { setErr(''); setForm({ name: '', icon: 'package', color: '#1A6BCC' }); }}><Plus size={18} />New category</button></PageHead>
      <Status loading={loading} error={error} onRetry={reload} />
      {!loading && !error && !(data || []).length && <Empty text="No categories yet." />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data || []).map((c) => (
          <div key={c.id} className="card flex items-center gap-3 p-3 hover:shadow-md">
            <CatIcon name={c.icon} color={c.color} />
            <p className="min-w-0 flex-1 truncate font-medium">{c.name}</p>
            <button className="btn px-2.5 py-2" onClick={() => { setErr(''); setForm({ ...c, icon: c.icon || 'package', color: c.color || '#1A6BCC' }); }} aria-label="Edit"><Pencil size={15} /></button>
            <button className="btn btn-danger px-2.5 py-2" onClick={() => del(c)} aria-label="Delete"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      {form && (
        <Modal title={form.id ? 'Edit category' : 'New category'} onClose={() => setForm(null)} busy={saving}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Icon">
              <div className="flex flex-wrap gap-2">
                {Object.entries(ICONS).map(([k, I]) => (
                  <button type="button" key={k} onClick={() => setForm({ ...form, icon: k })} aria-label={k} className={`grid h-10 w-10 place-items-center rounded-xl border transition ${form.icon === k ? 'border-brand bg-brand/10 text-brand' : 'border-slate-300 dark:border-slate-700'}`}><I size={18} /></button>
                ))}
              </div>
            </Field>
            <Field label="Color"><input type="color" className="h-11 w-full rounded-xl border border-slate-300 bg-transparent p-1 dark:border-slate-700" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <SaveButton loading={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}
