import { Routes, Route, Navigate } from 'react-router-dom';
import CRMLayout from '@/components/crm/CRMLayout';
import CRMDashboard from './CRMDashboard';
import CRMLeads from './CRMLeads';
import CRMPipeline from './CRMPipeline';
import CRMTasks from './CRMTasks';
import CRMCalendar from './CRMCalendar';
import CRMNotes from './CRMNotes';
import CRMProjects from './CRMProjects';
import CRMReports from './CRMReports';
import CRMSettings from './CRMSettings';

export default function CRMApp() {
  return (
    <CRMLayout>
      <Routes>
        <Route index element={<CRMDashboard />} />
        <Route path="leads" element={<CRMLeads />} />
        <Route path="pipeline" element={<CRMPipeline />} />
        <Route path="tasks" element={<CRMTasks />} />
        <Route path="calendar" element={<CRMCalendar />} />
        <Route path="notes" element={<CRMNotes />} />
        <Route path="projects" element={<CRMProjects />} />
        <Route path="reports" element={<CRMReports />} />
        <Route path="settings" element={<CRMSettings />} />
        <Route path="*" element={<Navigate to="/crm" replace />} />
      </Routes>
    </CRMLayout>
  );
}
