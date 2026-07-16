import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, username, designation')
          .eq('workspace_id', user.workspace_id);
        
        if (error) throw error;
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
