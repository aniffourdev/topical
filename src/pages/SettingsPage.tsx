import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function SettingsPage() {
  const [profile, setProfile] = useState<any>({});
  const [settings, setSettings] = useState<any>({ preferred_ai_provider: 'gemini' });

  useEffect(() => { (async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle()
    ]);
    setProfile(p || {}); setSettings(s || { user_id: user.id, preferred_ai_provider: 'gemini' });
  })(); }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    await supabase.from('profiles').update({ full_name: profile.full_name, email: profile.email }).eq('id', profile.id);
    await supabase.from('user_settings').upsert(settings, { onConflict: 'user_id' });
    alert('Saved');
  };

  const testWp = async () => {
    const creds = btoa(`${settings.wp_username || ''}:${settings.wp_app_password || ''}`);
    const res = await fetch(`${settings.wp_site_url}/wp-json/wp/v2/users/me`, { headers: { Authorization: `Basic ${creds}` } });
    alert(res.ok ? 'Connected' : await res.text());
  };

  return <div className="p-6"><form className="card max-w-3xl space-y-3" onSubmit={save}>
    <h1 className="text-xl font-semibold">Settings</h1>
    <input className="input" placeholder="Full name" value={profile.full_name||''} onChange={(e)=>setProfile({...profile,full_name:e.target.value})} />
    <input className="input" placeholder="Email" value={profile.email||''} onChange={(e)=>setProfile({...profile,email:e.target.value})} />
    {['gemini_api_key','groq_api_key','openai_api_key','anthropic_api_key'].map((k)=><div key={k}><input type="password" className="input" placeholder={k} value={settings[k]||''} onChange={(e)=>setSettings({...settings,[k]:e.target.value})} />{settings[k] && <span className="text-xs text-success">Active</span>}</div>)}
    <div className="text-sm">Trial usage: {profile.free_requests_used || 0}/3 <button type="button" className="text-primary">Coming Soon</button></div>
    <button className="btn btn-primary">Save</button>
    <button type="button" className="btn" onClick={testWp}>Test Connection</button>
  </form></div>;
}
