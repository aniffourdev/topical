export function StatusBadge({ status, url }: { status: 'pending'|'writing'|'published'|'failed'; url?: string }) {
  const cls = status === 'published' ? 'bg-green-100 text-green-700' : status === 'writing' ? 'bg-amber-100 text-amber-700' : status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700';
  if (status === 'published' && url) return <a href={url} target="_blank" className={`px-2 py-1 rounded text-xs ${cls}`}>Published</a>;
  return <span className={`px-2 py-1 rounded text-xs ${cls}`}>{status}</span>;
}
