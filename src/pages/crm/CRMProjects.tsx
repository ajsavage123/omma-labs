import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";

const statusColors: Record<string, string> = {
  Partial: "bg-amber-500",
  Pending: "bg-gray-500",
  Completed: "bg-green-500",
};

export default function CRMProjects() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.workspace_id) {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_leads').select('*')
      .in('status', ['Won (Converted)', 'Onboarding', 'Completed'])
      .eq('workspace_id', user?.workspace_id)
      .order('created_at', { ascending: false });
    setClients(data || []);
    setLoading(false);
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Onboarding Projects</h1>
        <p className="text-muted-foreground">Active client onboarding workflows</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clients.map((project) => {
           const ms = project.project_milestones_status || { Design:'Pending', Development:'Pending', Testing:'Pending', Delivery:'Pending' };
           const doneCount = Object.values(ms).filter(v => v === 'Completed').length;
           const progress = Math.round((doneCount / 4) * 100);
           const status = progress === 100 ? 'Completed' : progress > 0 ? 'Partial' : 'Pending';

           return (
            <Card key={project.id} className="bg-card border-border p-6 border-2 border-dashed">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{project.company_name} Onboarding</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-3 py-1 rounded text-xs font-medium text-white ${statusColors[status]}`}>
                      {status}
                    </span>
                    <span className="text-sm text-muted-foreground">Stage: {project.status}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="text-sm font-medium text-foreground">
                      {doneCount} / 4 milestones
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    <div className={`w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white border-2 border-card`}>
                      OA
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">Value: ₹{(project.estimated_value || 0).toLocaleString()}</span>
                </div>
              </div>
            </Card>
           );
        })}
        {clients.length === 0 && (
          <p className="text-center py-12 text-muted-foreground col-span-2">No active onboarding projects.</p>
        )}
      </div>
    </div>
  );
}
