import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dataService } from '@/services/dataService';
import type { Idea } from '@/types';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Search,
  X,
  ExternalLink,
  Wrench
} from 'lucide-react';

export default function IdeaVaultPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLink, setNewLink] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user?.workspace_id) {
      fetchIdeas();
    }
  }, [user?.workspace_id]);

  const fetchIdeas = async () => {
    if (!user?.workspace_id) return;
    try {
      const data = await dataService.getIdeas(user.workspace_id);
      setIdeas(data);
    } catch (err) {
      console.error('Failed to load ideas', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.workspace_id || !newName.trim()) return;
    
    setCreating(true);
    try {
      await dataService.createIdea(newName, newLink, user.workspace_id);
      setIsModalOpen(false);
      setNewName('');
      setNewLink('');
      fetchIdeas();
    } catch (err) {
      console.error('Creation failed', err);
      alert('Failed to save idea');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this tool?')) return;
    try {
      await dataService.deleteIdea(id);
      setIdeas(ideas.filter(i => i.id !== id));
    } catch (err: any) {
      console.error('Delete failed', err);
      alert('Failed to delete: ' + (err.message || 'Unknown error'));
    }
  };

  const quotationIdea: Idea = {
    id: 'builtin-quotation',
    name: 'Quotation Generator',
    drive_link: '/quotation',
    created_at: new Date().toISOString(),
    created_by: 'system',
    workspace_id: user?.workspace_id || 'system'
  };

  const allIdeas = [quotationIdea, ...ideas];
  const filteredIdeas = allIdeas.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col font-sans text-gray-200 overflow-x-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none z-0"></div>

      <header className="sticky top-0 z-40 bg-[#0c0c0e]/90 backdrop-blur-2xl border-b border-white/5 h-16 flex items-center justify-between px-6">
        <button onClick={() => navigate('/')} className="p-2.5 bg-white/5 rounded-2xl border border-white/10 text-gray-400 hover:text-white active:scale-95 transition-all">
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="flex flex-col items-center">
          <h1 className="text-[14px] font-black tracking-tight uppercase text-white">Tools Space</h1>
          <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.2em] mt-0.5">Asset Framework</p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all">
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 p-5 md:p-10 max-w-7xl mx-auto w-full relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-white">Resource Vault</h2>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Managing <span className="text-emerald-400">Builder Assets</span></p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Filter tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-[#11111d] border border-white/5 rounded-2xl text-[13px] text-white outline-none focus:border-emerald-500/40 transition-all font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500 border-r-2 border-transparent"></div>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-gray-600">Accessing Vault...</p>
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="text-center py-24 border border-white/5 rounded-[40px] bg-[#11111d]/30 backdrop-blur-sm">
            <div className="mx-auto w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/5">
              <Wrench className="h-8 w-8 text-gray-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-400">No Tools Registered</h3>
            <p className="text-sm text-gray-600 mt-2 max-w-xs mx-auto font-medium">Your tool repository is currently empty. Click the plus icon to add your first asset.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredIdeas.map(idea => (
              <div 
                key={idea.id} 
                className="group relative flex flex-col bg-[#11111d] border border-white/5 rounded-[22px] overflow-hidden transition-all hover:translate-y-[-4px] active:scale-[0.98] cursor-pointer"
                onClick={() => idea.drive_link && window.open(idea.drive_link, '_blank')}
              >
                {/* Top accent bar */}
                <div className="h-[4px] w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400 opacity-80" />
                
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-5">
                    <div className="h-11 w-11 bg-emerald-500/10 text-emerald-400 rounded-[14px] flex items-center justify-center border border-emerald-500/20 shadow-inner">
                      <Wrench className="h-5 w-5" />
                    </div>
                    {(user?.role === 'admin' || user?.id === idea.created_by) && (
                      <button 
                        onClick={(e) => handleDelete(idea.id, e)} 
                        className="p-2 text-gray-700 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-white leading-tight mb-3 group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {idea.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mb-6">
                    <div className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-300 uppercase tracking-widest">
                      Asset
                    </div>
                    <div className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                      Module
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-5 flex items-center justify-between border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Deployment</span>
                      <span className="text-[11px] font-bold text-gray-400">
                        {new Date(idea.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    
                    {idea.drive_link ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        Launch <ExternalLink className="h-3 w-3" />
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Standalone</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-fade-in" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#0c0c0e] rounded-[32px] shadow-2xl border border-white/10 overflow-hidden animate-modal-in">
             <div className="p-8 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Register Tool</h2>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.2em] mt-1">Expanding Ooma Ecosystem</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2.5 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all">
                  <X className="h-5 w-5" />
                </button>
             </div>
             
             <form onSubmit={handleCreateIdea} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">Tool Identity <span className="text-red-500">*</span></label>
                  <input
                    type="text" required value={newName} onChange={e => setNewName(e.target.value)}
                    className="w-full text-[13px] font-semibold px-5 py-4 bg-white/[0.02] border border-white/10 rounded-[18px] text-white outline-none focus:border-emerald-500/50 focus:bg-white/[0.04] transition-all"
                    placeholder="E.g. AI Workflow Optimizer"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">Access Protocol (URL)</label>
                  <input
                    type="url" value={newLink} onChange={e => setNewLink(e.target.value)}
                    className="w-full text-[13px] font-semibold px-5 py-4 bg-white/[0.02] border border-white/10 rounded-[18px] text-white outline-none focus:border-emerald-500/50 focus:bg-white/[0.04] transition-all"
                    placeholder="https://..."
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={creating || !newName} 
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-[20px] font-black uppercase tracking-widest text-[11px] shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
                  >
                    {creating ? 'Processing...' : 'Authorize Tool'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
