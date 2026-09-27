import { useState, useEffect } from 'react';
import { 
  Search, X, ExternalLink, Code, Layers, TrendingUp, Cpu, 
  BookOpen, Sparkles, Settings, FileText, ShieldCheck 
} from 'lucide-react';
import { supportLinksService } from '@/services/supportLinksService';
import type { SupportLink } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SupportTopicPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminManager?: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Sales & Business': TrendingUp,
  'Engineering & Development': Code,
  'Research & Innovation Labs': Sparkles,
  'code': Code,
  'trending': TrendingUp,
  'layers': Layers,
  'cpu': Cpu,
  'book': BookOpen,
  'file': FileText
};

export default function SupportTopicPickerModal({
  isOpen,
  onClose,
  onOpenAdminManager
}: SupportTopicPickerModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [links, setLinks] = useState<SupportLink[]>(() => supportLinksService.getStoredLinks());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (user?.workspace_id) {
      supportLinksService.fetchWorkspaceLinks(user.workspace_id).then(fetched => {
        setLinks(fetched);
      });
    }

    const handleLinksChanged = (e: CustomEvent) => {
      if (e.detail) setLinks(e.detail);
    };

    window.addEventListener('workspace-support-links-changed' as any, handleLinksChanged);
    return () => {
      window.removeEventListener('workspace-support-links-changed' as any, handleLinksChanged);
    };
  }, [user?.workspace_id]);

  if (!isOpen) return null;

  const categories = ['All', ...Array.from(new Set(links.map(l => l.category || 'General')))];

  const filteredLinks = links.filter(link => {
    const matchesCategory = selectedCategory === 'All' || link.category === selectedCategory;
    const matchesSearch = 
      link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (link.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (link.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleLaunchTopic = (link: SupportLink) => {
    const popup = supportLinksService.launchSupportCompanion(link.url, link.title);
    if (!popup || popup.closed) {
      toast.error('Popup blocked! Please allow popups for this site in your browser to open Support AI.');
    } else {
      toast.success(`Opening "${link.title}" AI Companion...`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-[#0d0d12] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[85vh] text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 bg-[#12121c] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <img src="/robot-assistant.png" alt="Support Bot" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>Pick Support Topic</span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  AI ASSISTANT
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 font-medium">Select a specialized knowledge base or documentation topic provided by your admin</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-95"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="p-4 bg-[#0d0d12] border-b border-white/5 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search topics by name, category, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#141420] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Topic Links List / Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
          {filteredLinks.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              <img src="/robot-assistant.png" alt="No links" className="w-10 h-10 object-contain mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-white mb-1">No Support Topics Found</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                No support knowledge bases match your query "{searchQuery}".
                {isAdmin && " You can add custom links using the Admin Manager button below."}
              </p>
            </div>
          ) : (
            filteredLinks.map((link) => {
              const IconComp = CATEGORY_ICONS[link.category] || CATEGORY_ICONS[link.icon || 'code'] || Sparkles;
              return (
                <div
                  key={link.id}
                  className="group bg-[#13131c] border border-white/10 hover:border-purple-500/40 rounded-xl sm:rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 shrink-0 group-hover:scale-105 transition-transform">
                      <IconComp size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                          {link.title}
                        </h3>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
                          {link.category}
                        </span>
                        {link.isDefault && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            SYSTEM TOPIC
                          </span>
                        )}
                      </div>

                      {link.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {link.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Action Button */}
                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    <button
                      onClick={() => handleLaunchTopic(link)}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-600/30 active:scale-95 flex items-center gap-1.5 group-hover:scale-[1.02]"
                    >
                      <span>Open AI Assistant</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#12121c] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>{links.length} Available Workspace Support Topics</span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onOpenAdminManager && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdminManager();
                }}
                className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Settings size={14} />
                <span>Admin: Manage Links</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
