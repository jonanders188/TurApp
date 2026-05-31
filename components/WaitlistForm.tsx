'use client';

import { useState } from 'react';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');

    const response = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    setStatus(response.ok ? 'success' : 'error');
    if (response.ok) setEmail('');
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 flex w-full flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="waitlist-email">E-post</label>
      <input
        id="waitlist-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="din@epost.no"
        className="min-w-0 flex-1 rounded-full border border-white/30 bg-white px-5 py-3 text-slate-950 outline-none ring-emerald-300 placeholder:text-slate-400 focus:ring-4"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="rounded-full bg-emerald-600 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
      >
        {status === 'loading' ? 'Sender...' : 'Bli med'}
      </button>
      <div className="min-h-6 sm:basis-full">
        {status === 'success' ? <p className="text-sm text-emerald-100">Takk! Du er på listen.</p> : null}
        {status === 'error' ? <p className="text-sm text-red-100">Noe gikk galt. Prøv igjen.</p> : null}
      </div>
    </form>
  );
}
