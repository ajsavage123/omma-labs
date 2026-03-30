import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, X, ArrowRight, Save, FileCheck } from 'lucide-react';
export default function ClientRequirementPage() {
  const navigate = useNavigate();
  
  const [sections, setSections] = useState([
    { title: 'Project Overview', fields: [{ label: 'Project Name', value: '' }, { label: 'Target Audience', value: '' }] },
    { title: 'Core Functionality', fields: [{ label: 'Must-have Features', value: '' }, { label: 'Nice-to-have Features', value: '' }] },
    { title: 'Technical Constraints', fields: [{ label: 'Preferred Stack', value: '' }, { label: 'Existing Systems', value: '' }] }
  ]);

  const [saving, setSaving] = useState(false);

  const addField = (sectionIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].fields.push({ label: 'New Field', value: '' });
    setSections(newSections);
  };

  const removeField = (sectionIndex: number, fieldIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].fields.splice(fieldIndex, 1);
    setSections(newSections);
  };

  const updateField = (sectionIndex: number, fieldIndex: number, value: string) => {
    const newSections = [...sections];
    newSections[sectionIndex].fields[fieldIndex].value = value;
    setSections(newSections);
  };

  const updateLabel = (sectionIndex: number, fieldIndex: number, label: string) => {
    const newSections = [...sections];
    newSections[sectionIndex].fields[fieldIndex].label = label;
    setSections(newSections);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('Requirement Form Saved to Workspace');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-indigo-500/30">
      <header className="sticky top-0 z-50 bg-[#0c0c0e]/90 backdrop-blur-2xl border-b border-white/5 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/ideas')} className="p-2.5 bg-white/5 rounded-2xl border border-white/10 text-gray-400 hover:text-white transition-all">
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[14px] font-black uppercase text-white tracking-tight">Client Requirement Tool</h1>
            <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Discovery Phase Asset</p>
          </div>
        </div>

        <button 
           onClick={handleSave}
           disabled={saving}
           className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
        >
          {saving ? 'Processing...' : <><Save size={14} /> Save to Workspace</>}
        </button>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <div className="mb-12">
           <h2 className="text-4xl font-black text-white mb-4">Gathering <span className="text-emerald-500">Requirements</span></h2>
           <p className="text-gray-500 font-medium">Define the core project scope, technical bounds, and business goals to ensure team alignment from Day 1.</p>
        </div>

        <div className="space-y-10">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="bg-[#11111d] rounded-3xl border border-white/5 overflow-hidden">
               <div className="bg-white/5 px-8 py-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-[12px] font-black uppercase tracking-widest text-[#c9a84c]">{section.title}</h3>
                  <button onClick={() => addField(sIdx)} className="p-2 bg-white/5 rounded-lg border border-white/10 text-gray-400 hover:text-white transition-all">
                    <Plus size={14} />
                  </button>
               </div>
               
               <div className="p-8 space-y-6">
                  {section.fields.map((field, fIdx) => (
                    <div key={fIdx} className="relative group">
                       <input 
                         value={field.label} 
                         onChange={(e) => updateLabel(sIdx, fIdx, e.target.value)}
                         className="block text-[10px] font-black uppercase tracking-widest text-emerald-400/70 mb-2 bg-transparent outline-none focus:text-emerald-400 transition-colors w-full" 
                       />
                       <div className="relative">
                          <textarea 
                            value={field.value}
                            onChange={(e) => updateField(sIdx, fIdx, e.target.value)}
                            className="w-full bg-[#0c0c0e] border border-white/10 rounded-2xl p-4 text-[14px] font-medium text-white outline-none focus:border-emerald-500/30 focus:bg-white/[0.04] transition-all min-h-[100px] resize-none"
                            placeholder="Enter details here..."
                          />
                          <button 
                            onClick={() => removeField(sIdx, fIdx)}
                            className="absolute top-4 right-4 p-2 text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                             <X size={16} />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center bg-white/[0.01]">
           <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-4">
              <FileCheck className="text-indigo-400" />
           </div>
           <h4 className="text-lg font-bold text-white mb-2">Finalize Documentation</h4>
           <p className="text-sm text-gray-600 mb-6 max-w-sm">Once the client fills this, it will be added to the Idea Vault for future reference during the Proposal & Architecture phases.</p>
           <button onClick={handleSave} className="flex items-center gap-2 text-indigo-400 font-black uppercase tracking-widest text-[10px] group">
              Confirm Submission <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </main>
    </div>
  );
}
