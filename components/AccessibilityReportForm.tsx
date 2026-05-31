'use client';

import { useState } from 'react';

const reportTypes = [
  { value: 'stroller', label: 'Barnevogn' },
  { value: 'wheelchair', label: 'Rullestol' },
  { value: 'surface', label: 'Underlag' },
  { value: 'closed', label: 'Stengt/feil' },
  { value: 'other', label: 'Annet' },
];

export function AccessibilityReportForm({ trailId }: { trailId: string }) {
  const [reportType, setReportType] = useState('stroller');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    const response = await fetch('/api/accessibility-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trail_id: trailId, report_type: reportType, message }),
    });
    setStatus(response.ok ? 'success' : 'error');
    if (response.ok) setMessage('');
  }

  return (
    <form onSubmit={submit} className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-emerald-900/10">
      <h2 className="text-2xl font-black tracking-tight text-slate-950">Meld fra om turen</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Hjelp oss å kvalitetssikre barnevogn, rullestol, underlag og praktisk info.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {reportTypes.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setReportType(type.value)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${reportType === type.value ? 'bg-emerald-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {type.label}
          </button>
        ))}
      </div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        required
        rows={4}
        placeholder="Hva bør endres eller sjekkes?"
        className="mt-4 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
      <button type="submit" disabled={status === 'loading'} className="mt-3 rounded-full bg-emerald-950 px-6 py-3 font-black text-white disabled:opacity-60">
        {status === 'loading' ? 'Sender...' : 'Send innspill'}
      </button>
      {status === 'success' ? <p className="mt-3 text-sm font-semibold text-emerald-700">Takk! Innspillet er registrert.</p> : null}
      {status === 'error' ? <p className="mt-3 text-sm font-semibold text-red-700">Noe gikk galt. Sjekk API/Supabase-nøkkel.</p> : null}
    </form>
  );
}
