import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";

export function ProtectedRoute() {
  const { user, supabaseUser, loading } = useAuth();

  if (loading) {
    return <div className="flex flex-col items-center justify-center h-screen bg-[#0a0f1c] text-indigo-200">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
      Loading Workspace...
    </div>;
  }

  if (!supabaseUser) {
    return <Navigate to="/login" replace />;
  }
  // If they are logged in but don't have a public.user record OR missing workspace
  if (!loading && (!user || !user.workspace_id)) {
     return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex flex-col items-center justify-center h-screen bg-[#0a0f1c] text-indigo-200">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
       Loading Admin...
    </div>;
  }

  // Double check workspace again just in case, though ProtectedRoute should catch it
  if (!user || user.role !== 'admin' || !user.workspace_id) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
