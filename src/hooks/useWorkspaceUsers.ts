import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { useAuth } from '@/hooks/useAuth';

export function useWorkspaceUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function fetchUsers() {
      if (!user?.workspace_id) {
        setLoading(false);
        return;
      }
      try {
        const data = await adminService.getTeamMembers(user.workspace_id);
        setUsers(data || []);
      } catch (err) {
        console.error("Error fetching workspace users:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [user?.workspace_id]);

  return { users, loading, error };
}
