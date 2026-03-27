import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { 
  Video, 
  Plus, 
  Calendar, 
  ExternalLink, 
  Clock, 
  Trash2, 
  Users,
  LayoutDashboard,
  Search,
  X,
  ChevronLeft
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { OomaLogo } from '@/components/OomaLogo';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/Toast';

interface Meeting {
  id: string;
  title: string;
  description: string;
  meet_link: string;
  scheduled_at: string;
  created_by: string;
  workspace_id: string;
}

export default function MeetingSchedulerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, toast, removeToast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meet_link: '',
    scheduled_at: '',
  });

  useEffect(() => {
    if (user?.workspace_id) {
      fetchMeetings();
    }
  }, [user?.workspace_id]);

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('workspace_id', user?.workspace_id)
        .order('scheduled_at', { ascending: true });

      if (error) {
        // If table doesn't exist yet, we'll handle gracefully
        if (error.code === 'PGRST116' || error.message.includes('not found')) {
           setMeetings([]);
        } else {
           throw error;
        }
      } else {
        setMeetings(data || []);
      }
    } catch (err) {
      console.error('Fetch meetings failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.workspace_id) return;

    try {
      const { error } = await supabase
        .from('meetings')
        .insert({
          ...formData,
          workspace_id: user.workspace_id,
          created_by: user.id
        });

      if (error) throw error;

      toast.success('Meeting Scheduled Successfully');
      setIsModalOpen(false);
      setFormData({ title: '', description: '', meet_link: '', scheduled_at: '' });
      fetchMeetings();
    } catch (err) {
      console.error(err);
      toast.error('Failed to schedule meeting. Ensure you have created the "meetings" table in Supabase.');
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!window.confirm('Cancel this meeting?')) return;
    try {
      const { error } = await supabase.from('meetings').delete().eq('id', id);
      if (error) throw error;
      setMeetings(prev => prev.filter(m => m.id !== id));
      toast.success('Meeting Cancelled');
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const filteredMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex bg-[#050505] text-white overflow-hidden">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {/* Sidebar (Shared) */}
      <aside className="hidden md:flex w-[260px] flex-shrink-0 flex-col bg-[#0c0c0e] border-r border-white/5 h-full">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OomaLogo className="text-[#6366f1]" size={32} />
            <div>
              <h1 className="text-md font-bold tracking-tight text-white">Ooma Workspace</h1>
              <p className="text-[8px] uppercase tracking-[0.2em] font-extrabold text-[#6366f1]">Ooma Workflow</p>
            </div>
          </div>
        </div>
        <nav className="mt-4 px-3 space-y-1.5 overflow-y-auto scrollbar-hide">
          <Link to="/" className="flex items-center px-4 py-3 text-[13px] font-bold text-gray-400 rounded-xl hover:bg-white/[0.02] hover:text-white transition-colors">
            <LayoutDashboard className="mr-3 h-4 w-4" />
            Dashboard
          </Link>
          <Link to="/meetings" className="flex items-center px-4 py-3 text-[13px] font-bold rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Video className="mr-3 h-4 w-4" />
            Meetings
          </Link>
          <Link to="/ideas" className="flex items-center px-4 py-3 text-[13px] font-bold text-gray-400 rounded-xl hover:bg-white/[0.02] hover:text-white transition-colors">
            <Plus className="mr-3 h-4 w-4 text-emerald-500" />
            Tools Space
          </Link>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col pt-4 md:pt-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full px-6 py-4 md:py-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 md:mb-10 gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="md:hidden p-2.5 bg-white/5 border border-white/10 rounded-2xl text-gray-400 active:scale-90 transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3 md:gap-4">
                  <Video className="h-6 w-6 md:h-8 md:w-8 text-indigo-500 hidden sm:block" />
                  Meeting Hub
                </h2>
                <p className="text-[10px] md:text-sm text-gray-400 font-bold uppercase tracking-wider mt-0.5 md:mt-1">Schedule Google Meet sessions</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              {/* Instant Meet Shortcut */}
              <a 
                href="https://meet.google.com/new" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center px-6 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500/10 hover:border-indigo-500/30 text-indigo-400 transition-all gap-3"
              >
                <Plus className="h-4 w-4" />
                Create Instant Meet
              </a>

              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-3"
              >
                <Calendar className="h-4 w-4" />
                Schedule Meeting
              </button>
            </div>
          </div>

          <div className="mb-8 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-[#11111d] border border-white/5 rounded-2xl outline-none focus:border-indigo-500/40 transition-all text-sm font-medium"
            />
          </div>

          {loading ? (
             <div className="py-20 text-center"><div className="animate-spin h-8 w-8 border-b-2 border-indigo-500 mx-auto rounded-full"></div></div>
          ) : filteredMeetings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMeetings.map(meeting => (
                <div key={meeting.id} className="bg-[#11111d] border border-white/5 rounded-[24px] p-6 group hover:border-indigo-500/30 transition-all relative overflow-hidden">
                  {/* Decorative background icon */}
                  <Video className="absolute -bottom-6 -right-6 h-32 w-32 text-white/[0.02] transition-transform group-hover:scale-110" />
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{meeting.title}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-indigo-400 font-black uppercase tracking-widest">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(meeting.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-gray-500 text-sm mb-6 line-clamp-2 min-h-[40px] relative z-10 font-medium">
                    {meeting.description || 'No agenda provided for this session.'}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
                     <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">Workspace Meeting</span>
                     </div>
                     <a 
                       href={meeting.meet_link} 
                       target="_blank" 
                       rel="noreferrer"
                       className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
                     >
                       Join Meeting
                       <ExternalLink className="h-3 w-3" />
                     </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="bg-[#11111d]/50 border-2 border-dashed border-white/5 rounded-3xl py-24 text-center">
                <Video className="h-16 w-16 text-gray-800 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-gray-300 mb-2">No Meetings Scheduled</h3>
                <p className="text-gray-600 max-w-sm mx-auto text-sm">Create an instant meeting or schedule one for the team using Google Meet links.</p>
             </div>
          )}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-[#0c0c0e] border border-white/10 rounded-[32px] p-5 sm:p-8 shadow-2xl animate-in fade-in zoom-in overflow-y-auto max-h-[95vh]">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95 z-20"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-4 mb-6 sm:mb-8">
               <div className="h-12 w-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-500">
                  <Video className="h-6 w-6" />
               </div>
               <div>
                  <h3 className="text-xl font-bold text-white">Schedule Meeting</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Add your Meet link below</p>
               </div>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-3.5 sm:space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Meeting Title</label>
                <input
                  required
                  placeholder="e.g., Sprint Planning"
                  className="w-full px-5 py-4 bg-[#11111d] border border-white/10 rounded-2xl outline-none focus:border-indigo-500/50 transition-all font-medium"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Google Meet Link</label>
                <input
                  required
                  type="url"
                  placeholder="meet.google.com/abc-defg-hij"
                  className="w-full px-5 py-4 bg-[#11111d] border border-white/10 rounded-2xl outline-none focus:border-indigo-500/50 transition-all font-medium text-indigo-400"
                  value={formData.meet_link}
                  onChange={(e) => setFormData({...formData, meet_link: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Time & Date</label>
                  <input
                    required
                    type="datetime-local"
                    className="w-full px-5 py-3 bg-[#11111d] border border-white/10 rounded-xl outline-none focus:border-indigo-500/50 transition-all font-medium [&::-webkit-calendar-picker-indicator]:invert text-sm"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Agenda (Optional)</label>
                <textarea
                  placeholder="What will you discuss?"
                  className="w-full px-5 py-4 bg-[#11111d] border border-white/10 rounded-2xl outline-none focus:border-indigo-500/50 transition-all font-medium h-24"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <button
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 active:scale-95 transition-all mt-4"
              >
                Confirm Scheduling
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
