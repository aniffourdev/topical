import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

export function ProtectedRoute({ session, children }: { session: any; children: ReactNode }) {
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
}
