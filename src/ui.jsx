import { cloneElement, createContext, isValidElement, useContext, useEffect, useId, useRef, useState, useCallback } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isValid, parse, parseISO, startOfMonth, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, LoaderCircle, X, Utensils, Car, ShoppingBag, Receipt, HeartPulse, Film, Users, GraduationCap, Package, Home, Plane, Gift } from 'lucide-react';

export const ICONS = { utensils: Utensils, car: Car, 'shopping-bag': ShoppingBag, receipt: Receipt, 'heart-pulse': HeartPulse, film: Film, users: Users, 'graduation-cap': GraduationCap, package: Package, home: Home, plane: Plane, gift: Gift };
export const CatIcon = ({ name, color }) => {
  const I = ICONS[name] || Package;
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: (color || '#64748B') + '22', color: color || '#64748B' }}><I size={18} /></span>;
};

const DEFAULTS = { currency: 'KHR', theme: 'system', dateFormat: 'MMM d, yyyy' };
const SETTINGS_VERSION = '2';
const Ctx = createContext();
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('settings') || '{}');
      if (localStorage.getItem('settingsVersion') !== SETTINGS_VERSION) {
        if (saved.currency === 'USD') saved.currency = 'KHR';
        localStorage.setItem('settingsVersion', SETTINGS_VERSION);
      }
      return { ...DEFAULTS, ...saved };
    } catch { return DEFAULTS; }
  });
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
export function Field({ label, children }) {
  const id = useId();
  const control = isValidElement(children) && children.type !== 'div'
    ? cloneElement(children, { id: children.props.id || id })
    : children;
  return (
    <div className="block text-sm">
      <label className="mb-1 block font-medium" htmlFor={control === children ? undefined : id}>{label}</label>
      {control}
    </div>
  );
}
export const PageHead = ({ title, children }) => <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">{title}</h1><div className="flex flex-wrap gap-2">{children}</div></div>;

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const toIsoDate = (date) => format(date, 'yyyy-MM-dd');
const parseDisplayDate = (text) => {
  const date = parse(text, 'MM/dd/yyyy', new Date());
  return isValid(date) && format(date, 'MM/dd/yyyy') === text ? date : null;
};

export function DateInput({ className = '', value = '', onChange, min, max, required, disabled, id, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const popoverId = `${inputId}-calendar`;
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const [draft, setDraft] = useState(value ? format(parseISO(value), 'MM/dd/yyyy') : '');
  const [month, setMonth] = useState(() => startOfMonth(value ? parseISO(value) : new Date()));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDraft(value ? format(parseISO(value), 'MM/dd/yyyy') : '');
    if (value) setMonth(startOfMonth(parseISO(value)));
  }, [value]);

  useEffect(() => {
    if (!inputRef.current || !draft) return;
    const parsedDate = parseDisplayDate(draft);
    const iso = parsedDate ? toIsoDate(parsedDate) : '';
    inputRef.current.setCustomValidity(
      parsedDate && withinRange(iso) ? '' : 'Enter a valid date in MM/DD/YYYY format.',
    );
  }, [draft, min, max]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const withinRange = (iso) => (!min || iso >= min) && (!max || iso <= max);
  const chooseDate = (date) => {
    const iso = toIsoDate(date);
    if (!withinRange(iso)) return;
    setDraft(format(date, 'MM/dd/yyyy'));
    if (inputRef.current) inputRef.current.setCustomValidity('');
    onChange?.({ target: { value: iso } });
    setOpen(false);
  };
  const handleTextChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
    const text = digits.length > 4
      ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
      : digits.length > 2
        ? `${digits.slice(0, 2)}/${digits.slice(2)}`
        : digits;
    event.target.value = text;
    setDraft(text);
    if (!text) {
      event.target.setCustomValidity('');
      onChange?.({ target: { value: '' } });
      return;
    }
    const parsedDate = parseDisplayDate(text);
    const iso = parsedDate ? toIsoDate(parsedDate) : '';
    const valid = Boolean(parsedDate && withinRange(iso));
    event.target.setCustomValidity(valid ? '' : 'Enter a valid date in MM/DD/YYYY format.');
    if (valid) onChange?.({ target: { value: iso } });
  };

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const selectedDate = value ? parseISO(value) : null;
  const today = new Date();
  const previousMonth = subMonths(month, 1);
  const nextMonth = addMonths(month, 1);
  const canGoBack = !min || toIsoDate(endOfMonth(previousMonth)) >= min;
  const canGoForward = !max || toIsoDate(startOfMonth(nextMonth)) <= max;

  return (
    <span ref={wrapperRef} className={`relative block ${className}`}>
      <input
        {...props}
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="MM/DD/YYYY"
        className="input date-text-input pr-12"
        value={draft}
        required={required}
        disabled={disabled}
        onChange={handleTextChange}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
      />
      <button
        type="button"
        className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 dark:hover:bg-slate-800"
        aria-label="Choose date"
        aria-expanded={open}
        aria-controls={popoverId}
        disabled={disabled}
        onClick={() => {
          if (!open) {
            setMonth(startOfMonth(value ? parseISO(value) : new Date()));
          }
          setOpen(!open);
        }}
      >
        <CalendarDays size={18} aria-hidden="true" />
      </button>
      {open && (
        <div id={popoverId} role="dialog" aria-label="Choose a date" className="date-calendar absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className="calendar-nav" aria-label="Previous month" disabled={!canGoBack} onClick={() => setMonth(previousMonth)}><ChevronLeft size={18} /></button>
            <h2 className="text-sm font-semibold" aria-live="polite">{format(month, 'MMMM yyyy', { locale: enUS })}</h2>
            <button type="button" className="calendar-nav" aria-label="Next month" disabled={!canGoForward} onClick={() => setMonth(nextMonth)}><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-slate-500" role="row">
            {WEEKDAYS.map((day) => <span key={day} className="py-1" role="columnheader">{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1" role="grid">
            {Array.from({ length: getDay(startOfMonth(month)) }, (_, index) => <span key={`empty-${index}`} role="presentation" />)}
            {days.map((day) => {
              const iso = toIsoDate(day);
              const selectable = withinRange(iso);
              const selected = selectedDate && toIsoDate(selectedDate) === iso;
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  className={`calendar-day ${selected ? 'calendar-day-selected' : ''} ${format(day, 'yyyy-MM-dd') === toIsoDate(today) ? 'calendar-day-today' : ''}`}
                  aria-label={format(day, 'MMMM d, yyyy', { locale: enUS })}
                  aria-pressed={Boolean(selected)}
                  disabled={!selectable}
                  onClick={() => chooseDate(day)}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
          <button type="button" className="mt-2 w-full rounded-lg py-2 text-sm font-medium text-brand hover:bg-slate-100 dark:hover:bg-slate-800" disabled={!withinRange(toIsoDate(today))} onClick={() => chooseDate(today)}>Today</button>
        </div>
      )}
    </span>
  );
}

export function SaveButton({ loading }) {
  return (
    <button className="btn btn-primary w-full" type="submit" disabled={loading}>
      {loading && <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />}
      {loading ? 'Saving…' : 'Save'}
    </button>
  );
}

export function Modal({ title, onClose, busy = false, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => { if (!busy) onClose(); }}>
      <div className="card max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-5 sm:rounded-b-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button onClick={onClose} disabled={busy} aria-label="Close"><X size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}
