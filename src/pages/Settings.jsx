import { useState } from 'react';
import { useApp, Field, PageHead } from '../ui';

export default function Settings() {
  const { settings, setSettings } = useApp();
  const [key, setKey] = useState(localStorage.getItem('accessKey') || '');
  const set = (k) => (e) => setSettings({ ...settings, [k]: e.target.value });
  return (
    <div>
      <PageHead title="Settings" />
      <div className="card max-w-lg space-y-4">
        <Field label="Currency"><select className="input" value={settings.currency} onChange={set('currency')}>{['USD', 'EUR', 'GBP', 'JPY', 'KHR', 'THB', 'AUD', 'CAD'].map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Theme"><select className="input" value={settings.theme} onChange={set('theme')}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></Field>
        <Field label="Date format"><select className="input" value={settings.dateFormat} onChange={set('dateFormat')}>{['MMM d, yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'].map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Field label="API access key (only if APP_ACCESS_KEY is set on the server)">
          <input type="password" className="input" value={key} placeholder="Stored in this browser only" onChange={(e) => { setKey(e.target.value); localStorage.setItem('accessKey', e.target.value); }} />
        </Field>
      </div>
    </div>
  );
}
