import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, Book, Plus, ExternalLink, Trash2, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface DocumentEntry {
  id: string;
  name: string;
  url: string;
  created_at: string;
  workspace_id?: string;
  created_by?: string;
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [docs, setDocs] = useState<DocumentEntry[]>([]);
  const [search, setSearch] = useState('');
  
  // Form setup
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  // Load from Supabase on mount
  useEffect(() => {
    fetchDocs();
  }, [user?.workspace_id]);

  const fetchDocs = async () => {
    if (!user?.workspace_id) return;
    try {
      const { data, error } = await supabase
        .from('library_docs')
        .select('*')
        .eq('workspace_id', user.workspace_id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setDocs(data || []);
    } catch (err: any) {
      console.error('Failed to load library docs', err);
    }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUrl || !user?.workspace_id) return;
    
    // Auto format URL if missing http
    let formattedUrl = newUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      const { data, error } = await supabase
        .from('library_docs')
        .insert([{
           name: newName,
           url: formattedUrl,
           workspace_id: user.workspace_id,
           created_by: user.id
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      setDocs(prev => [data as DocumentEntry, ...prev]);
      setIsModalOpen(false);
      setNewName('');
      setNewUrl('');
    } catch (err: any) {
      console.error('Failed to add document', err);
      alert('Failed to add document to database');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this document permanently?')) {
      try {
        const { error } = await supabase
          .from('library_docs')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setDocs(prev => prev.filter(d => d.id !== id));
      } catch (err: any) {
        console.error('Failed to delete doc', err);
        alert('Failed to delete document from database');
      }
    }
  };

  const filteredDocs = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex flex-col font-sans text-gray-200 selection:bg-indigo-500/30 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>

      <header className="fixed top-0 left-0 right-0 z-[60] bg-[#0c0c0e]/95 backdrop-blur-xl border-b border-white/5 h-16 shrink-0 transition-all flex items-center justify-between px-4">
        <div className="flex items-center">
          <button onClick={() => navigate('/')} className="p-2.5 bg-white/5 rounded-2xl border border-white/10 text-gray-400 active:scale-90 transition-all">
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <Book className="h-5 w-5 text-blue-400" />
            <h1 className="text-[15px] font-black tracking-tight uppercase text-white">Document Library</h1>
          </div>
          <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-0.5">Knowledge Base</p>
        </div>

        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto pt-24 px-4 sm:px-8 max-w-5xl mx-auto w-full relative z-10 pb-20">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
           <div className="relative w-full sm:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-[#11111d] border border-white/5 rounded-2xl text-[14px] outline-none focus:border-blue-500/30 transition-all text-white"
              />
           </div>
           
           <button
             onClick={() => setIsModalOpen(true)}
             className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[11px] uppercase tracking-widest shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.5)] transition-all shrink-0 w-full sm:w-auto justify-center"
           >
             <Plus className="h-4 w-4" strokeWidth={3} />
             Add Document
           </button>
        </div>

        {filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map(doc => (
              <div key={doc.id} className="bg-[#111827]/60 backdrop-blur-xl p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-all group flex flex-col justify-between h-40">
                 <div>
                    <div className="flex items-start justify-between">
                       <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                         <Book className="h-5 w-5 text-blue-400" />
                       </div>
                       {user?.role === 'admin' && (
                         <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 bg-white/5 hover:bg-red-500/10 rounded-lg">
                           <Trash2 className="h-4 w-4" />
                         </button>
                       )}
                    </div>
                    <h3 className="font-bold text-white mt-4 line-clamp-1">{doc.name}</h3>
                 </div>
                 <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-bold text-blue-400 uppercase tracking-wider hover:text-blue-300 transition-colors mt-2">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Document
                 </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl mt-10">
            <Book className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <div className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">Library is Empty</div>
            <p className="text-gray-600 text-sm max-w-sm mx-auto">Store all your important process docs, external links, and guidelines here for the team.</p>
          </div>
        )}

      </main>

      {/* Add Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-[#0c0c0e] rounded-3xl border border-white/10 overflow-hidden animate-fade-in">
             <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-5 border-b border-white/5 text-center">
                <h2 className="text-xl font-black text-white tracking-tight uppercase">Store Document</h2>
             </div>
             
             <form onSubmit={handleAddDoc} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Document Title</label>
                  <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Q3 Marketing Plan" className="w-full bg-white/[0.02] border border-white/10 p-3 rounded-xl outline-none focus:border-blue-500/50 text-[13px] font-medium text-white transition-all" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest ml-1">Resource Link (URL)</label>
                  <input type="text" required value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="google.com/docs/..." className="w-full bg-white/[0.02] border border-white/10 p-3 rounded-xl outline-none focus:border-blue-500/50 text-[13px] font-medium text-white transition-all" />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-600/20 transition-all">
                    Save Doc
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}
