import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Printer, X, Check, 
  ShoppingBag, Globe, Smartphone, Layers, 
  MessageSquare, Terminal, Zap, Cpu,
  Trash2, FileText, Copy
} from 'lucide-react';

// --- TYPES ---

interface FormState {
  meta: { projectNo: string; date: string; handler: string; track: string };
  A: { name: string; industry: string; bizModel: string; description: string; website: string; poc: string; role: string; phone: string; whatsapp: string; email: string; city: string; approver: string; comms: string[] };
  B: { goal: string[]; problem: string; failureReason: string; outcome: string; audience: string; competitors: string; successMetric: string };
  C: { common: string[]; flow: string; additional: string; exclusions: string };
  D: { payments: string[]; comms: string[]; maps: string[]; analytics: string[]; crm: string[]; auth: string[]; ai: string[]; other: string };
  E: { backend: string; db: string; server: string; hosting: string; domainStatus: string; domainName: string; ssl: string; scale: string; sensitivity: string; compliance: string[] };
  F: Array<{ platform: string; owner: string; billing: string; transfer: string; access: string }>;
  G1: { type: string; pages: string[]; pageCount: string; seo: string; leadForm: string; cms: string; blog: string; lang: string; map: string; tech: string };
  G2: { platform: string; count: string; type: string[]; payments: string[]; inventory: string; shipping: string[]; accounts: string; coupons: string; tracking: string; reviews: string; wishlist: string; gst: string; multiVendor: string };
  G3: { purpose: string; roles: string[]; dashboard: string; realtime: string; apis: string; migration: string; multiTenant: string; reportExport: string[]; tech: string[] };
  G4: { platform: string; type: string; auth: string[]; push: string; gps: string; offline: string; media: string[]; payments: string; hosting: string; accounts: string[] };
  G5: { goal: string; traffic: string[]; cta: string; funnel: string; ab: string; leadConnect: string[]; thankYou: string };
  G6: { useCase: string[]; knowledge: string[]; platform: string[]; handoff: string };
  G7: { tickets: string; sla: string; channels: string[]; autoreply: string };
  G8: { points: string; trigger: string; tools: string; volume: string };
  H: { style: string[]; references: string; assets: string[]; copy: string; media: string; video: string; mobile: string };
  I: { support: string; updates: string; monitor: string; hostMgmt: string; training: string; future: string };
  J: { budget: string; timeline: string; nda: string; ownership: string; payment: string[]; notes: string };
  K: { lock: boolean; budgetAppr: boolean; auth: boolean; ndaSign: string };
  sign: { clientName: string; clientSig: string; clientDate: string; repName: string; repSig: string; repDate: string };
}

const INITIAL_STATE: FormState = {
  meta: { projectNo: '', date: new Date().toLocaleDateString(), handler: '', track: 'Standard' },
  A: { name: '', industry: '', bizModel: '', description: '', website: '', poc: '', role: '', phone: '', whatsapp: '', email: '', city: '', approver: '', comms: [] },
  B: { goal: [], problem: '', failureReason: '', outcome: '', audience: '', competitors: '', successMetric: '' },
  C: { common: [], flow: '', additional: '', exclusions: '' },
  D: { payments: [], comms: [], maps: [], analytics: [], crm: [], auth: [], ai: [], other: '' },
  E: { backend: '', db: '', server: '', hosting: '', domainStatus: '', domainName: '', ssl: '', scale: '', sensitivity: '', compliance: [] },
  F: [
    { platform: 'Supabase', owner: '', billing: '', transfer: '', access: '' },
    { platform: 'Vercel / Netlify', owner: '', billing: '', transfer: '', access: '' },
    { platform: 'GitHub Repo', owner: '', billing: '', transfer: '', access: '' },
    { platform: 'Domain Registrar', owner: '', billing: '', transfer: '', access: '' },
    { platform: 'Firebase / AWS', owner: '', billing: '', transfer: '', access: '' },
    { platform: '3rd Party APIs', owner: '', billing: '', transfer: '', access: '' },
  ],
  G1: { type: '', pages: [], pageCount: '', seo: '', leadForm: '', cms: '', blog: '', lang: '', map: '', tech: '' },
  G2: { platform: '', count: '', type: [], payments: [], inventory: '', shipping: [], accounts: '', coupons: '', tracking: '', reviews: '', wishlist: '', gst: '', multiVendor: '' },
  G3: { purpose: '', roles: [], dashboard: '', realtime: '', apis: '', migration: '', multiTenant: '', reportExport: [], tech: [] },
  G4: { platform: '', type: '', auth: [], push: '', gps: '', offline: '', media: [], payments: '', hosting: '', accounts: [] },
  G5: { goal: '', traffic: [], cta: '', funnel: '', ab: '', leadConnect: [], thankYou: '' },
  G6: { useCase: [], knowledge: [], platform: [], handoff: '' },
  G7: { tickets: '', sla: '', channels: [], autoreply: '' },
  G8: { points: '', trigger: '', tools: '', volume: '' },
  H: { style: [], references: '', assets: [], copy: '', media: '', video: '', mobile: '' },
  I: { support: '', updates: '', monitor: '', hostMgmt: '', training: '', future: '' },
  J: { budget: '', timeline: '', nda: '', ownership: '', payment: [], notes: '' },
  K: { lock: false, budgetAppr: false, auth: false, ndaSign: '' },
  sign: { clientName: '', clientSig: '', clientDate: '', repName: '', repSig: '', repDate: '' }
};

// --- COMPONENTS ---

const SectionHead = ({ title, badge }: { title: string; badge?: string }) => (
  <div className="font-syne text-[15px] font-bold text-white border-b border-[rgba(124,58,237,0.25)] pb-3 mb-5 flex items-center gap-3">
    {title}
    {badge && <span className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-widest uppercase ${badge === 'MUST' ? 'bg-[#F43F5E] text-white' : 'bg-[#7C3AED] text-white'}`}>{badge}</span>}
  </div>
);

const FormCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-[#221845] border border-[rgba(124,58,237,0.25)] rounded-[14px] p-4 sm:p-6 mb-5 ${className}`}>{children}</div>
);

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-[10px] font-bold uppercase tracking-[1.5px] text-[#9B89C4] mb-1.5">{children} {required && <span className="text-[#F43F5E] ml-0.5">*</span>}</label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className="w-full bg-[rgba(124,58,237,0.08)] border border-[rgba(124,58,237,0.25)] rounded-lg px-3 py-2 text-[12px] text-[#E2D9F3] outline-none focus:border-[#7C3AED] transition-all placeholder:text-white/10" />
);

const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className="w-full bg-[rgba(124,58,237,0.08)] border border-[rgba(124,58,237,0.25)] rounded-lg px-3 py-3 text-[12px] text-[#E2D9F3] outline-none focus:border-[#7C3AED] transition-all placeholder:text-white/10 min-h-[60px] resize-y" />
);

const RadioPill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all ${active ? 'bg-[#7C3AED] border-[#7C3AED] text-white' : 'bg-[rgba(124,58,237,0.08)] border-[rgba(124,58,237,0.25)] text-[#E2D9F3] hover:border-[#7C3AED]'}`}><div className={`w-3 h-3 rounded-full border flex items-center justify-center ${active ? 'border-white' : 'border-white/30'}`}>{active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}</div>{label}</button>
);

const CheckPill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all ${active ? 'bg-[#7C3AED] border-[#7C3AED] text-white' : 'bg-[rgba(124,58,237,0.08)] border-[rgba(124,58,237,0.25)] text-[#E2D9F3] hover:border-[#7C3AED]'}`}><div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${active ? 'border-white bg-white/20' : 'border-white/30'}`}>{active && <Check size={10} strokeWidth={4} className="text-white" />}</div>{label}</button>
);

const PreviewRow = ({ label, value, bold }: { label: string; value: any; bold?: boolean }) => (
  <div className="grid grid-cols-[180px,1fr] gap-4 border-b border-white/5 pb-1.5">
    <div className="text-[9px] font-bold uppercase tracking-[1.2px] text-[#9B89C4] pt-0.5">{label}</div>
    <div className={`text-[12px] ${bold ? 'font-bold text-[#E2D9F3]' : 'text-[#E2D9F3]'} ${!value ? 'text-white/20 italic' : ''}`}>{value || '— not specified —'}</div>
  </div>
);

// --- MAIN PAGE ---

export default function ClientRequirementPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(() => {
    const saved = localStorage.getItem('omma-client-intake-v3');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });
  const [svcs, setSvcs] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => { localStorage.setItem('omma-client-intake-v3', JSON.stringify(form)); }, [form]);

  const update = (sec: keyof FormState, field: string, val: any) => { setForm(prev => { const section: any = prev[sec]; if (Array.isArray(section)) return prev; return { ...prev, [sec]: { ...section, [field]: val } }; }); };
  const toggleArray = (sec: keyof FormState, field: string, item: string) => { setForm(prev => { const section: any = prev[sec]; const arr = section[field] as string[]; const next = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]; return { ...prev, [sec]: { ...section, [field]: next } }; }); };
  const updateF = (idx: number, key: string, val: string) => { setForm(prev => { const next = [...prev.F]; next[idx] = { ...next[idx], [key]: val }; return { ...prev, F: next }; }); };

  const generatePlainText = () => {
    let t = `OomaLabs — PROJECT REQUIREMENT BRIEF\n=====================================\n\n`;
    t += `[META]\n- Project: ${form.meta.projectNo}\n- Date: ${form.meta.date}\n- Handler: ${form.meta.handler}\n\n`;
    t += `[A. CLIENT PROFILE]\n- Company: ${form.A.name}\n- Industry: ${form.A.industry}\n- Website: ${form.A.website}\n- Email: ${form.A.email}\n- Location: ${form.A.city}\n\n`;
    t += `[B. OBJECTIVES]\n- Goal: ${form.B.goal.join(', ')}\n- Problem: ${form.B.problem}\n- Success Metric: ${form.B.successMetric}\n\n`;
    t += `[C. SCOPE]\n- Service Tracks: ${svcs.join(', ')}\n- Core Features: ${form.C.common.join(', ')}\n- APIs: ${[...form.D.payments, ...form.D.comms, ...form.D.ai].join(', ')}\n\n`;
    t += `[E. TECH STACK]\n- Backend: ${form.E.backend}\n- Hosting: ${form.E.hosting}\n- Scale: ${form.E.scale}\n\n`;
    t += `[J. LOGISTICS]\n- Budget: ${form.J.budget}\n- Timeline: ${form.J.timeline}\n- Ownership: ${form.J.ownership}\n\n`;
    t += `[SIGN OFF]\n- Client: ${form.sign.clientName} (${form.sign.clientSig})\n- Rep: ${form.sign.repName} (${form.sign.repSig})\n\n-- End of Brief --`;
    return t;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatePlainText());
    alert('Plain Text Brief Copied to Clipboard!');
  };

  const stats = useMemo(() => {
    let filled = 0, total = 0;
    const count = (obj: any) => Object.values(obj).forEach(v => { total++; if (Array.isArray(v) && v.length > 0) filled++; else if (typeof v === 'string' && v.trim()) filled++; else if (typeof v === 'boolean' && v) filled++; });
    count(form.A); count(form.B); count(form.J);
    return { pct: Math.round((filled / total) * 100) };
  }, [form]);

  return (
    <div className="min-h-screen bg-[#0F0A1E] text-[#E2D9F3] pb-32 selection:bg-[#7C3AED]/40 font-dm">
      <div className="bg-gradient-to-br from-[#3B0764] via-[#7C3AED] to-[#EC4899] px-4 sm:px-10 py-10 relative"><div className="max-w-6xl mx-auto flex flex-col lg:flex-row justify-between items-start gap-8 relative z-10"><div><div className="flex items-center gap-4 mb-2"><button onClick={() => navigate('/ideas')} className="p-2.5 bg-black/20 hover:bg-black/40 rounded-xl transition-all border border-white/10 text-white"><ChevronLeft size={18}/></button><h1 className="font-syne text-[28px] font-extrabold text-white tracking-tight leading-none">Ooma<span className="text-[#F9A8D4]">Labs</span></h1></div><div className="text-[11px] text-white/60 tracking-[2px] uppercase font-bold pl-12">Requirement Intake Suite v3.1</div></div><div className="bg-black/25 backdrop-blur-md rounded-[10px] p-4 grid grid-cols-2 gap-x-6 gap-y-3 border border-white/10 min-w-[320px]"><div><Label>Form No.</Label><input className="bg-transparent border-b border-white/30 text-white text-[12px] outline-none w-full py-0.5" value={form.meta.projectNo} onChange={e => update('meta', 'projectNo', e.target.value)}/></div><div><Label>Date</Label><input className="bg-transparent border-b border-white/30 text-white text-[12px] outline-none w-full py-0.5" value={form.meta.date} onChange={e => update('meta', 'date', e.target.value)}/></div></div></div></div>

      <main className="max-w-6xl mx-auto px-4 sm:px-10 pt-10">
        <FormCard>
          <SectionHead title="Step 1 — Project Track" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {id:'website',label:'Website',icon:Globe},
              {id:'ecom',label:'E-Commerce',icon:ShoppingBag},
              {id:'webapp',label:'Web App',icon:Layers},
              {id:'mobile',label:'Mobile',icon:Smartphone},
              {id:'landing',label:'Landing',icon:Zap},
              {id:'chatbot',label:'AI Bot',icon:MessageSquare},
              {id:'support',label:'Support',icon:Terminal},
              {id:'automation',label:'Automation',icon:Cpu}
            ].map(s=>(
              <label key={s.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${svcs.includes(s.id)?'bg-[#7C3AED]/20 border-[#7C3AED] text-white shadow-[0_0_20px_rgba(124,58,237,0.15)]':'bg-[#1A1035]/40 border-white/5 text-[#9B89C4] hover:border-white/10'}`}>
                <input type="checkbox" className="hidden" checked={svcs.includes(s.id)} onChange={() => setSvcs(prev=>prev.includes(s.id)?prev.filter(x=>x!==s.id):[...prev,s.id])}/>
                <div className={`${svcs.includes(s.id)?'text-white':'text-[#7C3AED]'} opacity-80`}><s.icon size={22}/></div>
                <span className="text-[13px] font-bold uppercase tracking-wider">{s.label}</span>
              </label>
            ))}
          </div>
        </FormCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <FormCard><SectionHead title="A. Client Profile" badge="MUST" /><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="md:col-span-2"><Label required>Company Name</Label><Input value={form.A.name} onChange={e => update('A', 'name', e.target.value)}/></div><div><Label required>Industry</Label><Input value={form.A.industry} onChange={e => update('A', 'industry', e.target.value)}/></div><div><Label required>POC</Label><Input value={form.A.poc} onChange={e => update('A', 'poc', e.target.value)}/></div><div><Label required>Email</Label><Input value={form.A.email} onChange={e => update('A', 'email', e.target.value)}/></div></div></FormCard>
          <FormCard><SectionHead title="B. Project Objective" badge="MUST" /><div className="space-y-4"><div><Label required>Goal</Label><div className="flex flex-wrap gap-2">{['Leads', 'Sales', 'Ops', 'Branding'].map(m=>(<CheckPill key={m} label={m} active={form.B.goal.includes(m)} onClick={()=>toggleArray('B','goal',m)}/>))}</div></div><div><Label required>Problem</Label><TextArea value={form.B.problem} onChange={e => update('B', 'problem', e.target.value)}/></div></div></FormCard>
        </div>

        <FormCard><SectionHead title="C. Features & D. Tooling" /><div className="grid grid-cols-1 md:grid-cols-2 gap-10"><div><Label>Service Scope</Label><div className="flex flex-wrap gap-2">{['Auth', 'Admin Panel', 'Dashboard', 'Payments', 'Analytics'].map(x=>(<CheckPill key={x} label={x} active={form.C.common.includes(x)} onClick={()=>toggleArray('C','common',x)}/>))}</div></div><div><Label>3rd Party APIs</Label><div className="flex flex-wrap gap-2">{['Razorpay', 'WhatsApp', 'GPT-4', 'Stripe'].map(x=>(<CheckPill key={x} label={x} active={form.D.payments.includes(x)} onClick={()=>toggleArray('D','payments',x)}/>))}</div></div></div></FormCard>

        <FormCard><SectionHead title="E. Architecture & F. Ownership" badge="INFRA" />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8"><div><Label>Platform Backend</Label><div className="flex gap-2">{['Supabase', 'Firebase', 'Custom'].map(x=>(<RadioPill key={x} label={x} active={form.E.backend===x} onClick={()=>update('E','backend',x)}/>))}</div></div><div><Label>Hosting</Label><div className="flex gap-2">{['Vercel', 'AWS', 'Netlify'].map(x=>(<RadioPill key={x} label={x} active={form.E.hosting===x} onClick={()=>update('E','hosting',x)}/>))}</div></div></div>
           <table className="w-full text-[11px]">
             <thead>
               <tr className="text-[#9B89C4] uppercase border-b border-white/10">
                 <th className="pb-2 text-left">Platform</th>
                 <th className="pb-2 text-left">Owner</th>
                 <th className="pb-2 text-left">Billing</th>
               </tr>
             </thead>
             <tbody>
               {form.F.map((r,i)=>(
                 <tr key={r.platform} className="border-b border-white/5">
                   <td className="py-2 text-white font-bold">{r.platform}</td>
                   <td>{['Client','Ooma'].map(o=>(<button key={o} onClick={()=>updateF(i,'owner',o)} className={`px-2 py-0.5 mr-1 rounded-[4px] text-[9px] ${r.owner===o?'bg-[#7C3AED]':'bg-white/5'}`}>{o}</button>))}</td>
                   <td>{['Client','Ooma'].map(o=>(<button key={o} onClick={()=>updateF(i,'billing',o)} className={`px-2 py-0.5 mr-1 rounded-[4px] text-[9px] ${r.billing===o?'bg-[#7C3AED]':'bg-white/5'}`}>{o}</button>))}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </FormCard>

        {/* ── SECTION G: SERVICE TRACKS ── */}
        {svcs.includes('website') && (
          <FormCard>
            <SectionHead title="G1. Website Specifics" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><Label>Website Type</Label><div className="flex flex-wrap gap-2">{['Corporate', 'Portfolio', 'News / Blog'].map(x=>(<RadioPill key={x} label={x} active={form.G1.type===x} onClick={()=>update('G1','type',x)}/>))}</div></div>
              <div><Label>Page Count</Label><Input placeholder="e.g. 5–10 pages" value={form.G1.pageCount} onChange={e=>update('G1','pageCount',e.target.value)}/></div>
            </div>
          </FormCard>
        )}

        {svcs.includes('ecom') && (
          <FormCard>
            <SectionHead title="G2. E-Commerce Specifics" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><Label>SKU / Product Count</Label><Input value={form.G2.count} onChange={e=>update('G2','count',e.target.value)}/></div>
              <div><Label>Shipping Methods</Label><div className="flex flex-wrap gap-2">{['Standard', 'Express', 'Hyperlocal'].map(x=>(<CheckPill key={x} label={x} active={form.G2.shipping.includes(x)} onClick={()=>toggleArray('G2','shipping',x)}/>))}</div></div>
            </div>
          </FormCard>
        )}

        {svcs.includes('webapp') && (
          <FormCard>
             <SectionHead title="G3. Web App Specifics" />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label>App Purpose</Label><TextArea value={form.G3.purpose} onChange={e=>update('G3','purpose',e.target.value)}/></div>
                <div><Label>User Roles</Label><div className="flex flex-wrap gap-2">{['Admin', 'Manager', 'Client', 'Guest'].map(x=>(<CheckPill key={x} label={x} active={form.G3.roles.includes(x)} onClick={()=>toggleArray('G3','roles',x)}/>))}</div></div>
             </div>
          </FormCard>
        )}

        {svcs.includes('mobile') && (
          <FormCard>
            <SectionHead title="G4. Mobile App Specifics" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><Label>Target Platforms</Label><div className="flex gap-2">{['iOS', 'Android', 'Both'].map(x=>(<RadioPill key={x} label={x} active={form.G4.platform===x} onClick={()=>update('G4','platform',x)}/>))}</div></div>
              <div><Label>App Type</Label><div className="flex gap-2">{['Native', 'Hybrid', 'PWA'].map(x=>(<RadioPill key={x} label={x} active={form.G4.type===x} onClick={()=>update('G4','type',x)}/>))}</div></div>
            </div>
          </FormCard>
        )}

        {svcs.includes('landing') && (
          <FormCard>
            <SectionHead title="G5. Landing Page Specifics" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><Label>Conversion Goal</Label><Input placeholder="e.g. Booking / Sign-up" value={form.G5.goal} onChange={e=>update('G5','goal',e.target.value)}/></div>
              <div><Label>Traffic Source</Label><div className="flex flex-wrap gap-2">{['Meta Ads', 'Google Ads', 'Email'].map(x=>(<CheckPill key={x} label={x} active={form.G5.traffic.includes(x)} onClick={()=>toggleArray('G5','traffic',x)}/>))}</div></div>
            </div>
          </FormCard>
        )}

        {svcs.includes('chatbot') && (
          <FormCard>
             <SectionHead title="G6. AI Chatbot Specifics" />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label>Knowledge Base</Label><div className="flex flex-wrap gap-2">{['Website', 'PDFs', 'Database'].map(x=>(<CheckPill key={x} label={x} active={form.G6.knowledge.includes(x)} onClick={()=>toggleArray('G6','knowledge',x)}/>))}</div></div>
                <div><Label>Human Handoff</Label><div className="flex gap-2">{['Required', 'Not Needed'].map(x=>(<RadioPill key={x} label={x} active={form.G6.handoff===x} onClick={()=>update('G6','handoff',x)}/>))}</div></div>
             </div>
          </FormCard>
        )}

        {svcs.includes('support') && (
          <FormCard>
            <SectionHead title="G7. AI Support Specifics" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><Label>Ticket Platform</Label><Input placeholder="Zendesk / Intercom" value={form.G7.tickets} onChange={e=>update('G7','tickets',e.target.value)}/></div>
              <div><Label>Channels</Label><div className="flex flex-wrap gap-2">{['Email', 'Web Chat', 'WhatsApp'].map(x=>(<CheckPill key={x} label={x} active={form.G7.channels.includes(x)} onClick={()=>toggleArray('G7','channels',x)}/>))}</div></div>
            </div>
          </FormCard>
        )}

        {svcs.includes('automation') && (
          <FormCard>
            <SectionHead title="G8. Automation Specifics" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><Label>Workflow Trigger</Label><Input placeholder="e.g. New Order" value={form.G8.trigger} onChange={e=>update('G8','trigger',e.target.value)}/></div>
              <div><Label>Tools Involved</Label><Input placeholder="e.g. Zapier / Make" value={form.G8.tools} onChange={e=>update('G8','tools',e.target.value)}/></div>
            </div>
          </FormCard>
        )}

        <FormCard><SectionHead title="H. Design & I. Support" />
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div><Label>Visual Style</Label><div className="flex flex-wrap gap-2">{['Clean', 'Bold', 'Minimal', 'Dark'].map(x=>(<CheckPill key={x} label={x} active={form.H.style.includes(x)} onClick={()=>toggleArray('H','style',x)}/>))}</div></div>
              <div><Label>Support Tier</Label><div className="flex flex-wrap gap-2">{['Maintenance', 'On-Call', 'Retainer'].map(x=>(<RadioPill key={x} label={x} active={form.I.support===x} onClick={()=>update('I','support',x)}/>))}</div></div>
           </div>
        </FormCard>

        <FormCard><SectionHead title="J. Logistics" /><div className="grid grid-cols-1 md:grid-cols-2 gap-10"><div><Label>Budget</Label><div className="grid grid-cols-2 gap-2">{['Below ₹1L', '₹1L–₹3L', '₹3L–₹10L', '₹10L+'].map(x=>(<RadioPill key={x} label={x} active={form.J.budget===x} onClick={()=>update('J','budget',x)}/>))}</div></div><div><Label>Timeline</Label><div className="grid grid-cols-2 gap-2">{['Rush', '1 Month', '3 Months', 'Flexible'].map(x=>(<RadioPill key={x} label={x} active={form.J.timeline===x} onClick={()=>update('J','timeline',x)}/>))}</div></div></div></FormCard>

        {/* ── SIGNATURE ── */}
        <div className="bg-gradient-to-br from-[#7C3AED]/10 to-[#EC4899]/10 border border-white/10 rounded-[14px] p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
           <div><Label>Client Name</Label><input className="w-full bg-transparent border-b border-white/30 text-white outline-none" value={form.sign.clientName} onChange={e=>update('sign','clientName',e.target.value)}/></div>
           <div><Label>Signature</Label><input className="w-full bg-transparent border-b border-white/30 text-[#7C3AED] italic font-syne outline-none" value={form.sign.clientSig} onChange={e=>update('sign','clientSig',e.target.value)}/></div>
           <div><Label>Date</Label><input className="w-full bg-transparent border-b border-white/30 text-white outline-none" value={form.sign.clientDate} onChange={e=>update('sign','clientDate',e.target.value)}/></div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0F0A1E]/90 backdrop-blur-xl border-t border-white/10 px-6 py-4 z-50 flex justify-between items-center no-print">
         <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/40 flex items-center justify-center font-bold text-white">{stats.pct}%</div><div className="hidden sm:block text-[10px] text-[#9B89C4] uppercase font-bold tracking-widest">Progress</div></div>
         <div className="flex gap-4"><button onClick={() => setForm(INITIAL_STATE)} className="px-4 py-2 bg-white/5 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 transition-all"><Trash2 size={14}/></button><button onClick={() => setIsPreview(true)} className="px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] rounded-xl text-[11px] font-bold uppercase text-white shadow-lg flex items-center gap-2"><FileText size={16}/> Preview Master Brief</button></div>
      </footer>

      {/* ── FULL PREVIEW MODAL ── */}
      {isPreview && (
        <div className="fixed inset-0 z-[100] bg-[#05020F]/99 backdrop-blur-xl overflow-y-auto no-print">
           <div className="bg-[#7C3AED] px-10 py-2 sticky top-0 flex justify-between items-center shadow-md z-20">
              <div><h2 className="font-syne text-[15px] font-extrabold text-white leading-none">Master Brief Summary</h2><p className="text-[8px] text-white/50 tracking-[1px] uppercase font-bold">Industrial v3.1</p></div>
              <div className="flex gap-2">
                <button onClick={copyToClipboard} className="px-2.5 py-1 bg-white/10 text-white rounded-md text-[9px] font-bold flex items-center gap-1.5 hover:bg-white/20 transition-all"><Copy size={12}/> Copy</button>
                <button onClick={() => window.print()} className="px-2.5 py-1 bg-white/10 text-white rounded-md text-[9px] font-bold flex items-center gap-1.5 hover:bg-white/20 transition-all"><Printer size={12}/> Print</button>
                <button onClick={()=>setIsPreview(false)} className="px-2.5 py-1 bg-black/40 text-white rounded-md text-[9px] font-bold flex items-center gap-1.5 hover:bg-black/60 transition-all"><X size={12}/> Close</button>
              </div>
           </div>

           <div className="max-w-4xl mx-auto py-6 px-6 space-y-4">
              <div className="bg-[#1A1035] border border-white/10 rounded-xl overflow-hidden">
                 <div className="bg-white/5 px-6 py-3 text-[12px] font-bold text-[#C4B5FD] uppercase tracking-widest border-b border-white/10">🏁 Mission Metadata</div>
                 <div className="p-6 space-y-1"><PreviewRow label="Form ID" value={form.meta.projectNo} /><PreviewRow label="Date" value={form.meta.date} /><PreviewRow label="Track" value={form.meta.track} /></div>
              </div>

              <div className="bg-[#1A1035] border border-white/10 rounded-xl overflow-hidden">
                 <div className="bg-white/5 px-6 py-3 text-[12px] font-bold text-[#C4B5FD] uppercase tracking-widest border-b border-white/10">🎯 Client Identity</div>
                 <div className="p-6 space-y-1">
                    <PreviewRow label="Company" value={form.A.name} bold/>
                    <PreviewRow label="Industry" value={form.A.industry}/>
                    <PreviewRow label="POC Name" value={form.A.poc}/>
                    <PreviewRow label="Phone" value={form.A.phone}/>
                    <PreviewRow label="Official Email" value={form.A.email}/>
                    <PreviewRow label="Location" value={form.A.city}/>
                 </div>
              </div>

              <div className="bg-[#1A1035] border border-white/10 rounded-xl overflow-hidden">
                 <div className="bg-white/5 px-6 py-3 text-[12px] font-bold text-[#C4B5FD] uppercase tracking-widest border-b border-white/10">🎯 Project Objectives (B)</div>
                 <div className="p-6 space-y-1">
                    <PreviewRow label="Primary Goals" value={form.B.goal.join(', ')} />
                    <PreviewRow label="Problem Context" value={form.B.problem} />
                    <PreviewRow label="Target Audience" value={form.B.audience} />
                 </div>
              </div>

              <div className="bg-[#1A1035] border border-white/10 rounded-xl overflow-hidden">
                 <div className="bg-white/5 px-6 py-3 text-[12px] font-bold text-[#C4B5FD] uppercase tracking-widest border-b border-white/10">⚙ Platform Scope (C-D)</div>
                 <div className="p-6 space-y-6">
                    <div>
                      <div className="text-[10px] font-bold text-[#9B89C4] uppercase mb-2">Core Tracks</div>
                      <div className="flex flex-wrap gap-2">{svcs.map(s=>(<span key={s} className="bg-[#7C3AED]/20 border border-[#7C3AED]/40 text-white text-[10px] px-3 py-1 rounded-full uppercase font-bold">{s}</span>))}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[#9B89C4] uppercase mb-2">Selected Features</div>
                      <div className="flex flex-wrap gap-2">{form.C.common.map(f=>(<span key={f} className="bg-white/5 text-[#E2D9F3] text-[10px] px-2 py-1 rounded border border-white/10">{f}</span>))}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[#9B89C4] uppercase mb-2">Technical Integrations</div>
                      <div className="flex flex-wrap gap-2">{[...form.D.payments, ...form.D.comms, ...form.D.ai].map(f=>(<span key={f} className="underline text-[#7C3AED] text-[11px] font-bold italic mr-3">{f}</span>))}</div>
                    </div>
                 </div>
              </div>

              <div className="bg-[#1A1035] border border-white/10 rounded-xl overflow-hidden">
                 <div className="bg-white/5 px-6 py-3 text-[12px] font-bold text-[#C4B5FD] uppercase tracking-widest border-b border-white/10">🎨 Design & Support (H-I)</div>
                 <div className="p-6 space-y-1">
                    <PreviewRow label="Visual Style" value={form.H.style.join(', ')} />
                    <PreviewRow label="Post-Launch Tier" value={form.I.support} />
                 </div>
              </div>

              <div className="bg-[#1A1035] border border-white/10 rounded-xl overflow-hidden">
                 <div className="bg-white/5 px-6 py-3 text-[12px] font-bold text-[#C4B5FD] uppercase tracking-widest border-b border-white/10">🏗 Technical Blueprint (E-F)</div>
                 <div className="p-6 space-y-1">
                    <PreviewRow label="Backend / DB" value={form.E.backend}/>
                    <PreviewRow label="Hosting / Infra" value={form.E.hosting}/>
                    <PreviewRow label="User Scale" value={form.E.scale}/>
                 </div>
                 <div className="px-6 pb-6 overflow-x-auto">
                    <div className="text-[10px] font-bold text-[#9B89C4] uppercase mb-4 opacity-50">Ownership Matrix</div>
                    <table className="w-full text-left text-[11px] border-t border-white/5 pt-4">
                       <thead>
                          <tr className="text-[#9B89C4]"><th>Asset</th><th>Owner</th><th>Billing</th></tr>
                       </thead>
                       <tbody>
                          {form.F.map(r=>(<tr key={r.platform} className="border-b border-white/5"><td className="py-2 font-bold">{r.platform}</td><td>{r.owner}</td><td>{r.billing}</td></tr>))}
                       </tbody>
                    </table>
                 </div>
              </div>

              {svcs.length > 0 && (
                <div className="bg-[#1A1035] border border-white/10 rounded-xl overflow-hidden">
                   <div className="bg-[#10B981]/10 px-6 py-3 text-[12px] font-bold text-[#10B981] uppercase tracking-widest border-b border-[#10B981]/10">🔧 Service Track Specifics (G)</div>
                   <div className="p-6 space-y-1">
                      {svcs.includes('website') && <PreviewRow label="Web Type" value={form.G1.type} />}
                      {svcs.includes('website') && <PreviewRow label="Page Setup" value={form.G1.pageCount} />}
                      {svcs.includes('ecom') && <PreviewRow label="Ecom Platform" value={form.G2.platform} />}
                      {svcs.includes('ecom') && <PreviewRow label="SKU Count" value={form.G2.count} />}
                      {svcs.includes('webapp') && <PreviewRow label="Web App Goal" value={form.G3.purpose} />}
                      {svcs.includes('mobile') && <PreviewRow label="Mobile Stack" value={form.G4.platform} />}
                      {svcs.includes('landing') && <PreviewRow label="CTA / Goal" value={form.G5.goal} />}
                      {svcs.includes('chatbot') && <PreviewRow label="Bot Knowledge" value={form.G6.knowledge.join(', ')} />}
                      {svcs.includes('support') && <PreviewRow label="Support Hub" value={form.G7.tickets} />}
                      {svcs.includes('automation') && <PreviewRow label="Auto Trigger" value={form.G8.trigger} />}
                   </div>
                </div>
              )}

              <div className="bg-[#1A1035] border border-white/10 rounded-xl overflow-hidden">
                 <div className="bg-white/5 px-6 py-3 text-[12px] font-bold text-[#C4B5FD] uppercase tracking-widest border-b border-white/10">⚖ Logistics & Legal</div>
                 <div className="p-6 space-y-1">
                    <PreviewRow label="Budget" value={form.J.budget} bold/>
                    <PreviewRow label="Timeline" value={form.J.timeline} bold/>
                    <PreviewRow label="Ownership" value={form.J.ownership}/>
                    <PreviewRow label="NDA Required" value={form.J.nda}/>
                 </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                 <div className="flex justify-between items-end border-b border-white/10 pb-6 mb-2">
                    <div className="text-left">
                       <div className="font-syne text-[20px] italic text-[#7C3AED] leading-none mb-2">{form.sign.clientSig || 'Digital-Stamp'}</div>
                       <div className="w-40 h-[1px] bg-white/20 mb-1"/>
                       <div className="text-[9px] font-bold text-[#9B89C4] uppercase tracking-widest">Client Signature</div>
                    </div>
                    <div className="text-right">
                       <div className="font-syne text-[16px] font-bold text-[#EC4899] leading-none mb-2">{form.sign.repSig || 'OL-Verified'}</div>
                       <div className="w-40 h-[1px] bg-white/20 mb-1 ml-auto"/>
                       <div className="text-[9px] font-bold text-[#9B89C4] uppercase tracking-widest">OomaLabs Verified</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
