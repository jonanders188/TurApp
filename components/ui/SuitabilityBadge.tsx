const icons: Record<string, string> = {
  Barnevogn: '◴',
  Bæremeis: '🎒',
  Rullestol: '♿',
  'Lett å gå': '↗',
  Barn: '👧',
  Hund: '🐾',
};

export function SuitabilityBadge({ label, subtle = false }: { label: string; subtle?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${subtle ? 'bg-white/80 text-emerald-950 ring-1 ring-emerald-900/10' : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-900/10'}`}>
      <span aria-hidden="true">{icons[label] ?? '✓'}</span>
      {label}
    </span>
  );
}
