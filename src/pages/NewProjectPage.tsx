import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function NewProjectPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name:'', niche:'', description:'', wp_site_url:'', wp_username:'', wp_app_password:'', n8n_webhook_url:'' });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data, error } = await supabase.from('projects').insert({ ...form, user_id: user.id }).select('id').single();
    if (!error && data) nav(`/projects/${data.id}`);
  };

  return <div className="p-6"><form className="card max-w-2xl space-y-3" onSubmit={submit}>
    <h1 className="text-xl font-semibold">Create project</h1>
    {Object.keys(form).map((k)=><input key={k} className="input" placeholder={k.replaceAll('_',' ')} value={(form as any)[k]} onChange={(e)=>setForm({...form,[k]:e.target.value})} />)}
    <button className="btn btn-primary">Save</button>
  </form></div>;
}
