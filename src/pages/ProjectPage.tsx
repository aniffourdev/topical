import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { callAI } from '../lib/ai';
import { batches, parseKeywordCsv, ParsedKeyword } from '../lib/csv';
import { buildBriefPrompt, buildManualPrompt } from '../lib/prompts';
import { supabase } from '../lib/supabase';
import { AIProvider, Cluster, Pillar, Project } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export function ProjectPage() {
  const { projectId = '' } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [tab, setTab] = useState<'manual'|'csv'>('manual');
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [keyword, setKeyword] = useState('');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [csvRows, setCsvRows] = useState<ParsedKeyword[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    const [{ data: proj }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('pillars').select('*').eq('project_id', projectId),
      supabase.from('clusters').select('*').eq('project_id', projectId)
    ]);
    const clusters = (c ?? []) as Cluster[];
    const merged = ((p ?? []) as Pillar[]).map((pill) => ({ ...pill, clusters: clusters.filter((x) => x.pillar_id === pill.id) }));
    setProject(proj as Project);
    setPillars(merged);
  };

  useEffect(() => { load(); }, [projectId]);

  const runManual = async () => {
    setLoading(true); setError('');
    try {
      const key = await getApiKey(provider);
      const generated = await callAI(provider, key, buildManualPrompt(keyword, count));
      const user = (await supabase.auth.getUser()).data.user;
      await supabase.from('pillars').insert(generated.map((g: any) => ({
        project_id: projectId, user_id: user?.id, title: g.title, description: g.description, url_slug: g.urlSlug, focus_keyword: g.focusKeyword,
        search_volume: Number(String(g.estimatedSearchVolume).replace(/[^0-9]/g, '')) || 0, generation_method: 'manual'
      })));
      await load();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const runCsv = async () => {
    setLoading(true); setError('');
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const key = await getApiKey(provider);
      const allPillars: any[] = [];
      for (const chunk of batches(csvRows, 200)) {
        const prompt = `You are an expert SEO strategist specializing in topical authority and keyword clustering.\n\nI have the following keywords from Google Keyword Planner for the niche '${project?.niche}'. Analyze these keywords and organize them into a topical authority structure.\n\nKEYWORDS (format: keyword | monthly searches):\n${chunk.map((k)=>`${k.keyword} | ${k.searchVolume}`).join('\n')}\n\nInstructions:\n1. Group related keywords into PILLAR topics (broad parent topics, aim for 5-15 pillars total depending on keyword count)\n2. Under each pillar, assign CLUSTER keywords as supporting articles\n3. Use the actual keywords from the list as focus keywords — do not invent new ones\n4. Prioritize keywords with higher search volume for pillar assignments\n5. Every keyword in the list should be assigned to either a pillar or a cluster\n\nReturn ONLY a valid JSON object in this exact structure, no markdown, no explanation.`;
        const payload = await callAI(provider, key, prompt);
        allPillars.push(...payload.pillars);
      }
      const inserted = await supabase.from('pillars').insert(allPillars.map((p) => ({ project_id: projectId, user_id: user?.id, title: p.title, description: p.description, url_slug: p.urlSlug, focus_keyword: p.focusKeyword, search_volume: p.searchVolume, generation_method: 'csv_upload' })).select('id,title'));
      const clusterRows: any[] = [];
      allPillars.forEach((p, i) => p.clusters.forEach((c: any) => clusterRows.push({ pillar_id: inserted.data?.[i]?.id, project_id: projectId, user_id: user?.id, title: c.title, description: c.description, url_slug: c.urlSlug, focus_keyword: c.focusKeyword, search_volume: c.searchVolume })));
      await supabase.from('clusters').insert(clusterRows);
      await load();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const generateBrief = async (type: 'pillar'|'cluster', row: any, parent?: Pillar) => {
    const key = await getApiKey(provider);
    const brief = await callAI(provider, key, buildBriefPrompt({ type, title: row.title, keyword: row.focus_keyword || '', niche: project?.niche || '', pillar: parent?.title }));
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from('article_briefs').upsert({ content_id: row.id, content_type: type, project_id: projectId, user_id: user?.id, title: row.title, focus_keyword: row.focus_keyword, secondary_keywords: brief.secondary_keywords, word_count_target: brief.word_count_target, outline: brief.outline, meta_description: brief.meta_description });
    alert('Brief generated');
  };

  const writePublish = async (type: 'pillar'|'cluster', row: any, parent?: Pillar) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user || !project) return;
    const { data: profile } = await supabase.from('profiles').select('free_requests_used,subscription_status').eq('id', user.id).single();
    if ((profile?.free_requests_used ?? 0) >= 3 && profile?.subscription_status !== 'active') return alert('Coming soon: Upgrade required');
    await supabase.from('profiles').update({ free_requests_used: (profile?.free_requests_used ?? 0) + 1 }).eq('id', user.id);
    await supabase.from(type === 'pillar' ? 'pillars' : 'clusters').update({ article_status: 'writing' }).eq('id', row.id);
    const { data: brief } = await supabase.from('article_briefs').select('*').eq('content_id', row.id).eq('content_type', type).single();
    const payload = {
      saas_record_id: row.id, saas_content_type: type, saas_project_id: projectId, saas_callback_url: `${window.location.origin}/api/n8n-callback`,
      Title: row.title, 'Focus Keywords': row.focus_keyword, 'Secondary Keywords': (brief?.secondary_keywords || []).join(','), 'Article Type': type === 'pillar' ? 'Pillar' : 'Cluster',
      'Pillar Topic': type === 'pillar' ? row.title : parent?.title, 'URL Slug': row.url_slug, 'Word Count': brief?.word_count_target, 'Meta Description': brief?.meta_description,
      Outline: JSON.stringify(brief?.outline || []), 'WP Site URL': project.wp_site_url, 'WP Username': project.wp_username, 'WP App Password': project.wp_app_password
    };
    await supabase.from('workflow_history').insert({ user_id: user.id, project_id: projectId, content_id: row.id, content_type: type, webhook_url: project.n8n_webhook_url, payload_sent: payload, status: 'sent' });
    const res = await fetch(project.n8n_webhook_url || '', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) await supabase.from(type === 'pillar' ? 'pillars' : 'clusters').update({ article_status: 'failed' }).eq('id', row.id);
    await load();
  };

  const exportCsv = () => {
    const lines = ['type,title,keyword,volume,status,url'];
    pillars.forEach((p) => {
      lines.push(`pillar,"${p.title}","${p.focus_keyword || ''}",${p.search_volume || 0},${p.article_status},${p.wp_post_url || ''}`);
      (p.clusters || []).forEach((c) => lines.push(`cluster,"${c.title}","${c.focus_keyword || ''}",${c.search_volume || 0},${c.article_status},${c.wp_post_url || ''}`));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'topical-map.csv'; a.click();
  };

  const preview = useMemo(() => csvRows.slice(0, 10), [csvRows]);

  return <div className="p-6 space-y-4">
    <div className="card">
      <div className="flex gap-2 mb-3"><button className="btn" onClick={()=>setTab('manual')}>Manual Keyword Input</button><button className="btn" onClick={()=>setTab('csv')}>Upload Keyword Planner CSV</button></div>
      <select className="input mb-2" value={provider} onChange={(e)=>setProvider(e.target.value as AIProvider)}><option>gemini</option><option>groq</option><option>openai</option><option>anthropic</option></select>
      {tab==='manual' ? <div className="space-y-2"><input className="input" placeholder="Enter your niche keyword" value={keyword} onChange={(e)=>setKeyword(e.target.value)} /><input className="input" type="number" value={count} max={20} onChange={(e)=>setCount(Number(e.target.value))} /><button disabled={loading} className="btn btn-primary" onClick={runManual}>{loading?'Generating with AI... Please wait.':'Generate Topical Map'}</button></div> :
      <div className="space-y-2"><input type="file" accept=".csv" onChange={async (e)=>{const file=e.target.files?.[0]; if(file) setCsvRows(await parseKeywordCsv(file));}} />
      <p>{csvRows.length} valid keywords detected</p><table className="w-full text-sm">{preview.map((r)=><tr key={r.keyword}><td>{r.keyword}</td><td>{r.searchVolume}</td></tr>)}</table>
      <button disabled={loading || !csvRows.length} className="btn btn-primary" onClick={runCsv}>{loading?'Generating with AI... Please wait.':'Generate Topical Map from Keywords'}</button></div>}
      {error && <p className="text-error">{error}</p>}
    </div>
    <div className="flex justify-between"><h2 className="text-xl font-semibold">Topical Map</h2><button className="btn" onClick={exportCsv}>Export CSV</button></div>
    {!pillars.length ? <div className="card">Generate your first topical map ↑</div> : <div className="space-y-3">{pillars.map((p)=><div className="card" key={p.id}><div className="flex justify-between"><div><h3 className="font-semibold">{p.title}</h3><p className="text-sm">{p.focus_keyword} · {p.search_volume}</p></div><div className="flex items-center gap-2"><StatusBadge status={p.article_status} url={p.wp_post_url} /><button className="btn" onClick={()=>generateBrief('pillar', p)}>Generate Brief</button><button className="btn btn-primary" onClick={()=>writePublish('pillar', p)}>Write & Publish</button></div></div>
    <div className="mt-2 pl-4 space-y-2">{(p.clusters||[]).map((c)=><div key={c.id} className="flex justify-between border rounded p-2"><div>{c.title}</div><div className="flex gap-2"><StatusBadge status={c.article_status} url={c.wp_post_url} /><button className="btn" onClick={()=>generateBrief('cluster', c, p)}>Generate Brief</button><button className="btn btn-primary" onClick={()=>writePublish('cluster', c, p)}>Write & Publish</button></div></div>)}</div>
    </div>)}</div>}
  </div>;
}

async function getApiKey(provider: AIProvider): Promise<string> {
  const user = (await supabase.auth.getUser()).data.user;
  const { data } = await supabase.from('user_settings').select('*').eq('user_id', user?.id).single();
  if (!data) throw new Error('No AI settings found');
  const map: Record<AIProvider, string> = { gemini: data.gemini_api_key, groq: data.groq_api_key, openai: data.openai_api_key, anthropic: data.anthropic_api_key };
  if (!map[provider]) throw new Error(`Missing ${provider} key in settings`);
  return map[provider];
}
