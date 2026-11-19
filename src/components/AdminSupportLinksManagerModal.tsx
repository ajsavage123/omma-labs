import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Edit2, Trash2, Download, Upload, Sparkles, RefreshCw 
} from 'lucide-react';
import { supportLinksService, DEFAULT_SUPPORT_LINKS } from '@/services/supportLinksService';
import type { SupportLink } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AdminSupportLinksManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DEPARTMENTS = [
  'Sales & Business',
  'Engineering & Development',
  'Research & Innovation Labs'
];

export default function AdminSupportLinksManagerModal({
  isOpen,
  onClose
}: AdminSupportLinksManagerModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [links, setLinks] = useState<SupportLink[]>(() => supportLinksService.getStoredLinks());
  
  // Tab state: 'manage' | 'add' | 'edit' | 'import' | 'export'
  const [activeTab, setActiveTab] = useState<'manage' | 'add' | 'edit' | 'import' | 'export'>('manage');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Sales & Business');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  // Bulk Import state
  const [importText, setImportText] = useState('');
  const [replaceMode, setReplaceMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  if (!isOpen || !isAdmin) return null;

  const handleResetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('Sales & Business');
    setUrl('');
    setDescription('');
    setActiveTab('manage');
  };

  const handleStartEdit = (link: SupportLink) => {
    setEditingId(link.id);
    setTitle(link.title);
    setCategory(link.category || 'Sales & Business');
    setUrl(link.url);
    setDescription(link.description || '');
    setActiveTab('edit');
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      toast.error('Title and URL are required.');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('URL must start with http:// or https://');
      return;
    }

    setIsProcessing(true);
    try {
      if (editingId) {
        const updated = await supportLinksService.updateLink(editingId, {
          title: title.trim(),
          category,
          url: url.trim(),
          description: description.trim()
        }, user?.workspace_id, user?.role);
        setLinks(updated);
        toast.success(`Updated "${title}"`);
      } else {
        const updated = await supportLinksService.addLink({
          title: title.trim(),
          category,
          url: url.trim(),
          description: description.trim(),
          icon: 'code'
        }, user?.workspace_id, user?.role);
        setLinks(updated);
        toast.success(`Added new support link "${title}"`);
      }
      handleResetForm();
    } catch {
      toast.error('Failed to save link.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string, linkTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${linkTitle}"?`)) return;
    try {
      const updated = await supportLinksService.deleteLink(id, user?.workspace_id, user?.role);
      setLinks(updated);
      toast.success(`Deleted "${linkTitle}"`);
    } catch {
      toast.error('Failed to delete link.');
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) {
      toast.error('Please paste JSON or CSV text to import.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await supportLinksService.importLinksText(importText, user?.workspace_id, replaceMode, user?.role);
      if (result.success) {
        setLinks(result.links);
        toast.success(`Successfully imported ${result.count} support links!`);
        setImportText('');
        setActiveTab('manage');
      } else {
        toast.error(result.error || 'Import failed.');
      }
    } catch (err: any) {
      toast.error(`Import failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm('Restore system default support links?')) return;
    try {
      await supportLinksService.saveWorkspaceLinks(DEFAULT_SUPPORT_LINKS, user?.workspace_id, user?.role);
      setLinks(DEFAULT_SUPPORT_LINKS);
      toast.success('Default system support links restored.');
    } catch {
      toast.error('Failed to restore defaults.');
    }
  };

  const jsonExportStr = supportLinksService.exportLinksJSON();

  const handleCopyExport = () => {
    navigator.clipboard.writeText(jsonExportStr);
    toast.success('Support links copied to clipboard as JSON!');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-[#0e0e14] border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh] text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 bg-[#141420] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>Admin Support Links Manager</span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  ADMIN ONLY
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 font-medium">Add, edit, import, export, or delete multiple topic links for workspace users</p>
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

        {/* Action Tabs */}
        <div className="px-4 pt-3 bg-[#0e0e14] border-b border-white/5 flex gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => { handleResetForm(); setActiveTab('manage'); }}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all ${
              activeTab === 'manage' ? 'bg-[#181826] text-white border-t-2 border-blue-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            Manage Links ({links.length})
          </button>

          <button
            onClick={() => { handleResetForm(); setActiveTab('add'); }}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'add' || activeTab === 'edit' ? 'bg-[#181826] text-blue-300 border-t-2 border-blue-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Plus size={14} />
            <span>{activeTab === 'edit' ? 'Edit Link' : 'Add Custom Link'}</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'import' ? 'bg-[#181826] text-purple-300 border-t-2 border-purple-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Upload size={14} />
            <span>Bulk Import</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'export' ? 'bg-[#181826] text-emerald-300 border-t-2 border-emerald-500' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Download size={14} />
            <span>Export Links</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[#0e0e14]">
          {/* TAB 1: MANAGE LINKS */}
          {activeTab === 'manage' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2">
                <p className="text-xs text-gray-400">
                  Total {links.length} configured support topics available for workspace users.
                </p>
                <button
                  onClick={handleRestoreDefaults}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 transition-all border border-white/10"
                >
                  <RefreshCw size={12} /> Restore Defaults
                </button>
              </div>

              {links.map((link) => (
                <div
                  key={link.id}
                  className="bg-[#141420] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-bold text-white">{link.title}</h3>
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        {link.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate font-mono">{link.url}</p>
                    {link.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{link.description}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 justify-end">
                    <button
                      onClick={() => handleStartEdit(link)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-300 transition-all border border-white/5"
                      title="Edit Link"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(link.id, link.title)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all border border-white/5"
                      title="Delete Link"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: ADD / EDIT LINK */}
          {(activeTab === 'add' || activeTab === 'edit') && (
            <form onSubmit={handleSaveForm} className="space-y-4 max-w-2xl mx-auto">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {editingId ? `Edit Support Topic` : `Add New Support Topic Link`}
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Topic Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Microservice Deployment Specs"
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Target Department *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:border-blue-500 outline-none"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d} className="bg-[#141420] text-white">{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Google NotebookLM / Document URL *</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://notebooklm.google.com/notebook/YOUR_NOTEBOOK_ID"
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs sm:text-sm text-white font-mono focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Short Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Explain what topics or specs are covered in this knowledge base..."
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-600/30"
                >
                  {isProcessing ? 'Saving...' : editingId ? 'Update Link' : 'Add Link'}
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: BULK IMPORT */}
          {activeTab === 'import' && (
            <form onSubmit={handleBulkImport} className="space-y-4 max-w-2xl mx-auto">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                  Bulk Import Custom Links
                </h3>
                <p className="text-xs text-gray-400">
                  Paste links in JSON format array or CSV lines (`Title, URL, Category, Description`).
                </p>
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={8}
                placeholder={`Example JSON format:
[
  { "title": "Database Schema Docs", "url": "https://notebooklm.google.com/notebook/xyz", "category": "Engineering & Code", "description": "Supabase SQL tables and indexes" }
]

Or CSV lines format:
Frontend Architecture, https://notebooklm.google.com/notebook/abc, Engineering & Code, React components and state flow`}
                className="w-full p-3.5 bg-black/60 border border-white/10 rounded-xl text-xs font-mono text-white placeholder-gray-600 focus:border-purple-500 outline-none"
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="replaceMode"
                  checked={replaceMode}
                  onChange={(e) => setReplaceMode(e.target.checked)}
                  className="rounded border-white/10 bg-black/50 text-purple-600"
                />
                <label htmlFor="replaceMode" className="text-xs text-gray-300">
                  Replace all existing links with this import list
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-600/30"
                >
                  {isProcessing ? 'Processing Import...' : 'Import Links Now'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: EXPORT LINKS */}
          {activeTab === 'export' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
                  Export Workspace Support Links
                </h3>
                <p className="text-xs text-gray-400">
                  Copy the JSON representation below to backup or share support links across workspaces.
                </p>
              </div>

              <textarea
                readOnly
                value={jsonExportStr}
                rows={10}
                className="w-full p-3.5 bg-black/70 border border-white/10 rounded-xl text-xs font-mono text-blue-300 focus:outline-none"
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyExport}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <CopyIcon size={14} />
                  <span>Copy JSON to Clipboard</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#141420] border-t border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );
}
