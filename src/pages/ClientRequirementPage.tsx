import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  ChevronLeft, Copy, Download, Check, Trash2, FolderOpen,
  User, Lightbulb, Target, Code, LayoutList, Gavel, 
  Puzzle, Palette, FileText, Brush, Settings,
  Globe, BarChart, Server, Landmark, StickyNote
} from 'lucide-react';

interface FormState {
  saved: string;
  types: string[];
  co: string; cp: string; ph: string; em: string; ind: string; web: string; addr: string;
  biz: string; prodServ: string; cust: string; area: string; usp: string; painPoint: string;
  existingPlatform: string; legalNotes: string;
  metric: string; prob: string; ref1: string; ref2: string; ref3: string;
  clr: string; avoid: string; kw: string; cities: string; comp: string;
  future: string; extra: string; launch: string; ddl: string; integrations: string;
  assetsNotes: string; hostingNotes: string; accessNotes: string;
  cServBrief: string; cAboutBrief: string; cFaqBrief: string; cPriceBrief: string; cTestiBrief: string;
  otherPages: string; otherFeatures: string;
  heard: string[]; goals: string[]; age: string[]; income: string[];
  projectType: string[]; platform: string[];
  pages: string[]; legal: string[]; features: string[];
  logo: string[]; colors: string[]; fonts: string[]; photos: string[]; videos: string[]; guidelines: string[];
  contentProvider: string[];
  cServ: string[]; cAbout: string[]; cFaq: string[]; cPrice: string[]; cTesti: string[];
  style: string[];
  userAcc: string[]; adminRoles: string[]; emailNotif: string[]; reportsReq: string[]; thirdParty: string[];
  gbp: string[]; ga: string[]; gads: string[]; metaAds: string[]; cmsAccess: string[]; credShare: string[];
  domOwned: string[]; hostOwned: string[]; emailNeeded: string[]; maintNeeded: string[]; budget: string[];
}

interface HistoryEntry {
  id: string;
  clientName: string;
  savedAt: string;
  data: FormState;
}

const INITIAL_STATE: FormState = {
  saved: '',
  types: [],
  co: '', cp: '', ph: '', em: '', ind: '', web: '', addr: '',
  biz: '', prodServ: '', cust: '', area: '', usp: '', painPoint: '',
  existingPlatform: '', legalNotes: '',
  metric: '', prob: '', ref1: '', ref2: '', ref3: '',
  clr: '', avoid: '', kw: '', cities: '', comp: '',
  future: '', extra: '', launch: '', ddl: '', integrations: '',
  assetsNotes: '', hostingNotes: '', accessNotes: '',
  cServBrief: '', cAboutBrief: '', cFaqBrief: '', cPriceBrief: '', cTestiBrief: '',
  otherPages: '', otherFeatures: '',
  heard: [], goals: [], age: [], income: [],
  projectType: [], platform: [],
  pages: [], legal: [], features: [],
  logo: [], colors: [], fonts: [], photos: [], videos: [], guidelines: [],
  contentProvider: [],
  cServ: [], cAbout: [], cFaq: [], cPrice: [], cTesti: [],
  style: [],
  userAcc: [], adminRoles: [], emailNotif: [], reportsReq: [], thirdParty: [],
  gbp: [], ga: [], gads: [], metaAds: [], cmsAccess: [], credShare: [],
  domOwned: [], hostOwned: [], emailNeeded: [], maintNeeded: [], budget: []
};

export default function ClientRequirementPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'history'>('edit');
  const [formData, setFormData] = useState<FormState>(INITIAL_STATE);
  const [savedTime, setSavedTime] = useState<string>('Not saved yet');
  const [showSavedMsg, setShowSavedMsg] = useState(false);
  const [showCopyMsg, setShowCopyMsg] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load Active Draft & History on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('oomaDiscoveryState');
      if (saved) {
        const d = JSON.parse(saved);
        // Clean legacy fields
        for (const k in d) {
          if (typeof d[k] === 'string' && (d[k] === 'Not specified' || d[k] === 'None')) d[k] = '';
          if (Array.isArray(d[k])) d[k] = d[k].filter((val: any) => val !== 'Not specified' && val !== 'None');
        }
        setFormData({ ...INITIAL_STATE, ...d });
        if (d.saved) {
          setSavedTime('Last saved: ' + d.saved);
        }
      }

      const savedHistory = localStorage.getItem('oomaDiscoveryHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleInputChange = (field: keyof FormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayValue = (field: keyof FormState, value: string) => {
    setFormData(prev => {
      const current = prev[field] as string[];
      const updated = current.includes(value) 
        ? current.filter(x => x !== value) 
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const setSingleChip = (field: keyof FormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: [value] }));
  };

  const toggleType = (type: string) => {
    setFormData(prev => {
      const updated = prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type];
      return { ...prev, types: updated };
    });
  };

  const handleContentProvider = (section: 'cServ' | 'cAbout' | 'cFaq' | 'cPrice' | 'cTesti', provider: string, briefField: keyof FormState) => {
    const briefTexts: Record<string, string> = {
      'Client': 'Client will provide all details and source copy.',
      'OomaLabs': 'OomaLabs to draft and optimize copy.',
      'Shared': 'Joint creation: Client drafts, OomaLabs refines.',
      'N/A': 'Not applicable for this project.'
    };
    
    setFormData(prev => ({
      ...prev,
      [section]: [provider],
      [briefField]: briefTexts[provider] || ''
    }));
  };

  const saveSheet = () => {
    const timeStr = new Date().toLocaleString('en-IN');
    const updated = { ...formData, saved: timeStr };
    localStorage.setItem('oomaDiscoveryState', JSON.stringify(updated));
    setSavedTime('Last saved: ' + timeStr);
    
    // Save to past history list
    const clientName = formData.co.trim() || 'Untitled Client';
    const entryId = formData.co.trim() ? formData.co.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') : 'untitled_' + Date.now();
    
    setHistory(prev => {
      const existingIdx = prev.findIndex(item => item.id === entryId || (item.clientName.toLowerCase() === clientName.toLowerCase() && clientName !== 'Untitled Client'));
      let nextHistory = [...prev];
      
      const newEntry: HistoryEntry = {
        id: existingIdx !== -1 ? prev[existingIdx].id : entryId + '_' + Date.now(),
        clientName,
        savedAt: timeStr,
        data: updated
      };

      if (existingIdx !== -1) {
        nextHistory[existingIdx] = newEntry;
      } else {
        nextHistory = [newEntry, ...nextHistory];
      }
      
      localStorage.setItem('oomaDiscoveryHistory', JSON.stringify(nextHistory));
      return nextHistory;
    });

    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 2500);
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    if (!window.confirm(`Load saved data for "${entry.clientName}"? This will overwrite the current form draft.`)) return;
    setFormData(entry.data);
    setSavedTime('Loaded: ' + entry.clientName);
    localStorage.setItem('oomaDiscoveryState', JSON.stringify(entry.data));
    setActiveTab('edit');
  };

  const deleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved sheet from past history?')) return;
    setHistory(prev => {
      const nextHistory = prev.filter(item => item.id !== id);
      localStorage.setItem('oomaDiscoveryHistory', JSON.stringify(nextHistory));
      return nextHistory;
    });
  };

  const clearAll = () => {
    if (!window.confirm('Clear all fields and start fresh for a new client?')) return;
    setFormData(INITIAL_STATE);
    setSavedTime('Cleared — ready for new client');
    localStorage.removeItem('oomaDiscoveryState');
  };

  const generatedSummary = useMemo(() => {
    const v = (val: string) => val ? val.trim() : '';
    const gc = (arr: string[]) => arr && arr.length > 0 ? arr.join(', ') : '';
    
    return `# OOMALABS WEBSITE DISCOVERY & REQUIREMENT GATHERING FORM
*Generated on: ${new Date().toLocaleString('en-IN')}*

=========================================
1. CLIENT INFORMATION
=========================================
- Company Name: ${v(formData.co)}
- Contact Person: ${v(formData.cp)}
- Email: ${v(formData.em)}
- Phone: ${v(formData.ph)}
- Business Address: ${v(formData.addr)}
- Website (if any): ${v(formData.web)}
- Industry: ${v(formData.ind)}
- How they heard: ${gc(formData.heard)}

=========================================
2. BUSINESS OVERVIEW
=========================================
- What does your business do?: ${v(formData.biz)}
- Products/Services: ${v(formData.prodServ)}
- Target customers: ${v(formData.cust)}
- Service locations: ${v(formData.area)}
- Unique selling proposition: ${v(formData.usp)}
- Age range (optional): ${gc(formData.age)}
- Income level (optional): ${gc(formData.income)}
- Customer pain point: ${v(formData.painPoint)}

=========================================
3. PROJECT GOALS
=========================================
- Primary goal: ${gc(formData.goals)}
- Success metrics: ${v(formData.metric)}
- Problems with current website: ${v(formData.prob)}

=========================================
4. PROJECT SCOPE & WEBSITE TYPE
=========================================
- Project type: ${gc(formData.projectType)}
- Preferred platform: ${gc(formData.platform)}
- Existing platform: ${v(formData.existingPlatform)}
- Website type: ${gc(formData.types)}

=========================================
5. REQUIRED PAGES
=========================================
- Checked Pages: ${gc(formData.pages)}
- Other: ${v(formData.otherPages)}

=========================================
6. LEGAL & COMPLIANCE PAGES
=========================================
- Checked: ${gc(formData.legal)}
- Legal notes: ${v(formData.legalNotes)}

=========================================
7. FEATURES
=========================================
- Checked Features: ${gc(formData.features)}
- Other: ${v(formData.otherFeatures)}

=========================================
8. BRANDING & ASSETS
=========================================
- Logo available?: ${gc(formData.logo)}
- Brand colors: ${gc(formData.colors)}
- Fonts: ${gc(formData.fonts)}
- Photos: ${gc(formData.photos)}
- Videos: ${gc(formData.videos)}
- Brand guidelines: ${gc(formData.guidelines)}
- Branding & Assets Notes: ${v(formData.assetsNotes)}

=========================================
9. CONTENT
=========================================
- Who provides website content?: ${gc(formData.contentProvider)}
- Service descriptions: ${gc(formData.cServ)}
  * Brief/Notes: ${v(formData.cServBrief)}
- About Us: ${gc(formData.cAbout)}
  * Brief/Notes: ${v(formData.cAboutBrief)}
- FAQs: ${gc(formData.cFaq)}
  * Brief/Notes: ${v(formData.cFaqBrief)}
- Pricing: ${gc(formData.cPrice)}
  * Brief/Notes: ${v(formData.cPriceBrief)}
- Testimonials: ${gc(formData.cTesti)}
  * Brief/Notes: ${v(formData.cTestiBrief)}

=========================================
10. DESIGN PREFERENCES
=========================================
- List 3 websites you like:
  1. ${v(formData.ref1)}
  2. ${v(formData.ref2)}
  3. ${v(formData.ref3)}
- Preferred style: ${gc(formData.style)}
- Preferred colors: ${v(formData.clr)}
- Anything to avoid: ${v(formData.avoid)}

=========================================
11. FUNCTIONAL REQUIREMENTS
=========================================
- User accounts?: ${gc(formData.userAcc)}
- Admin roles?: ${gc(formData.adminRoles)}
- Email notifications?: ${gc(formData.emailNotif)}
- Reports?: ${gc(formData.reportsReq)}
- Third-party integrations?: ${gc(formData.thirdParty)}
- Integrations/Tools details: ${v(formData.integrations)}

=========================================
12. SEO
=========================================
- Target keywords: ${v(formData.kw)}
- Target cities: ${v(formData.cities)}
- Competitors: ${v(formData.comp)}
- Google Business Profile: ${gc(formData.gbp)}

=========================================
13. ANALYTICS & ACCESS CREDENTIALS
=========================================
- Google Analytics / Search Console: ${gc(formData.ga)}
- Google Ads account: ${gc(formData.gads)}
- Meta / Facebook Ads: ${gc(formData.metaAds)}
- CMS admin access available: ${gc(formData.cmsAccess)}
- Sharing protocol: ${gc(formData.credShare)}
- Access notes: ${v(formData.accessNotes)}

=========================================
14. DOMAIN & HOSTING
=========================================
- Domain owned?: ${gc(formData.domOwned)}
- Hosting owned?: ${gc(formData.hostOwned)}
- Business email needed?: ${gc(formData.emailNeeded)}
- Maintenance required?: ${gc(formData.maintNeeded)}
- Domain & Hosting Notes: ${v(formData.hostingNotes)}

=========================================
15. BUDGET & TIMELINE
=========================================
- Budget range: ${gc(formData.budget)}
- Desired launch date: ${v(formData.launch)}
- Special deadlines: ${v(formData.ddl)}

=========================================
16. FINAL NOTES
=========================================
- Future features: ${v(formData.future)}
- Additional comments: ${v(formData.extra)}
`;
  }, [formData]);

  const copySummary = () => {
    navigator.clipboard.writeText(generatedSummary).then(() => {
      setShowCopyMsg(true);
      toast.success('Summary copied to clipboard!');
      setTimeout(() => setShowCopyMsg(false), 2500);
    }).catch(() => {
      toast.error('Failed to copy to clipboard.');
    });
  };

  const downloadSummary = () => {
    const name = formData.co || 'Client';
    const filename = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_discovery_sheet.txt`;
    const blob = new Blob([generatedSummary], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const industries = [
    'Retail / E-commerce', 'Healthcare / Clinic', 'Education / Coaching',
    'Real Estate', 'Restaurant / Food', 'Hospitality / Travel',
    'Finance / Accounting', 'Legal / Consulting', 'Manufacturing',
    'Technology / SaaS', 'Beauty / Wellness', 'Logistics',
    'NGO / Non-profit', 'Other'
  ];

  return (
    <div className="h-screen h-[100dvh] w-full overflow-y-auto bg-[#050505] flex flex-col font-sans text-gray-200 custom-scrollbar relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none z-0"></div>

      <header className="sticky top-0 z-40 bg-[#0c0c0e]/90 backdrop-blur-2xl border-b border-white/5 h-16 flex items-center justify-between px-6">
        <button 
          onClick={() => navigate('/ideas')} 
          className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-gray-400 hover:text-white active:scale-95 transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="flex flex-col items-center">
          <h1 className="text-[14px] font-black tracking-tight uppercase text-white">Client Intake Form</h1>
          <p className="text-[9px] font-bold text-purple-400 uppercase tracking-[0.2em] mt-0.5">Discovery & Requirements</p>
        </div>

        <button onClick={saveSheet} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-all">
          Save
        </button>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full relative z-10">
        <div className="bg-[#11111d] border border-white/5 rounded-[24px] p-6 shadow-xl mb-6">
          <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6 flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Discovery Checklist</h2>
              <p className="text-xs text-gray-400 mt-1">{savedTime}</p>
            </div>
            <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
              <button 
                onClick={() => setActiveTab('edit')} 
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'edit' ? 'bg-[#7C3AED] text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Edit Form
              </button>
              <button 
                onClick={() => setActiveTab('preview')} 
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'preview' ? 'bg-[#7C3AED] text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Preview Summary
              </button>
              <button 
                onClick={() => setActiveTab('history')} 
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'history' ? 'bg-[#7C3AED] text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Past History
              </button>
            </div>
          </div>

          {activeTab === 'edit' && (
            <div className="space-y-8">
              {/* 1. Client Information */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" /> 1. Client Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company Name</label>
                    <input type="text" value={formData.co} onChange={e => handleInputChange('co', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="Acme Inc" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Person</label>
                    <input type="text" value={formData.cp} onChange={e => handleInputChange('cp', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="Ravi Kumar" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</label>
                    <input type="email" value={formData.em} onChange={e => handleInputChange('em', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="ravi@acme.com" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone / WhatsApp</label>
                    <input type="tel" value={formData.ph} onChange={e => handleInputChange('ph', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Existing Website</label>
                    <input type="url" value={formData.web} onChange={e => handleInputChange('web', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="https://acme.com" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Industry</label>
                    <select value={formData.ind} onChange={e => handleInputChange('ind', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1">
                      <option value="">— pick one —</option>
                      {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Business Address</label>
                  <input type="text" value={formData.addr} onChange={e => handleInputChange('addr', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="Hyderabad, India" />
                </div>
                <div className="mt-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">How they heard about OomaLabs</label>
                  <div className="flex flex-wrap gap-2">
                    {['Referral', 'Google', 'Instagram', 'JustDial / IndiaMART', 'LinkedIn', 'Walk-in', 'Cold call', 'Other'].map(item => (
                      <button key={item} type="button" onClick={() => toggleArrayValue('heard', item)} className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${formData.heard.includes(item) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Business Overview */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" /> 2. Business Overview
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">What does your business do?</label>
                    <textarea value={formData.biz} onChange={e => handleInputChange('biz', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1 h-20 resize-y" placeholder="Core operations, company story..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Products/Services description</label>
                    <textarea value={formData.prodServ} onChange={e => handleInputChange('prodServ', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1 h-20 resize-y" placeholder="Detail products or services..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Customers</label>
                      <input type="text" value={formData.cust} onChange={e => handleInputChange('cust', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="Young professionals, small businesses..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service Locations</label>
                      <input type="text" value={formData.area} onChange={e => handleInputChange('area', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="Hyderabad, global..." />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unique Selling Proposition (USP)</label>
                    <input type="text" value={formData.usp} onChange={e => handleInputChange('usp', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="What makes you stand out..." />
                  </div>

                  {/* Target Audience Detail */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                    <span className="text-xs font-bold text-white flex items-center gap-2">Target Audience Detail <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-gray-500 font-bold uppercase tracking-wider">Optional</span></span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Age Range</label>
                        <div className="flex flex-wrap gap-1.5">
                          {['18-24', '25-34', '35-44', '45-54', '55+', 'All ages'].map(item => (
                            <button key={item} type="button" onClick={() => toggleArrayValue('age', item)} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${formData.age.includes(item) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Income Level</label>
                        <div className="flex flex-wrap gap-1.5">
                          {['Budget', 'Mid-range', 'Premium', 'Luxury'].map(item => (
                            <button key={item} type="button" onClick={() => toggleArrayValue('income', item)} className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${formData.income.includes(item) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Customer Pain Point</label>
                      <input type="text" value={formData.painPoint} onChange={e => handleInputChange('painPoint', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="What problem does your business solve?" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Project Goals */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4" /> 3. Project Goals
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Primary Goal</label>
                    <div className="flex flex-wrap gap-2">
                      {['Get more leads', 'Sell online', 'Brand credibility', 'Automate bookings', 'Reduce support load', 'Replace old website', 'Other'].map(item => (
                        <button key={item} type="button" onClick={() => toggleArrayValue('goals', item)} className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${formData.goals.includes(item) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Success Metrics</label>
                    <input type="text" value={formData.metric} onChange={e => handleInputChange('metric', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="50 leads/month, 100 orders/week..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Problems with current website</label>
                    <textarea value={formData.prob} onChange={e => handleInputChange('prob', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1 h-20 resize-y" placeholder="Slow loading, poor design, no mobile support..." />
                  </div>
                </div>
              </div>

              {/* 4. Project Scope & Website Type */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <Code className="h-4 w-4" /> 4. Project Scope & Website Type
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Project Type</label>
                    <div className="flex flex-wrap gap-2">
                      {['New website from scratch', 'Redesign existing website', 'Migrate to new platform', 'Add features to existing site'].map(item => (
                        <button key={item} type="button" onClick={() => setSingleChip('projectType', item)} className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${formData.projectType.includes(item) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Preferred platform / technology</label>
                    <div className="flex flex-wrap gap-2">
                      {['WordPress', 'Shopify', 'Wix', 'Custom Code', 'No preference', 'Let OomaLabs decide'].map(item => (
                        <button key={item} type="button" onClick={() => setSingleChip('platform', item)} className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${formData.platform.includes(item) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Existing Platform (if redesign/migration)</label>
                    <input type="text" value={formData.existingPlatform} onChange={e => handleInputChange('existingPlatform', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="WordPress 5.x on GoDaddy..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Website Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['Business Website', 'Landing Page', 'Portfolio', 'E-commerce', 'Booking', 'Blog', 'Custom Web App'].map(item => (
                        <button key={item} type="button" onClick={() => toggleType(item)} className={`px-4 py-3 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${formData.types.includes(item) ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}>
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.types.includes(item) ? 'border-purple-400 bg-purple-500' : 'border-gray-500'}`}>{formData.types.includes(item) && <Check size={10} className="text-black stroke-[3]" />}</div>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Required Pages */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <LayoutList className="h-4 w-4" /> 5. Required Pages
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {['Home', 'About', 'Services', 'Products', 'Pricing', 'Gallery', 'Testimonials', 'FAQ', 'Blog', 'Careers', 'Contact'].map(item => (
                    <button key={item} type="button" onClick={() => toggleArrayValue('pages', item)} className={`px-4 py-3 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${formData.pages.includes(item) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.pages.includes(item) ? 'border-purple-400 bg-purple-500' : 'border-gray-500'}`}>{formData.pages.includes(item) && <Check size={10} className="text-black stroke-[3]" />}</div>
                      {item}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Other required pages</label>
                  <input type="text" value={formData.otherPages} onChange={e => handleInputChange('otherPages', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="e.g. Partner Portal, Custom Calculator" />
                </div>
              </div>

              {/* 6. Legal & Compliance Pages */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <Gavel className="h-4 w-4" /> 6. Legal & Compliance Pages
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {['Privacy Policy', 'Terms & Conditions', 'Refund / Cancellation Policy', 'Cookie Consent Banner', 'GDPR / DPDP Act Compliance', 'Disclaimer Page', 'Shipping / Delivery Policy', 'Accessibility Statement'].map(item => (
                    <button key={item} type="button" onClick={() => toggleArrayValue('legal', item)} className={`px-4 py-3 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${formData.legal.includes(item) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.legal.includes(item) ? 'border-purple-400 bg-purple-500' : 'border-gray-500'}`}>{formData.legal.includes(item) && <Check size={10} className="text-black stroke-[3]" />}</div>
                      {item}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Legal Notes</label>
                  <input type="text" value={formData.legalNotes} onChange={e => handleInputChange('legalNotes', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="e.g. DPDP Act compliant consent flow..." />
                </div>
              </div>

              {/* 7. Features */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <Puzzle className="h-4 w-4" /> 7. Features
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Contact Form', 'WhatsApp Chat', 'Appointment Booking', 'Payment Gateway', 'Customer Login', 'Admin Dashboard', 'Search', 'Blog', 'Multi-language', 'Newsletter', 'AI Chat Assistant', 'CRM Integration', 'File Upload'].map(item => (
                    <button key={item} type="button" onClick={() => toggleArrayValue('features', item)} className={`px-4 py-3 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all ${formData.features.includes(item) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${formData.features.includes(item) ? 'border-purple-400 bg-purple-500' : 'border-gray-500'}`}>{formData.features.includes(item) && <Check size={10} className="text-black stroke-[3]" />}</div>
                      {item}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Other features</label>
                  <input type="text" value={formData.otherFeatures} onChange={e => handleInputChange('otherFeatures', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="e.g. Social wall, invoice sync" />
                </div>
              </div>

              {/* 8. Branding & Assets */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <Palette className="h-4 w-4" /> 8. Branding & Assets
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Logo available?', field: 'logo' as keyof FormState, opts: ['Yes', 'No', 'Need logo design (OomaLabs to create)'] },
                    { label: 'Brand colors?', field: 'colors' as keyof FormState, opts: ['Yes', 'No', 'Need palette choosing (OomaLabs to define)'] },
                    { label: 'Fonts?', field: 'fonts' as keyof FormState, opts: ['Yes', 'No', 'Need font selection (OomaLabs to suggest)'] },
                    { label: 'Photos?', field: 'photos' as keyof FormState, opts: ['Yes', 'No', 'Need stock photography (OomaLabs to source)'] },
                    { label: 'Videos?', field: 'videos' as keyof FormState, opts: ['Yes', 'No', 'Need video creation (OomaLabs to produce)'] },
                    { label: 'Brand guidelines?', field: 'guidelines' as keyof FormState, opts: ['Yes', 'No', 'Need guidelines book (OomaLabs to create)'] }
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-3 rounded-xl flex-wrap gap-2">
                      <span className="text-xs text-gray-300 font-semibold">{item.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {item.opts.map(opt => (
                          <button key={opt} type="button" onClick={() => setSingleChip(item.field, opt)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(formData[item.field] as string[]).includes(opt) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Branding & Assets Notes</label>
                    <textarea value={formData.assetsNotes} onChange={e => handleInputChange('assetsNotes', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1 h-20 resize-y" placeholder="e.g. Needs complete logo redesign..." />
                  </div>
                </div>
              </div>

              {/* 9. Content */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> 9. Content
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Who provides website content?</label>
                    <div className="flex flex-wrap gap-2">
                      {['Client provides all', 'OomaLabs writes all', 'Shared / joint content writing'].map(item => (
                        <button key={item} type="button" onClick={() => setSingleChip('contentProvider', item)} className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${formData.contentProvider.includes(item) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { label: 'Service descriptions', key: 'cServ' as const, brief: 'cServBrief' as const },
                      { label: 'About Us', key: 'cAbout' as const, brief: 'cAboutBrief' as const },
                      { label: 'FAQs', key: 'cFaq' as const, brief: 'cFaqBrief' as const },
                      { label: 'Pricing', key: 'cPrice' as const, brief: 'cPriceBrief' as const },
                      { label: 'Testimonials', key: 'cTesti' as const, brief: 'cTestiBrief' as const }
                    ].map(row => (
                      <div key={row.label} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <span className="text-xs text-gray-300 font-bold">{row.label}</span>
                          <div className="flex gap-1">
                            {['Client', 'OomaLabs', 'Shared', 'N/A'].map(opt => (
                              <button key={opt} type="button" onClick={() => handleContentProvider(row.key, opt, row.brief)} className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border transition-all ${formData[row.key].includes(opt) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input type="text" value={formData[row.brief]} onChange={e => handleInputChange(row.brief, e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500 outline-none transition-all" placeholder="Short brief / notes..." />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 10. Design Preferences */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <Brush className="h-4 w-4" /> 10. Design Preferences
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">List 3 websites you like</label>
                    <div className="space-y-2">
                      <input type="text" value={formData.ref1} onChange={e => handleInputChange('ref1', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all" placeholder="Website reference 1 URL" />
                      <input type="text" value={formData.ref2} onChange={e => handleInputChange('ref2', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all" placeholder="Website reference 2 URL" />
                      <input type="text" value={formData.ref3} onChange={e => handleInputChange('ref3', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all" placeholder="Website reference 3 URL" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Preferred Style</label>
                    <div className="flex flex-wrap gap-2">
                      {['Minimal / clean', 'Bold / vibrant', 'Corporate', 'Warm / friendly', 'Luxury / premium', 'Playful / creative'].map(item => (
                        <button key={item} type="button" onClick={() => toggleArrayValue('style', item)} className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${formData.style.includes(item) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preferred Colors</label>
                      <input type="text" value={formData.clr} onChange={e => handleInputChange('clr', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="e.g. Navy blue and gold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Anything to avoid</label>
                      <input type="text" value={formData.avoid} onChange={e => handleInputChange('avoid', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="e.g. Heavy popups, bright orange" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 11. Functional Requirements */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <Settings className="h-4 w-4" /> 11. Functional Requirements
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'User accounts?', field: 'userAcc' as keyof FormState },
                    { label: 'Admin roles?', field: 'adminRoles' as keyof FormState },
                    { label: 'Email notifications?', field: 'emailNotif' as keyof FormState },
                    { label: 'Reports?', field: 'reportsReq' as keyof FormState },
                    { label: 'Third-party integrations?', field: 'thirdParty' as keyof FormState }
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-3 rounded-xl flex-wrap gap-2">
                      <span className="text-xs text-gray-300 font-semibold">{item.label}</span>
                      <div className="flex gap-1">
                        {['Yes', 'No', 'Not sure'].map(opt => (
                          <button key={opt} type="button" onClick={() => setSingleChip(item.field, opt)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(formData[item.field] as string[]).includes(opt) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Integrations & third-party tools details</label>
                    <textarea value={formData.integrations} onChange={e => handleInputChange('integrations', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1 h-20 resize-y" placeholder="Tally ERP, Zoho CRM, Salesforce..." />
                  </div>
                </div>
              </div>

              {/* 12. SEO */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <Globe className="h-4 w-4" /> 12. SEO
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Keywords</label>
                      <input type="text" value={formData.kw} onChange={e => handleInputChange('kw', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="web design Hyderabad, salon..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Cities / regions</label>
                      <input type="text" value={formData.cities} onChange={e => handleInputChange('cities', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="Hyderabad, online..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Competitors (names/links)</label>
                      <input type="text" value={formData.comp} onChange={e => handleInputChange('comp', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="competitor1.com, competitor2.com..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Google Business Profile</label>
                      <div className="flex gap-1.5 mt-1">
                        {['Live', 'Need help setting up', 'Not sure'].map(opt => (
                          <button key={opt} type="button" onClick={() => setSingleChip('gbp', opt)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${formData.gbp.includes(opt) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 13. Analytics & Access Credentials */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <BarChart className="h-4 w-4" /> 13. Analytics & Access Credentials
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Google Analytics / Search Console?', field: 'ga' as keyof FormState, opts: ['Yes, have access', 'No', 'Need setup (OomaLabs)'] },
                    { label: 'Google Ads account?', field: 'gads' as keyof FormState, opts: ['Yes', 'No', 'Need setup (OomaLabs)'] },
                    { label: 'Meta / Facebook Ads?', field: 'metaAds' as keyof FormState, opts: ['Yes', 'No', 'Need setup (OomaLabs)'] },
                    { label: 'CMS admin access available?', field: 'cmsAccess' as keyof FormState, opts: ['Yes', 'No', 'N/A (new site)'] }
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-3 rounded-xl flex-wrap gap-2">
                      <span className="text-xs text-gray-300 font-semibold">{item.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {item.opts.map(opt => (
                          <button key={opt} type="button" onClick={() => setSingleChip(item.field, opt)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(formData[item.field] as string[]).includes(opt) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">How will credentials be shared?</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Email', 'WhatsApp', 'Password manager', 'In-person'].map(opt => (
                        <button key={opt} type="button" onClick={() => setSingleChip('credShare', opt)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${formData.credShare.includes(opt) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Access Notes</label>
                    <input type="text" value={formData.accessNotes} onChange={e => handleInputChange('accessNotes', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="e.g. Domain registrar login with GoDaddy..." />
                  </div>
                </div>
              </div>

              {/* 14. Domain & Hosting */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <Server className="h-4 w-4" /> 14. Domain & Hosting
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Domain owned?', field: 'domOwned' as keyof FormState, opts: ['Yes', 'No', 'Need registration (OomaLabs to buy)'] },
                    { label: 'Hosting owned?', field: 'hostOwned' as keyof FormState, opts: ['Yes', 'No', 'Need server setup (OomaLabs to host)'] },
                    { label: 'Business email needed?', field: 'emailNeeded' as keyof FormState, opts: ['Yes - OomaLabs to configure', 'No'] },
                    { label: 'Maintenance required?', field: 'maintNeeded' as keyof FormState, opts: ['Yes - OomaLabs Monthly Plan', 'No', 'Undecided'] }
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-3 rounded-xl flex-wrap gap-2">
                      <span className="text-xs text-gray-300 font-semibold">{item.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {item.opts.map(opt => (
                          <button key={opt} type="button" onClick={() => setSingleChip(item.field, opt)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${(formData[item.field] as string[]).includes(opt) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Domain & Hosting Notes</label>
                    <textarea value={formData.hostingNotes} onChange={e => handleInputChange('hostingNotes', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1 h-20 resize-y" placeholder="e.g. Need to buy domain clinicname.in..." />
                  </div>
                </div>
              </div>

              {/* 15. Budget & Timeline */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <Landmark className="h-4 w-4" /> 15. Budget & Timeline
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Budget Range</label>
                    <div className="flex flex-wrap gap-2">
                      {['Under ₹15k', '₹15k–₹40k', '₹40k–₹1L', '₹1L–₹3L', '₹3L+', 'Let OomaLabs quote'].map(opt => (
                        <button key={opt} type="button" onClick={() => setSingleChip('budget', opt)} className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${formData.budget.includes(opt) ? 'bg-purple-600/20 border-purple-500 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Desired Launch Date</label>
                      <input type="text" value={formData.launch} onChange={e => handleInputChange('launch', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="End of August, before Diwali..." />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Special Deadlines</label>
                      <input type="text" value={formData.ddl} onChange={e => handleInputChange('ddl', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1" placeholder="Product launch on Sep 15th..." />
                    </div>
                  </div>
                </div>
              </div>

              {/* 16. Final Notes */}
              <div>
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-4 flex items-center gap-2">
                  <StickyNote className="h-4 w-4" /> 16. Final Notes
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Future Features (Phase 2 ideas)</label>
                    <textarea value={formData.future} onChange={e => handleInputChange('future', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1 h-20 resize-y" placeholder="Mobile app later, client portal..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Additional comments / meeting notes</label>
                    <textarea value={formData.extra} onChange={e => handleInputChange('extra', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-purple-500 outline-none transition-all mt-1 h-20 resize-y" placeholder="Specific technical hurdles, meeting takeaways..." />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t border-white/5">
                {showSavedMsg && <span className="text-xs text-green-400 font-bold self-center mr-2">✓ Saved locally</span>}
                <button onClick={clearAll} className="px-4 py-2 border border-red-500/20 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">Clear All</button>
                <button onClick={saveSheet} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-purple-600/15">Save Sheet</button>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={copySummary} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all">
                  <Copy className="h-4 w-4" /> Copy Summary
                </button>
                <button onClick={downloadSummary} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all">
                  <Download className="h-4 w-4" /> Download TXT
                </button>
                {showCopyMsg && <span className="text-xs text-green-400 font-bold ml-2">✓ Copied to clipboard!</span>}
              </div>
              <pre className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                {generatedSummary}
              </pre>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" /> Saved Clients History
                </h3>
                <span className="text-[10px] text-gray-500 font-bold uppercase">{history.length} Saved sheets</span>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                  <FolderOpen className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-gray-500">No saved history entries found.</p>
                  <p className="text-[10px] text-gray-600 mt-1">Complete a client form and click "Save Sheet" to keep a history entry.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map(entry => (
                    <div 
                      key={entry.id} 
                      onClick={() => loadFromHistory(entry)}
                      className="group flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 hover:border-purple-500/40 rounded-2xl cursor-pointer hover:bg-purple-600/[0.03] transition-all"
                    >
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                          {entry.clientName}
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-semibold uppercase">
                          <span>{entry.data.types.join(', ') || 'No type selected'}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-white/10"></span>
                          <span>{entry.savedAt}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => deleteFromHistory(entry.id, e)}
                        className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
