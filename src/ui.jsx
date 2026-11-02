import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { X, Utensils, Car, ShoppingBag, Receipt, HeartPulse, Film, Users, GraduationCap, Package, Home, Plane, Gift } from 'lucide-react';

export const ICONS = { utensils: Utensils, car: Car, 'shopping-bag': ShoppingBag, receipt: Receipt, 'heart-pulse': HeartPulse, film: Film, users: Users, 'graduation-cap': GraduationCap, package: Package, home: Home, plane: Plane, gift: Gift };
export const CatIcon = ({ name, color }) => {
  const I = ICONS[name] || Package;
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: (color || '#64748B') + '22', color: color || '#64748B' }}><I size={18} /></span>;
};

const DEFAULTS = { currency: 'USD', theme: 'system', dateFormat: 'MMM d, yyyy' };
const Ctx = createContext();
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(() => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('settings') || '{}') }; } catch { return DEFAULTS; } });
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId') || '');
  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  }, [settings]);
  useEffect(() => { localStorage.setItem('sessionId', sessionId); }, [sessionId]);
  return <Ctx.Provider value={{ settings, setSettings, sessionId, setSessionId }}>{children}</Ctx.Provider>;
}

export const useMoney = () => { const { settings } = useApp(); return (n) => new Intl.NumberFormat(undefined, { style: 'currency', currency: settings.currency }).format(Number(n) || 0); };
export const useDate = () => { const { settings } = useApp(); return (d) => (d ? format(parseISO(d), settings.dateFormat) : ''); };
export const today = () => format(new Date(), 'yyyy-MM-dd');

export function useLoad(fn, deps) {
  const [s, set] = useState({ data: null, loading: true, error: null });
  const run = useCallback(() => {
    set((x) => ({ ...x, loading: true, error: null }));
    fn().then((data) => set({ data, loading: false, error: null })).catch((e) => set({ data: null, loading: false, error: e.message }));
  }, deps); // eslint-disable-line
  useEffect(run, [run]);
  return { ...s, reload: run };
}

export const Status = ({ loading, error, onRetry }) =>
  loading ? <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
  : error ? <div className="card text-sm text-red-600">{error}<button className="ml-3 underline" onClick={onRetry}>Retry</button></div> : null;
export const Empty = ({ text }) => <p className="py-10 text-center text-sm text-slate-500">{text}</p>;
export const Field = ({ label, children }) => <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}</label>;
export const PageHead = ({ title, children }) => <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">{title}</h1><div className="flex flex-wrap gap-2">{children}</div></div>;

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="card max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-b-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button onClick={onClose} aria-label="Close"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}
