import { useEffect, useState } from 'react';
import { LayoutDashboard, CalendarRange, Receipt, Tags, BarChart3, Settings as Cog } from 'lucide-react';
import Dashboard from './pages/Dashboard.jsx';
import Sessions from './pages/Sessions.jsx';
import Expenses from './pages/Expenses.jsx';
import Categories from './pages/Categories.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';

const NAV = [
  ['dashboard', 'Dashboard', LayoutDashboard, Dashboard], ['sessions', 'Sessions', CalendarRange, Sessions],
  ['expenses', 'Expenses', Receipt, Expenses], ['categories', 'Categories', Tags, Categories],
  ['reports', 'Reports', BarChart3, Reports], ['settings', 'Settings', Cog, Settings],
];

export default function App() {
  const read = () => location.hash.slice(1) || 'dashboard';
  const [page, setPage] = useState(read);
  useEffect(() => { const h = () => setPage(read()); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);
  const Page = (NAV.find((n) => n[0] === page) || NAV[0])[3];
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-1 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
        <p className="mb-4 px-3 text-lg font-bold text-brand">Expense Tracker</p>
        {NAV.map(([id, label, I]) => (
          <a key={id} href={'#' + id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${page === id ? 'bg-brand text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}><I size={18} />{label}</a>
        ))}
      </aside>
      <main className="mx-auto max-w-6xl p-4 pb-24 md:ml-60 md:p-8 md:pb-8"><Page /></main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 md:hidden">
        {NAV.map(([id, label, I]) => (
          <a key={id} href={'#' + id} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${page === id ? 'text-brand' : 'text-slate-500'}`}><I size={20} />{label}</a>
        ))}
      </nav>
    </div>
  );
}
