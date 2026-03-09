import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Project } from '../types';

export function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [remaining, setRemaining] = useState(3);

  useEffect(() => {
    (async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      const [{ data: proj }, { data: profile }] = await Promise.all([
        supabase.from('projects').select('*').order('updated_at', { ascending: false }),
        supabase.from('profiles').select('free_requests_used').eq('id', user.id).single()
      ]);
      setProjects((proj ?? []) as Project[]);
      setRemaining(Math.max(0, 3 - (profile?.free_requests_used ?? 0)));
    })();
  }, []);

  return <div className="p-6 space-y-4">
    <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Dashboard</h1><Link to="/projects/new" className="btn btn-primary">New Project</Link></div>
    <div className="card bg-primary-light">{remaining} of 3 free article requests remaining.</div>
    {projects.length === 0 ? <div className="card text-center">Create your first project</div> :
    <div className="grid md:grid-cols-3 gap-4">{projects.map((p)=><Link key={p.id} to={`/projects/${p.id}`} className="card"><h3 className="font-semibold">{p.name}</h3><p>{p.niche}</p></Link>)}</div>}
  </div>;
}
