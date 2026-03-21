import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dataService } from '@/services/dataService';
import type { Idea } from '@/types';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Lightbulb, 
  Plus, 
  Trash2, 
  Search,
  FileText,
  X
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this idea?')) return;
    try {
      await dataService.deleteIdea(id);
      setIdeas(ideas.filter(i => i.id !== id));
      alert('Idea deleted successfully.');
    } catch (err: any) {
      console.error('Delete failed', err);
      alert('Failed to delete: ' + (err.message || 'Unknown error'));
    }
  };

  const filteredIdeas = ideas.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex flex-col font-sans text-gray-200 overflow-x-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none z-0"></div>

      <header className="sticky top-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-4">
        <button onClick={() => navigate('/')} className="p-2.5 bg-white/5 rounded-2xl border border-white/10 text-gray-400 active:scale-90 transition-all">
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <Lightbulb className="text-yellow-500 h-5 w-5" />
            <h1 className="text-[15px] font-black tracking-tight uppercase text-white">Idea Vault</h1>
          </div>
          <p className="text-[9px] font-bold text-yellow-500 uppercase tracking-[0.2em] mt-0.5">Brainstorm Space</p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all">
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full relative z-10 pt-8">
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#11111d] border border-white/5 rounded-2xl text-[14px] text-white outline-none focus:border-indigo-500/30 transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="text-center py-20 border border-white/5 rounded-3xl bg-[#11111d]/50">
            <Lightbulb className="h-12 w-12 text-gray-600 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-gray-400">Vault is empty</h3>
            <p className="text-sm text-gray-600 mt-2">Start dropping your brilliant ideas here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIdeas.map(idea => (
              <div key={idea.id} className="bg-[#11111d] border border-white/5 p-5 rounded-[24px] flex flex-col hover:border-indigo-500/20 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-10 w-10 flex-shrink-0 bg-yellow-500/10 text-yellow-500 rounded-xl flex items-center justify-center border border-yellow-500/20">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  {(user?.role === 'admin' || user?.id === idea.created_by) && (
                    <button onClick={() => handleDelete(idea.id)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-100 md:opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <h3 className="text-[15px] font-black text-white leading-tight mb-2 line-clamp-2">{idea.name}</h3>
                
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">
                    {new Date(idea.created_at).toLocaleDateString()}
                  </span>
                  {idea.drive_link ? (
                    <a href={idea.drive_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all">
                      <FileText className="h-3 w-3" /> Drive
                    </a>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">No Link</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full sm:max-w-md bg-[#0c0c0e] rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-white/10 overflow-hidden animate-slide-up sm:animate-fade-in">
             <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <h2 className="text-xl font-black text-white tracking-tight">Drop New Idea</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all active:scale-95">
                  <X className="h-4 w-4" />
                </button>
             </div>
             <form onSubmit={handleCreateIdea} className="p-6 space-y-5">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Idea Name <span className="text-indigo-500">*</span></label>
                  <input
                    type="text" required value={newName} onChange={e => setNewName(e.target.value)}
                    className="w-full text-sm px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                    placeholder="E.g. Lunar colony marketplace"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Google Drive Notes Link (Optional)</label>
                  <input
                    type="url" value={newLink} onChange={e => setNewLink(e.target.value)}
                    className="w-full text-sm px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                    placeholder="https://docs.google.com/..."
                  />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={creating || !newName} className="w-full p-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all">
                    {creating ? 'Saving...' : 'Save to Vault'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
