import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ProtectedRoute, AdminRoute } from '@/components/AuthGuard';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProjectWorkspacePage from '@/pages/ProjectWorkspacePage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import OnboardingPage from '@/pages/OnboardingPage';

// Helper for the Onboarding route to ensure they are logged in to Supabase first
function OnboardingRoute() {
  const { supabaseUser, loading, user } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!supabaseUser) {
    return <Navigate to="/login" replace />;
  }
  
  // If they already have a complete user record WITH a workspace, kick them to dashboard
  if (user && user.workspace_id) {
    return <Navigate to="/" replace />;
  }
  
  return <OnboardingPage />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingRoute />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/project/:id" element={<ProjectWorkspacePage />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
