import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dataService } from '@/services/dataService';
import type { ClientContact } from '@/types';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Users, 
  Plus, 
  Trash2, 
  Phone,
  Building2,
  Search,
  Mail,
  Info,
  ExternalLink,
  X
} from 'lucide-react';

export default function ClientContactsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAbout, setNewAbout] = useState('');
  const [newStatus, setNewStatus] = useState<'online' | 'offline'>('offline');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user?.workspace_id) {
      fetchContacts();
    }
  }, [user?.workspace_id]);

  const fetchContacts = async () => {
    if (!user?.workspace_id) return;
    try {
      const data = await dataService.getClientContacts(user.workspace_id);
      setContacts(data);
    } catch (err) {
      console.error('Failed to load contacts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.workspace_id || !newName.trim()) return;
    
    setCreating(true);
    try {
      await dataService.createClientContact(newName, newNumber, newWebsite, newEmail, newAbout, newStatus, user.workspace_id);
      setIsModalOpen(false);
      setNewName('');
      setNewNumber('');
      setNewWebsite('');
      setNewEmail('');
      setNewAbout('');
      setNewStatus('offline');
      fetchContacts();
    } catch (err) {
      console.error('Creation failed', err);
      alert('Failed to save contact');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await dataService.deleteClientContact(id);
      setContacts(contacts.filter(c => c.id !== id));
      alert('Contact deleted successfully');
    } catch (err: any) {
      console.error('Delete failed', err);
      alert('Failed to delete: ' + (err.message || 'Unknown error'));
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.contact_number?.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex flex-col font-sans text-gray-200 overflow-x-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[150px] rounded-full pointer-events-none z-0"></div>

      <header className="sticky top-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-4">
        <button onClick={() => navigate('/')} className="p-2.5 bg-white/5 rounded-2xl border border-white/10 text-gray-400 active:scale-90 transition-all">
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <Building2 className="text-emerald-500 h-5 w-5" />
            <h1 className="text-[15px] font-black tracking-tight uppercase text-white">Directory</h1>
          </div>
          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-0.5">Client Roster</p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all">
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full relative z-10 pt-8">
        <div className="relative mb-8">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#11111d] border border-white/5 rounded-2xl text-[14px] text-white outline-none focus:border-emerald-500/30 transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-20 border border-white/5 rounded-3xl bg-[#11111d]/50">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-gray-400">No contacts yet</h3>
            <p className="text-sm text-gray-600 mt-2">Build your client directory here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredContacts.map(contact => (
              <div key={contact.id} className="bg-[#11111d] border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:border-emerald-500/20 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 flex-shrink-0 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center border border-emerald-500/20 font-black text-lg">
                    {contact.name.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-white leading-tight mb-1 flex items-center gap-2">
                       {contact.name}
                       {contact.status === 'online' ? (
                         <div className="flex flex-col items-center justify-center relative outline-none" title="Online">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                         </div>
                       ) : (
                         <div className="relative inline-flex rounded-full h-2 w-2 bg-gray-600" title="Offline"></div>
                       )}
                    </h3>
                    <div className="flex flex-wrap gap-4 mb-2">
                      {contact.contact_number && (
                        <span className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-gray-500 tracking-wider">
                          <Phone className="h-3 w-3" /> {contact.contact_number}
                        </span>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-gray-400 hover:text-white tracking-wider transition-colors">
                          <Mail className="h-3 w-3" /> {contact.email}
                        </a>
                      )}
                      {contact.website_link && (
                        <a href={contact.website_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-blue-400 hover:text-blue-300 tracking-wider">
                          <ExternalLink className="h-3 w-3" /> Website
                        </a>
                      )}
                    </div>
                    {contact.about && (
                      <p className="text-xs text-gray-400 leading-relaxed max-w-lg flex items-start mt-1">
                        <Info className="h-3.5 w-3.5 mr-1.5 shrink-0 mt-0.5 text-emerald-500/50" />
                        {contact.about}
                      </p>
                    )}
                  </div>
                </div>
                
                {(user?.role === 'admin' || user?.id === contact.created_by) && (
                  <button onClick={() => handleDelete(contact.id)} className="p-2.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-100 md:opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
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
                <h2 className="text-xl font-black text-white tracking-tight">Add New Client</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all active:scale-95">
                  <X className="h-4 w-4" />
                </button>
             </div>
             <form onSubmit={handleCreateContact} className="p-6 space-y-5">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Company / Name <span className="text-emerald-500">*</span></label>
                  <input
                    type="text" required value={newName} onChange={e => setNewName(e.target.value)}
                    className="w-full text-sm px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="E.g. Lunar Corp"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Phone Number (Optional)</label>
                  <input
                    type="tel" value={newNumber} onChange={e => setNewNumber(e.target.value)}
                    className="w-full text-sm px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Website URL (Optional)</label>
                  <input
                    type="url" value={newWebsite} onChange={e => setNewWebsite(e.target.value)}
                    className="w-full text-sm px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">Email Address (Optional)</label>
                  <input
                    type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    className="w-full text-sm px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                    placeholder="contact@company.com"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block ml-1">About / Notes (Optional)</label>
                  <textarea 
                    value={newAbout} onChange={e => setNewAbout(e.target.value)}
                    className="w-full text-sm px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 h-20 resize-none"
                    placeholder="Brief description or notes about this client..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block ml-1">Current Status</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm font-black text-gray-300 cursor-pointer">
                      <input type="radio" name="status" value="online" checked={newStatus === 'online'} onChange={() => setNewStatus('online')} className="accent-emerald-500" />
                      Online
                    </label>
                    <label className="flex items-center gap-2 text-sm font-black text-gray-500 cursor-pointer">
                      <input type="radio" name="status" value="offline" checked={newStatus === 'offline'} onChange={() => setNewStatus('offline')} className="accent-gray-500" />
                      Offline
                    </label>
                  </div>
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={creating || !newName} className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all">
                    {creating ? 'Saving...' : 'Add to Directory'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
