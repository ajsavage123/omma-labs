import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";

export default function CRMNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.workspace_id) {
      fetchNotes();
    }
  }, [user]);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_activities')
      .select('*, crm_leads(company_name, contact_person)')
      .eq('activity_type', 'note')
      .order('created_at', { ascending: false });
    setNotes(data || []);
    setLoading(false);
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Notes</h1>
        <p className="text-muted-foreground">All notes attached to leads</p>
      </div>

      <div className="space-y-4">
        {notes.map((note) => (
          <Card key={note.id} className="bg-card border-border p-6">
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-foreground leading-relaxed">{note.description}</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-foreground">{note.crm_leads?.company_name}</p>
                <p className="text-muted-foreground">{note.crm_leads?.contact_person}</p>
              </div>
              <p className="text-muted-foreground">{new Date(note.created_at).toLocaleDateString()}</p>
            </div>
          </Card>
        ))}
        {notes.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No notes found.</p>
        )}
      </div>
    </div>
  );
}
