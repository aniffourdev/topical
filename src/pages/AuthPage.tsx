import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';

export function AuthPage() {
  const [signup, setSignup] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (signup && form.password !== form.confirm) return setError('Passwords do not match');
    if (signup) {
      const { error: upError } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.fullName } } });
      if (upError) setError(upError.message);
      return;
    }
    const { error: inError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    if (inError) setError(inError.message);
  };

  return <div className="min-h-screen grid place-items-center p-6">
    <div className="card max-w-md w-full">
      <h1 className="text-2xl font-bold">TopicMap Pro</h1><p className="text-text-secondary">Build topical authority at scale.</p>
      <form onSubmit={submit} className="space-y-3 mt-4">
        {signup && <input className="input" placeholder="Full name" onChange={(e)=>setForm({...form, fullName:e.target.value})} />}
        <input className="input" placeholder="Email" type="email" onChange={(e)=>setForm({...form, email:e.target.value})} />
        <input className="input" placeholder="Password" type="password" onChange={(e)=>setForm({...form, password:e.target.value})} />
        {signup && <input className="input" placeholder="Confirm password" type="password" onChange={(e)=>setForm({...form, confirm:e.target.value})} />}
        {error && <p className="text-error text-sm">{error}</p>}
        <button className="btn btn-primary w-full">{signup ? 'Sign Up' : 'Sign In'}</button>
      </form>
      <button className="text-primary mt-3" onClick={()=>setSignup(!signup)}>{signup ? 'Already have an account? Sign in' : 'Need an account? Sign up'}</button>
    </div>
  </div>;
}
