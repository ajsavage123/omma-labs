import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute, AdminRoute } from '@/components/AuthGuard';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProjectWorkspacePage from '@/pages/ProjectWorkspacePage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import ChatWidget from '@/components/ChatWidget';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/project/:id" element={<ProjectWorkspacePage />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Route>
          </Route>
        </Routes>
        <ChatWidget />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
