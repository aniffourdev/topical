import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { ProjectPage } from './pages/ProjectPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const location = useLocation();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session && location.pathname === '/') window.location.href = '/dashboard'; }, [session, location.pathname]);

  return <div>
    {session && <nav className="p-4 bg-surface border-b flex gap-3"><Link to="/dashboard">Dashboard</Link><Link to="/settings">Settings</Link><button onClick={()=>supabase.auth.signOut()}>Sign out</button></nav>}
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/dashboard" element={<ProtectedRoute session={session}><DashboardPage /></ProtectedRoute>} />
      <Route path="/projects/new" element={<ProtectedRoute session={session}><NewProjectPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId" element={<ProtectedRoute session={session}><ProjectPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute session={session}><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </div>;
}
