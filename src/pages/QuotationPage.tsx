import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, CheckCircle, Copy, Check, Plus, X, Pencil, Eye, Download, Clock, History as HistoryIcon, Trash2 } from 'lucide-react';

interface ScopeItem { title: string; desc: string; }
interface Phase { name: string; days: string; tasks: string; }
interface PaymentMilestone { pct: string; label: string; trigger: string; }
interface CostItem { label: string; amount: string; qty?: string; unitPrice?: string; }

const serviceScopeMap: Record<string, ScopeItem[]> = {
  'Web Application': [
    { title: 'Frontend Development', desc: 'React.js SPA with Tailwind CSS styling and responsive layouts.' },
    { title: 'Backend API', desc: 'Node.js REST backend connecting to PostgreSQL database.' },
  ],
  'Mobile App': [
    { title: 'Mobile UI Development', desc: 'React Native cross-platform app with native-feel components.' },
    { title: 'API Integration', desc: 'RESTful API integration with push notifications and offline support.' },
  ],
  'UI/UX Design': [
    { title: 'User Research & Wireframes', desc: 'User flow mapping, low-fi wireframes, and interactive prototypes.' },
    { title: 'Visual Design System', desc: 'Brand-aligned design system with typography, colors, and components.' },
  ],
  'Cloud Architecture': [
    { title: 'Infrastructure Design', desc: 'Scalable cloud architecture on AWS/GCP with auto-scaling and load balancing.' },
    { title: 'DevOps & CI/CD', desc: 'Automated deployment pipelines, monitoring dashboards, and alerting.' },
  ],
  'Maintenance': [
    { title: 'Ongoing Support', desc: 'Monthly maintenance, bug fixes, security patches, and performance tuning.' },
    { title: 'Feature Enhancements', desc: 'Iterative feature updates based on user feedback and analytics.' },
  ],
  'E-commerce': [
    { title: 'Storefront Development', desc: 'Product catalog, cart, checkout flow with Stripe/Razorpay integration.' },
    { title: 'Inventory & Orders', desc: 'Admin panel for inventory management, order tracking, and analytics.' },
  ],
};

const servicePhaseMap: Record<string, Phase[]> = {
  'Web Application': [
    { name: 'Discovery', days: '7 Days', tasks: 'Requirements gathering & technical planning' },
    { name: 'Development', days: '21 Days', tasks: 'Core features implementation' },
    { name: 'Testing & Launch', days: '7 Days', tasks: 'QA, UAT, and production deployment' },
  ],
  'Mobile App': [
    { name: 'Planning', days: '5 Days', tasks: 'App architecture & screen mapping' },
    { name: 'Build', days: '28 Days', tasks: 'Cross-platform development & testing' },
    { name: 'Release', days: '7 Days', tasks: 'App store submission & launch' },
  ],
  'UI/UX Design': [
    { name: 'Research', days: '5 Days', tasks: 'User interviews & competitor analysis' },
    { name: 'Design', days: '14 Days', tasks: 'Wireframes, mockups & prototypes' },
    { name: 'Handoff', days: '3 Days', tasks: 'Developer handoff & design QA' },
  ],
  'Cloud Architecture': [
    { name: 'Assessment', days: '5 Days', tasks: 'Infrastructure audit & requirements' },
    { name: 'Implementation', days: '14 Days', tasks: 'Cloud setup & migration' },
    { name: 'Optimization', days: '7 Days', tasks: 'Performance tuning & monitoring' },
  ],
  'Maintenance': [
    { name: 'Onboarding', days: '3 Days', tasks: 'Codebase review & setup' },
    { name: 'Active Support', days: 'Ongoing', tasks: 'Monthly maintenance cycles' },
    { name: 'Reporting', days: 'Monthly', tasks: 'Status reports & recommendations' },
  ],
  'E-commerce': [
    { name: 'Setup', days: '5 Days', tasks: 'Store configuration & payment gateway' },
    { name: 'Build', days: '21 Days', tasks: 'Product pages, cart & checkout' },
    { name: 'Launch', days: '7 Days', tasks: 'Testing, SEO & go-live' },
  ],
};

const serviceDeliverables: Record<string, string[]> = {
  'Web Application': ['Responsive Web App', 'Admin Dashboard', 'REST API', 'Database Schema'],
  'Mobile App': ['iOS App', 'Android App', 'Push Notifications', 'App Store Listing'],
  'UI/UX Design': ['Wireframes', 'UI Mockups', 'Design System', 'Prototype'],
  'Cloud Architecture': ['Architecture Diagram', 'CI/CD Pipeline', 'Monitoring Setup', 'Documentation'],
  'Maintenance': ['Monthly Reports', 'Bug Fixes', 'Security Patches', 'Performance Audit'],
  'E-commerce': ['Product Catalog', 'Shopping Cart', 'Payment Gateway', 'Order Management'],
};

const servicePriceMap: Record<string, number> = {
  'Web Application': 15000,
  'Mobile App': 20000,
  'UI/UX Design': 8000,
  'Cloud Architecture': 12000,
  'Maintenance': 5000,
  'E-commerce': 18000,
};

const serviceIcons: Record<string, string> = {
  'Web Application': '🌐',
  'Mobile App': '📱',
  'UI/UX Design': '🎨',
  'Cloud Architecture': '☁️',
  'Maintenance': '🔧',
  'E-commerce': '🛒',
};

const serviceExclusionsMap: Record<string, string[]> = {
  'Web Application': ['Content writing or copywriting services.', 'Purchasing of third-party domain or hosting.', 'Data migration from legacy systems.'],
  'Mobile App': ['App store developer account fees.', 'Creation of promotional videos or marketing material.', 'Backend server hosting fees.'],
  'UI/UX Design': ['Implementation or coding of the designs.', 'Purchasing of premium stock photography or fonts.', 'Brand logo design (unless specified).'],
  'Cloud Architecture': ['Actual cloud provider monthly usage fees (AWS/GCP/Azure invoices).', 'Application code refactoring to fit cloud native patterns.', 'Procurement of third-party software licenses.'],
  'Maintenance': ['Development of entirely new features or large modules.', 'On-site support or hardware maintenance.', 'Fixes for code modified by unauthorized third parties.'],
  'E-commerce': ['Product data entry or catalog population.', 'Payment gateway merchant account setup fees.', 'Professional product photography.'],
};

const serviceWarrantyMap: Record<string, string> = {
  'Web Application': '30-day post-launch warranty for fixing reproducible bugs within the original scope. New features post-launch are billed separately.',
  'Mobile App': '45-day post-launch warranty for fixing reproducible bugs and crash resolution on supported OS versions.',
  'UI/UX Design': '14-day revision period post handoff for minor adjustments to final mockups.',
  'Cloud Architecture': '30-day monitoring and fine-tuning period to ensure stable infrastructure and expected scaling.',
  'Maintenance': 'Covered under continuous SLAs as defined in the maintenance agreement rather than a standalone warranty.',
  'E-commerce': '30-day post-launch warranty covering core workflows (checkout, cart, inventory sync).',
};

const serviceNextStepsMap: Record<string, string[]> = {
  'Web Application': ['Review and approve this quotation.', 'Process initial deposit.', 'Share existing brand assets and access credentials.'],
  'Mobile App': ['Approve quotation & sign agreement.', 'Pay mobilization deposit.', 'Schedule initial architecture workshop.'],
  'UI/UX Design': ['Sign approval off on quotation.', 'Complete creative brief questionnaire.', 'Schedule discovery and research kickoff.'],
  'Cloud Architecture': ['Approve proposal.', 'Provide current infrastructure access.', 'Schedule technical deep-dive call.'],
  'Maintenance': ['Sign SLA agreement.', 'Provide repository & server access.', 'Initial codebase audit and onboarding.'],
  'E-commerce': ['Approve and sign quotation.', 'Provide preliminary product lists.', 'Setup initial merchant accounts.'],
};

export default function QuotationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedServices, setSelectedServices] = useState<string[]>(['Web Application']);

  const [scopes, setScopes] = useState<ScopeItem[]>(serviceScopeMap['Web Application']);
  const [phases, setPhases] = useState<Phase[]>(servicePhaseMap['Web Application']);
  const [deliverables, setDeliverables] = useState<string[]>(serviceDeliverables['Web Application']);
  const [terms, setTerms] = useState<string[]>([
    'Revisions outside the specified scope may incur additional charges at standard hourly rates.',
    'Client delays in providing required assets may extend the final delivery deadline.',
    'Source files and intellectual property transfer upon final payment completion.',
    'All prices are quoted in USD unless otherwise specified.',
  ]);
  const [payments, setPayments] = useState<PaymentMilestone[]>([
    { pct: '50%', label: 'Deposit', trigger: 'To commence work' },
    { pct: '25%', label: 'Milestone', trigger: 'Upon beta delivery' },
    { pct: '25%', label: 'Final', trigger: 'Prior to launch' },
  ]);
  const [costItems, setCostItems] = useState<CostItem[]>([
    { label: 'Engineering & Development', amount: '15,000' },
  ]);

  const [projectName, setProjectName] = useState('Digital Transformation');
  const [validity, setValidity] = useState('14');
  const [metaFields, setMetaFields] = useState<{label: string, value: string, subValue?: string}[]>([
    { label: 'Prepared For', value: 'Acme Corp', subValue: 'contact@acmecorp.com' },
    { label: 'Quotation #', value: 'OL-Q-2026-001' },
    { label: 'Date', value: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), subValue: 'Valid for 14 days' }
  ]);
  const [companyName, setCompanyName] = useState('OomaLabs');
  const [companyAddress, setCompanyAddress] = useState('Gachibowli, Hyderabad, Telangana, India');
  const [companyContact, setCompanyContact] = useState('oomalabs@gmail.com | 9381167058 | www.oomalabs.com');
  const [signatureName, setSignatureName] = useState('OomaLabs Team');
  const [signatureTitle, setSignatureTitle] = useState('Authorized Signature');
  const [executiveSummaryGoal, setExecutiveSummaryGoal] = useState('generate leads, build digital presence, and streamline operations');

  const [exclusions, setExclusions] = useState<string[]>(serviceExclusionsMap['Web Application']);
  const [warranty, setWarranty] = useState<string>(serviceWarrantyMap['Web Application']);
  const [nextSteps, setNextSteps] = useState<string[]>(serviceNextStepsMap['Web Application']);

  const [discount, setDiscount] = useState('15');

  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState(true);
  const [currency, setCurrency] = useState('USD');
  const symbol = currency === 'USD' ? '$' : '₹';
  const locale = currency === 'USD' ? 'en-US' : 'en-IN';
  const [includeGST, setIncludeGST] = useState(false);
  const [gstRate, setGstRate] = useState('18');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [customServices, setCustomServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Print Styles for professional PDF
  const printStyles = `
    @media print {
      /* Hide all UI elements except the document area */
      .no-print { display: none !important; }
      
      /* Reset for print flow */
      html, body { 
        margin: 0 !important; 
        padding: 0 !important; 
        background: #fff !important;
        height: auto !important;
        overflow: visible !important;
        width: 100% !important;
      }

      /* Force the quotation document into a clean, printable state */
      .print-area {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        position: relative !important;
        top: 0 !important;
        left: 0 !important;
      }

      /* Parent container visibility */
      .print-panel-parent { 
        display: block !important;
        padding: 0 !important; 
        margin: 0 !important; 
        overflow: visible !important; 
        height: auto !important;
        background: transparent !important;
        width: 100% !important;
      }

      .print-no-break { break-inside: avoid; page-break-inside: avoid; }
      .fade-in { animation: none !important; opacity: 1 !important; transform: none !important; }
      
      @page { 
        margin: 0; 
        size: auto; 
      }
      body {
        padding: 1.5cm !important;
      }

      * { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        color-adjust: exact !important;
      }
    }
  `;

  // Compute subtotal from cost items
  const computeSubtotal = () => costItems.reduce((sum, c) => {
    const qty = parseFloat(String(c.qty) || '1');
    const unitPrice = parseFloat(String(c.unitPrice || c.amount).replace(/,/g, '')) || 0;
    return sum + (qty * unitPrice);
  }, 0);
  const subtotal = computeSubtotal();
  const disc = parseInt(discount) || 0;
  const priceAfterDiscount = Math.round(subtotal * (1 - disc / 100));
  const gstAmount = includeGST ? Math.round(priceAfterDiscount * (parseInt(gstRate) || 0) / 100) : 0;
  const totalInvestment = priceAfterDiscount + gstAmount;

  useEffect(() => {
    const newScopes = selectedServices.flatMap(s => serviceScopeMap[s] || []);
    setScopes(newScopes);
    const allPhases = selectedServices.flatMap(s => servicePhaseMap[s] || []);
    const seen = new Set<string>();
    setPhases(allPhases.filter(p => { if (seen.has(p.name)) return false; seen.add(p.name); return true; }));
    const allDels = selectedServices.flatMap(s => serviceDeliverables[s] || []);
    setDeliverables(allDels);

    // Update Exclusions, Warranty, Next Steps when services change (if they haven't been manually heavily edited)
    // To be safe we just append or use the first selected service's warranty
    const allExclusions = selectedServices.flatMap(s => serviceExclusionsMap[s] || []);
    const uniqueExclusions = Array.from(new Set(allExclusions));
    setExclusions(uniqueExclusions.length > 0 ? uniqueExclusions : ['No explicit exclusions.']);

    const allNextSteps = selectedServices.flatMap(s => serviceNextStepsMap[s] || []);
    const uniqueNextSteps = Array.from(new Set(allNextSteps));
    setNextSteps(uniqueNextSteps.length > 0 ? uniqueNextSteps : ['Review and sign this quotation.']);

    // Pick warranty from the first selected service
    const firstService = selectedServices[0];
    if (firstService && serviceWarrantyMap[firstService]) {
      setWarranty(serviceWarrantyMap[firstService]);
    } else {
      setWarranty('Standard 30-day post-launch warranty for fixing reproducible bugs within the stated scope.');
    }

    // Auto-generate cost items from selected services
    const newCosts = selectedServices.map(s => ({ 
      label: s, 
      qty: '1',
      unitPrice: (servicePriceMap[s] || 0).toLocaleString(),
      amount: (servicePriceMap[s] || 0).toLocaleString() 
    }));
    setCostItems(newCosts);
  }, [selectedServices]);

  const toggleService = (s: string) => setSelectedServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const updateScope = (i: number, f: keyof ScopeItem, v: string) => { const n = [...scopes]; n[i] = { ...n[i], [f]: v }; setScopes(n); };
  const updatePhase = (i: number, f: keyof Phase, v: string) => { const n = [...phases]; n[i] = { ...n[i], [f]: v }; setPhases(n); };
  const updatePayment = (i: number, f: keyof PaymentMilestone, v: string) => { const n = [...payments]; n[i] = { ...n[i], [f]: v }; setPayments(n); };

  // Add/Remove helpers
  const addScope = () => setScopes([...scopes, { title: 'New Scope Item', desc: 'Description...' }]);
  const removeScope = (i: number) => setScopes(scopes.filter((_, idx) => idx !== i));
  const addPhase = () => setPhases([...phases, { name: 'New Phase', days: '7 Days', tasks: 'Tasks description' }]);
  const removePhase = (i: number) => setPhases(phases.filter((_, idx) => idx !== i));
  const addDeliverable = () => setDeliverables([...deliverables, 'New Deliverable']);
  const removeDeliverable = (i: number) => setDeliverables(deliverables.filter((_, idx) => idx !== i));
  const addTerm = () => setTerms([...terms, 'New term or condition.']);
  const removeTerm = (i: number) => setTerms(terms.filter((_, idx) => idx !== i));
  const addExclusion = () => setExclusions([...exclusions, 'New exclusion item.']);
  const removeExclusion = (i: number) => setExclusions(exclusions.filter((_, idx) => idx !== i));
  const addNextStep = () => setNextSteps([...nextSteps, 'New next step.']);
  const removeNextStep = (i: number) => setNextSteps(nextSteps.filter((_, idx) => idx !== i));
  const addPayment = () => setPayments([...payments, { pct: '0%', label: 'New', trigger: 'Trigger event' }]);
  const removePayment = (i: number) => setPayments(payments.filter((_, idx) => idx !== i));
  const addCostItem = () => setCostItems([...costItems, { label: 'New Line Item', qty: '1', unitPrice: '0', amount: '0' }]);
  const removeCostItem = (i: number) => setCostItems(costItems.filter((_, idx) => idx !== i));
  const updateCostItem = (i: number, f: keyof CostItem, v: string) => { const n = [...costItems]; n[i] = { ...n[i], [f]: v }; setCostItems(n); };

  const addMetaField = () => setMetaFields([...metaFields, { label: 'Field Label', value: 'Value', subValue: '' }]);
  const removeMetaField = (i: number) => setMetaFields(metaFields.filter((_, idx) => idx !== i));
  const updateMetaField = (i: number, f: string, v: string) => { const n = [...metaFields]; n[i] = { ...n[i], [f as any]: v }; setMetaFields(n); };

  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const computedGSTStr = gstAmount.toLocaleString(locale);

  // Supabase Save Function
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('Saving...');
    
    const formData = {
      metaFields,
      costItems,
      selectedServices,
      customServices,
      projectName,
      companyName,
      companyAddress,
      companyContact,
      signatureName,
      signatureTitle,
      currency,
      includeGST,
      gstRate,
      discount,
      terms,
      scopes,
      phases,
      deliverables,
      executiveSummaryGoal,
      exclusions,
      warranty,
      nextSteps
    };

    try {
      const { error } = await supabase
        .from('quotations')
        .insert([{ 
          project_name: projectName, 
          form_data: formData,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      setSaveStatus('Quotation Saved to Supabase!');
      fetchHistory(); // Refresh history
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      console.error('Error saving to Supabase:', err);
      setSaveStatus(`Error: ${err.message || 'Check your quotations table'}`);
    } finally {
      setSaving(false);
    }
  };

  // Fetch History from Supabase
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load Quotation from History
  const loadQuotation = (q: any) => {
    const d = q.form_data;
    if (!d) return;

    setProjectName(d.projectName || '');
    setCompanyName(d.companyName || 'OomaLabs');
    setCompanyAddress(d.companyAddress || '');
    setCompanyContact(d.companyContact || '');
    setSignatureName(d.signatureName || '');
    setSignatureTitle(d.signatureTitle || '');
    setCurrency(d.currency || 'USD');
    setIncludeGST(d.includeGST || false);
    setGstRate(d.gstRate || '18');
    setDiscount(d.discount || '15');
    setMetaFields(d.metaFields || []);
    setSelectedServices(d.selectedServices || []);
    setCustomServices(d.customServices || []);
    setCostItems(d.costItems || []);
    setScopes(d.scopes || []);
    setPhases(d.phases || []);
    setDeliverables(d.deliverables || []);
    setTerms(d.terms || []);
    setExecutiveSummaryGoal(d.executiveSummaryGoal || 'generate leads, build digital presence, and streamline operations');
    setExclusions(d.exclusions || [
      'Content writing or copywriting services.',
      'Purchasing of third-party software licenses or stock photography.',
      'Data migration from legacy systems (unless expressly stated above).',
    ]);
    setWarranty(d.warranty || '30-day post-launch warranty for fixing reproducible bugs within the original scope. New features post-launch are billed separately.');
    setNextSteps(d.nextSteps || [
      'Review and approve this quotation by signing the acceptance block.',
      'Process the initial deposit to secure project scheduling.',
      'Schedule the kickoff meeting with our team to commence the discovery phase.',
    ]);
    
    setShowHistory(false);
    setGenerated(true);
  };

  const deleteFromHistory = async (id: string) => {
    try {
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      if (error) throw error;
      fetchHistory();
    } catch (err) {
      console.error('Error deleting from history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Shared styles for add/remove buttons
  const addBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, padding: '6px 12px', background: '#fdfcf9', border: '1.5px dashed #c9a84c', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#c9a84c', cursor: 'pointer', transition: 'all 0.15s' };
  const removeBtnStyle: React.CSSProperties = { position: 'absolute', top: 6, right: 6, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(192,57,43,0.08)', border: 'none', borderRadius: 6, color: '#c0392b', cursor: 'pointer', fontSize: 12, padding: 0 };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f7f6f2', fontFamily: "'Outfit', sans-serif", color: '#1a1a2e' }}>
      <style>{printStyles}</style>

      {/* ── TOP BAR ── */}
      <div className="no-print flex items-center justify-between shrink-0 px-5 py-3 md:px-10 md:py-4" style={{ background: '#1a1a2e', color: '#fff' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/ideas')} className="p-2 rounded-lg transition-all" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <div className="flex items-center gap-2.5 ml-1 md:ml-2">
            <div className="w-6 h-6 md:w-7 md:h-7">
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-100deg)' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#c9a84c" strokeWidth="8" strokeDasharray="210 251" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-base md:text-xl" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>Ooma<span style={{ color: '#c9a84c' }}>Labs</span></div>
              <div className="hidden md:block" style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 1 }}>Quotation Tools</div>
            </div>
          </div>
        </div>

        {/* Mobile Toggle - Switch Views */}
        <div className="flex md:hidden items-center gap-1.5 p-1 bg-white/10 rounded-xl">
          <button onClick={() => setMobileView('editor')} className={`p-2 rounded-lg transition-all ${mobileView === 'editor' ? 'bg-[#c9a84c] text-[#1a1a2e]' : 'text-white'}`}>
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setMobileView('preview')} className={`p-2 rounded-lg transition-all ${mobileView === 'preview' ? 'bg-[#c9a84c] text-[#1a1a2e]' : 'text-white'}`}>
            <Eye className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-white bg-white/10 hover:bg-white/20" style={{ fontSize: 13, fontWeight: 600 }}>
            <HistoryIcon className="h-4 w-4 text-[#c9a84c]" />
            <span className="hidden md:inline">History</span>
          </button>
          <div className="hidden md:block" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase' }}>Internal Tool</div>
        </div>
      </div>

      {/* ── LAYOUT ── */}
      <div className="flex flex-col md:grid flex-1 min-h-0 relative" style={{ gridTemplateColumns: '400px 1fr' }}>

        {/* ── HISTORY DRAWER ── */}
        {showHistory && (
          <>
            <div onClick={() => setShowHistory(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
            <div className="fixed top-0 right-0 w-[400px] h-full bg-white shadow-2xl z-50 transform transition-transform animate-slide-left p-8">
              <div className="flex items-center justify-between mb-8 border-bottom pb-4" style={{ borderBottom: '1.5px solid #e2dfd6' }}>
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700 }}>Saved Quotations</h2>
                  <p style={{ fontSize: 11, color: '#8888aa', textTransform: 'uppercase', letterSpacing: 1 }}>Supabase Records</p>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col gap-4 overflow-y-auto h-[calc(100vh-180px)] pr-2">
                {loadingHistory ? (
                   <p className="text-center italic text-gray-400 py-10">Fetching records...</p>
                ) : history.length === 0 ? (
                  <div className="text-center py-20">
                    <HistoryIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <p style={{ fontSize: 14, color: '#8888aa' }}>No saved quotations found.</p>
                  </div>
                ) : history.map(q => (
                  <div key={q.id} className="group p-5 rounded-2xl border border-[#e2dfd6] hover:border-[#c9a84c] hover:bg-[#fdfcf9] transition-all cursor-pointer relative">
                    <div onClick={() => loadQuotation(q)}>
                      <h4 style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{q.project_name || 'Untitled Project'}</h4>
                      <div className="flex items-center gap-2 mt-2">
                         <Clock className="h-3 w-3 text-[#c9a84c]" />
                         <span style={{ fontSize: 11, fontWeight: 500, color: '#8888aa' }}>{new Date(q.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    {user?.role === 'admin' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteFromHistory(q.id); }} 
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 hover:text-[#c0392b] transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── LEFT FORM PANEL ── */}
        <div className={`no-print ${mobileView === 'editor' ? 'block' : 'hidden md:block'} overflow-y-auto w-full md:w-auto px-5 py-6 md:px-7 md:py-7`} style={{ background: '#fff', borderRight: '1px solid #e2dfd6' }}>

          {/* Quotation Identity Row */}
          <div style={{ marginBottom: 26 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>
              <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600 }}>Quotation Meta Row</div>
              <button onClick={addMetaField} style={{ ...addBtnStyle, marginTop: 0, padding: '4px 10px' }}>
                <Plus className="h-3 w-3" /> Add Field
              </button>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#8888aa', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Main Project Title</label>
                <input value={projectName} onChange={e => setProjectName(e.target.value)} style={{ width: '100%', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '10px 13px', color: '#1a1a2e', fontFamily: "'Outfit', sans-serif", fontSize: 13.5, outline: 'none' }} />
              </div>

              {metaFields.map((f, i) => (
                <div key={i} className="" style={{ position: 'relative', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '10px 32px 10px 12px' }}>
                  <input value={f.label} onChange={e => updateMetaField(i, 'label', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 11, fontWeight: 600, color: '#c9a84c', textTransform: 'uppercase', outline: 'none', marginBottom: 4 }} placeholder="LABEL" />
                  <input value={f.value} onChange={e => updateMetaField(i, 'value', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12.5, fontWeight: 700, color: '#1a1a2e', outline: 'none' }} placeholder="Value" />
                  <input value={f.subValue} onChange={e => updateMetaField(i, 'subValue', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 11, color: '#8888aa', outline: 'none', marginTop: 2 }} placeholder="Sub-value (Optional)" />
                  <button onClick={() => removeMetaField(i)} style={removeBtnStyle}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Services Selector */}
          <div style={{ marginBottom: 26 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>
              <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600 }}>Service Categories</div>
              <button
                onClick={() => {
                  const s = prompt('Enter new service name:');
                  if (s) setCustomServices([...customServices, s]);
                }}
                style={{ ...addBtnStyle, marginTop: 0, padding: '4px 10px' }}
              >
                <Plus className="h-3 w-3" /> Add Category
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {['Web Application', 'Mobile App', 'UI/UX Design', 'Cloud Architecture', 'Maintenance', 'E-commerce', ...customServices].map(s => (
                <button
                  key={s}
                  onClick={() => toggleService(s)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    background: selectedServices.includes(s) ? '#1a1a2e' : '#fdfcf9',
                    color: selectedServices.includes(s) ? '#fff' : '#1a1a2e',
                    border: '1.5px solid',
                    borderColor: selectedServices.includes(s) ? '#1a1a2e' : '#e2dfd6',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {serviceIcons[s] && <span style={{ fontSize: 14, marginRight: 4 }}>{serviceIcons[s]}</span>}
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Executive Summary */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>Executive Summary</div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#8888aa', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Executive Summary Goal</label>
              <textarea 
                value={executiveSummaryGoal} 
                onChange={e => setExecutiveSummaryGoal(e.target.value)} 
                placeholder="e.g., generate leads, build digital presence..."
                style={{ width: '100%', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '10px 13px', color: '#1a1a2e', fontFamily: "'Outfit', sans-serif", fontSize: 13, outline: 'none', minHeight: 60, resize: 'none' }} 
              />
            </div>
          </div>

          {/* Deliverables */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>Deliverables</div>
            <div className="flex flex-col gap-2">
              {deliverables.map((d, i) => (
                <div key={i} className="flex items-center gap-2" style={{ position: 'relative', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '8px 32px 8px 12px' }}>
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" style={{ color: '#2d7a5f' }} />
                  <input value={d} onChange={e => { const n = [...deliverables]; n[i] = e.target.value; setDeliverables(n); }} style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#1a1a2e', outline: 'none' }} />
                  <button onClick={() => removeDeliverable(i)} style={removeBtnStyle}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <button onClick={addDeliverable} style={addBtnStyle}><Plus className="h-3.5 w-3.5" /> Add Deliverable</button>
          </div>

          {/* Scope of Work */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>Scope of Work</div>
            <div className="flex flex-col gap-2">
              {scopes.map((scope, i) => (
                <div key={i} style={{ position: 'relative', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '10px 30px 10px 12px' }}>
                  <input value={scope.title} onChange={e => updateScope(i, 'title', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600, color: '#1a1a2e', outline: 'none', marginBottom: 4 }} />
                  <textarea value={scope.desc} onChange={e => updateScope(i, 'desc', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#3a3a5c', resize: 'none', outline: 'none', lineHeight: 1.6, minHeight: 44 }} />
                  <button onClick={() => removeScope(i)} style={removeBtnStyle}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <button onClick={addScope} style={addBtnStyle}><Plus className="h-3.5 w-3.5" /> Add Scope</button>
          </div>

          {/* Timeline */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>Project Timeline</div>
            <div className="grid grid-cols-2 gap-2">
              {phases.map((phase, i) => (
                <div key={i} style={{ position: 'relative', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#c9a84c', marginBottom: 6 }}>Phase {i + 1}</div>
                  <input value={phase.name} onChange={e => updatePhase(i, 'name', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#3a3a5c', outline: 'none', padding: 0, marginBottom: 4 }} />
                  <input value={phase.days} onChange={e => updatePhase(i, 'days', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#3a3a5c', outline: 'none', padding: 0, marginBottom: 4 }} />
                  <input value={phase.tasks} onChange={e => updatePhase(i, 'tasks', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#8888aa', outline: 'none', padding: 0 }} />
                  <button onClick={() => removePhase(i)} style={removeBtnStyle}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <button onClick={addPhase} style={addBtnStyle}><Plus className="h-3.5 w-3.5" /> Add Phase</button>
          </div>

          {/* Payment Milestones */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>Payment Milestones</div>
            <div className="flex flex-col gap-2">
              {payments.map((p, i) => (
                <div key={i} className="flex gap-2 items-center" style={{ position: 'relative', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '8px 32px 8px 12px' }}>
                  <input value={p.pct} onChange={e => updatePayment(i, 'pct', e.target.value)} style={{ width: 50, border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700, color: '#1a1a2e', outline: 'none' }} placeholder="%" />
                  <input value={p.label} onChange={e => updatePayment(i, 'label', e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600, color: '#1a1a2e', outline: 'none' }} placeholder="Label" />
                  <input value={p.trigger} onChange={e => updatePayment(i, 'trigger', e.target.value)} style={{ flex: 2, border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#3a3a5c', outline: 'none' }} placeholder="Trigger" />
                  <button onClick={() => removePayment(i)} style={removeBtnStyle}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <button onClick={addPayment} style={addBtnStyle}><Plus className="h-3.5 w-3.5" /> Add Milestone</button>
          </div>

          {/* Terms */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>Terms & Conditions</div>
            <div className="flex flex-col gap-2">
              {terms.map((t, i) => (
                <div key={i} className="flex items-start gap-2" style={{ position: 'relative', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '8px 32px 8px 12px' }}>
                  <span style={{ color: '#c9a84c', fontSize: 14, marginTop: 1, flexShrink: 0 }}>•</span>
                  <textarea value={t} onChange={e => { const n = [...terms]; n[i] = e.target.value; setTerms(n); }} style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#3a3a5c', outline: 'none', resize: 'none', minHeight: 32, lineHeight: 1.5 }} />
                  <button onClick={() => removeTerm(i)} style={removeBtnStyle}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <button onClick={addTerm} style={addBtnStyle}><Plus className="h-3.5 w-3.5" /> Add Term</button>
          </div>

          {/* Exclusions */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>Exclusions & Assumptions</div>
            <div className="flex flex-col gap-2">
              {exclusions.map((t, i) => (
                <div key={i} className="flex items-start gap-2" style={{ position: 'relative', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '8px 32px 8px 12px' }}>
                  <span style={{ color: '#c0392b', fontSize: 14, marginTop: 1, flexShrink: 0 }}>×</span>
                  <textarea value={t} onChange={e => { const n = [...exclusions]; n[i] = e.target.value; setExclusions(n); }} style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#3a3a5c', outline: 'none', resize: 'none', minHeight: 32, lineHeight: 1.5 }} />
                  <button onClick={() => removeExclusion(i)} style={removeBtnStyle}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <button onClick={addExclusion} style={addBtnStyle}><Plus className="h-3.5 w-3.5" /> Add Exclusion</button>
          </div>

          {/* Post-Launch Warranty */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>Post-Launch Warranty</div>
            <div className="flex items-start gap-2" style={{ background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '10px 13px' }}>
              <textarea value={warranty} onChange={e => setWarranty(e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#3a3a5c', outline: 'none', resize: 'none', minHeight: 40, lineHeight: 1.5 }} />
            </div>
          </div>

          {/* Next Steps */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>Next Steps / Call to Action</div>
            <div className="flex flex-col gap-2">
              {nextSteps.map((t, i) => (
                <div key={i} className="flex items-start gap-2" style={{ position: 'relative', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '8px 32px 8px 12px' }}>
                  <span style={{ color: '#2d7a5f', fontSize: 12, marginTop: 1, flexShrink: 0, fontWeight: 700 }}>{i + 1}.</span>
                  <textarea value={t} onChange={e => { const n = [...nextSteps]; n[i] = e.target.value; setNextSteps(n); }} style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 12, color: '#3a3a5c', outline: 'none', resize: 'none', minHeight: 32, lineHeight: 1.5 }} />
                  <button onClick={() => removeNextStep(i)} style={removeBtnStyle}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
            <button onClick={addNextStep} style={addBtnStyle}><Plus className="h-3.5 w-3.5" /> Add Step</button>
          </div>


          {/* Pricing & Investment */}
          <div style={{ marginBottom: 26 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>
              <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600 }}>Pricing & Items</div>
              <div className="flex items-center gap-2">
                <div className="flex" style={{ background: '#f5eed8', borderRadius: 8, padding: 2 }}>
                  <button onClick={() => setCurrency('USD')} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none', background: currency === 'USD' ? '#1a1a2e' : 'transparent', color: currency === 'USD' ? '#fff' : '#1a1a2e', cursor: 'pointer' }}>USD</button>
                  <button onClick={() => setCurrency('INR')} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: 'none', background: currency === 'INR' ? '#1a1a2e' : 'transparent', color: currency === 'INR' ? '#fff' : '#1a1a2e', cursor: 'pointer' }}>INR</button>
                </div>
                <button onClick={addCostItem} style={{ ...addBtnStyle, marginTop: 0, padding: '4px 10px' }}>
                  <Plus className="h-3 w-3" /> Add Item
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mb-4">
              {costItems.map((c, i) => (
                <div key={i} className="flex flex-col gap-2" style={{ position: 'relative', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 10, padding: '12px 32px 12px 12px' }}>
                  <input value={c.label} onChange={e => updateCostItem(i, 'label', e.target.value)} style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, color: '#1a1a2e', outline: 'none' }} placeholder="Item description" />
                  
                  <div className="flex gap-4 items-center">
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 9, color: '#8888aa', textTransform: 'uppercase', marginBottom: 2 }}>Quantity</label>
                      <input value={c.qty || '1'} onChange={e => updateCostItem(i, 'qty', e.target.value)} style={{ width: '100%', border: '1px solid #e2dfd6', background: '#fff', borderRadius: 4, padding: '4px 8px', fontSize: 12, outline: 'none' }} placeholder="1" />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: 'block', fontSize: 9, color: '#8888aa', textTransform: 'uppercase', marginBottom: 2 }}>Unit Price ({symbol})</label>
                      <input value={c.unitPrice || c.amount} onChange={e => updateCostItem(i, 'unitPrice', e.target.value)} style={{ width: '100%', border: '1px solid #e2dfd6', background: '#fff', borderRadius: 4, padding: '4px 8px', fontSize: 12, outline: 'none' }} placeholder="0" />
                    </div>
                    <div style={{ flex: 2, textAlign: 'right' }}>
                      <label style={{ display: 'block', fontSize: 9, color: '#8888aa', textTransform: 'uppercase', marginBottom: 2 }}>Line Total</label>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#2d7a5f' }}>
                        {symbol}{(parseFloat(String(c.qty) || '1') * (parseFloat(String(c.unitPrice || c.amount).replace(/,/g, '')) || 0)).toLocaleString(locale)}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeCostItem(i)} style={removeBtnStyle}><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>

            <div style={{ background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 10, padding: 16 }}>
              <div className="flex justify-between items-center mb-3">
                <label style={{ fontSize: 11, color: '#8888aa', fontWeight: 500, textTransform: 'uppercase' }}>Subtotal</label>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>{symbol}{subtotal.toLocaleString(locale)}</div>
              </div>
              
              <div className="flex justify-between items-center mb-3">
                <label style={{ fontSize: 11, color: '#8888aa', fontWeight: 500, textTransform: 'uppercase' }}>Discount %</label>
                <input value={discount} onChange={e => setDiscount(e.target.value)} style={{ width: 60, background: '#fff', border: '1px solid #e2dfd6', borderRadius: 6, padding: '4px 8px', color: '#c0392b', fontFamily: "'Outfit', sans-serif", fontSize: 13, textAlign: 'right', fontWeight: 600, outline: 'none' }} />
              </div>

              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px dashed #e2dfd6' }}>
                <label style={{ fontSize: 11, color: '#1a1a2e', fontWeight: 700, textTransform: 'uppercase' }}>Net Total</label>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#2d7a5f' }}>{symbol}{priceAfterDiscount.toLocaleString(locale)}</div>
              </div>

              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #e2dfd6' }}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={includeGST} onChange={e => setIncludeGST(e.target.checked)} style={{ cursor: 'pointer' }} />
                    <label style={{ fontSize: 11, color: '#8888aa', fontWeight: 500, textTransform: 'uppercase' }}>Include Tax (GST)</label>
                  </div>
                  {includeGST && (
                    <div className="flex items-center gap-1.5">
                      <input value={gstRate} onChange={e => setGstRate(e.target.value)} style={{ width: 44, background: '#fff', border: '1px solid #e2dfd6', borderRadius: 6, padding: '4px 6px', color: '#1a1a2e', fontFamily: "'Outfit', sans-serif", fontSize: 12, textAlign: 'right', outline: 'none' }} placeholder="18" />
                      <span style={{ fontSize: 11, color: '#8888aa' }}>%</span>
                    </div>
                  )}
                </div>
                {includeGST && (
                  <div className="flex justify-between items-center pt-2">
                    <label style={{ fontSize: 11, color: '#1a1a2e', fontWeight: 700, textTransform: 'uppercase' }}>Total + Tax</label>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#2d7a5f' }}>{symbol}{totalInvestment.toLocaleString(locale)}</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: 0.8, color: '#8888aa', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Validity (Days)</label>
              <input value={validity} onChange={e => setValidity(e.target.value)} style={{ width: '100%', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '10px 13px', color: '#1a1a2e', fontFamily: "'Outfit', sans-serif", fontSize: 13.5, outline: 'none' }} />
            </div>
          </div>

          {/* Company / Footer Details */}
          <div style={{ marginBottom: 26 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#8888aa', fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e2dfd6' }}>Company Details</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: 0.8, color: '#8888aa', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Company Name</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} style={{ width: '100%', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '10px 13px', color: '#1a1a2e', fontFamily: "'Outfit', sans-serif", fontSize: 13.5, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: 0.8, color: '#8888aa', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Address</label>
              <input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} style={{ width: '100%', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '10px 13px', color: '#1a1a2e', fontFamily: "'Outfit', sans-serif", fontSize: 13.5, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: 0.8, color: '#8888aa', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Contact Info</label>
              <input value={companyContact} onChange={e => setCompanyContact(e.target.value)} style={{ width: '100%', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '10px 13px', color: '#1a1a2e', fontFamily: "'Outfit', sans-serif", fontSize: 13.5, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: 0.8, color: '#8888aa', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Signature Name</label>
              <input value={signatureName} onChange={e => setSignatureName(e.target.value)} style={{ width: '100%', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '10px 13px', color: '#1a1a2e', fontFamily: "'Outfit', sans-serif", fontSize: 13.5, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: 0.8, color: '#8888aa', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>Signature Title</label>
              <input value={signatureTitle} onChange={e => setSignatureTitle(e.target.value)} style={{ width: '100%', background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '10px 13px', color: '#1a1a2e', fontFamily: "'Outfit', sans-serif", fontSize: 13.5, outline: 'none' }} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5" style={{ marginTop: 6 }}>
            <button onClick={() => setGenerated(true)} style={{ flex: 1, padding: 13, background: '#1a1a2e', border: 'none', borderRadius: 10, color: '#fff', fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer', letterSpacing: 0.3 }}>
              Generate Quotation
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              style={{ 
                flex: 1, 
                padding: 13, 
                background: saveStatus?.includes('Error') ? '#c0392b' : (saveStatus ? '#2d7a5f' : '#c9a84c'), 
                border: 'none', 
                borderRadius: 10, 
                color: '#fff', 
                fontFamily: "'Outfit', sans-serif", 
                fontWeight: 600, 
                fontSize: 14, 
                cursor: saving ? 'wait' : 'pointer', 
                transition: 'all 0.2s',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saveStatus || (saving ? 'Saving...' : 'Save to Supabase')}
            </button>
          </div>
        </div>

        {/* ── RIGHT PREVIEW PANEL ── */}
        <div className={`print-panel-parent ${mobileView === 'preview' ? 'block' : 'hidden md:block'} overflow-y-auto overflow-x-auto flex-1 px-4 py-8 md:px-10 md:py-12`} style={{ background: '#f7f6f2' }}>
          
          <div className="no-print mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700 }}>Live Preview</h2>
              <p style={{ fontSize: 12, color: '#8888aa', marginTop: 4 }}>How your quotation looks to the client</p>
            </div>
            <div className="flex gap-2.5 w-full md:w-auto">
              <button onClick={handleCopy} className="flex-1 md:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold transition-all shadow-sm" style={{ background: '#fff', border: '1.5px solid #e2dfd6', color: '#1a1a2e', fontSize: 14 }}>
                {copied ? <Check className="h-4 w-4 text-[#2d7a5f]" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Share Link'}
              </button>
              <button onClick={() => window.print()} className="flex-1 md:flex-initial flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold transition-all text-white shadow-lg" style={{ background: '#1a1a2e', fontSize: 14 }}>
                <Download className="h-4 w-4" /> Export PDF
              </button>
            </div>
          </div>
          {generated ? (
            <div className="fade-in print-area" style={{ 
              maxWidth: 740, 
              margin: '0 auto', 
              background: '#fff', 
              border: '1px solid #e2dfd6', 
              boxShadow: '0 4px 40px rgba(0,0,0,0.07)',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}>

              {/* Doc Header */}
              <div style={{ textAlign: 'center', padding: '40px 48px 30px', borderBottom: '3px double #1a1a2e' }}>
                <div className="flex items-center justify-center gap-4" style={{ marginBottom: 4 }}>
                  {/* SVG Open Ring Logo - Precision gap and zero clipping */}
                  <div style={{ width: 46, height: 46 }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-100deg)' }}>
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#c9a84c" strokeWidth="7" strokeDasharray="230 263.8" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: '#1a1a2e', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    Ooma <span style={{ color: '#c9a84c' }}>Labs</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#8888aa', marginTop: 10, lineHeight: 1.8, fontWeight: 500 }}>
                  {companyAddress}<br />{companyContact}
                </p>
              </div>

              {/* Title Bar */}
              <div className="print-no-break" style={{ background: '#1a1a2e', color: '#fff', textAlign: 'center', padding: '14px 48px', fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }}>
                PROPOSAL & QUOTATION
              </div>

              {/* Doc Body */}
              <div style={{ padding: '40px 48px' }}>
                
                {/* Project Header Row */}
                <div className="print-no-break" style={{ borderBottom: '1.5px solid #1a1a2e', paddingBottom: 24, marginBottom: 32 }}>
                  <label style={{ fontSize: 10, color: '#8888aa', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Project</label>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>{projectName}</p>
                </div>


                {/* Meta Row */}
                {/* Dynamic Meta Rows */}
                <div className="flex flex-wrap gap-x-8 gap-y-6 justify-between items-start" style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #e2dfd6' }}>
                  {metaFields.map((f, i) => (
                    <div key={i} style={{ minWidth: 120 }}>
                      <label style={{ fontSize: 10, color: '#8888aa', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>{f.label}</label>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{f.value}</p>
                      {f.subValue && <small style={{ fontSize: 12, color: '#8888aa', display: 'block' }}>{f.subValue}</small>}
                    </div>
                  ))}
                </div>

                {/* Project Name - Centered Separately */}
                <div style={{ textAlign: 'center', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #e2dfd6' }}>
                  <label style={{ fontSize: 10, color: '#8888aa', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Project</label>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#1a1a2e' }}>{projectName}</p>
                </div>

                {/* Executive Summary Section */}
                <div className="print-no-break" style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #e2dfd6' }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>Executive Summary</h3>
                  <div style={{ fontSize: 13, color: '#3a3a5c', lineHeight: 1.7 }}>
                    <p style={{ marginBottom: 12 }}>
                      We understand that your goal is to <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{executiveSummaryGoal}</span>.
                    </p>
                    <p style={{ marginBottom: 12 }}>
                      {companyName} proposes a complete digital solution including a web application, mobile app, and backend system to achieve these objectives efficiently.
                    </p>
                    <p>
                      Our approach focuses on scalability, performance, and user-friendly design to ensure long-term value and growth.
                    </p>
                  </div>
                </div>

                {/* Deliverables */}
                <div className="print-no-break" style={{ marginBottom: 28 }}>
                  <div className="flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #1a1a2e' }}>
                    📋 Deliverables
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {deliverables.map((d, i) => (
                      <div key={i} className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 500, padding: '8px 12px', background: '#fdfcf9', border: '1px solid #e2dfd6', borderRadius: 6 }}>
                        <CheckCircle className="h-4 w-4 shrink-0" style={{ color: '#2d7a5f' }} /> {d}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scope of Work */}
                <div className="print-no-break" style={{ marginBottom: 28 }}>
                  <div className="flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #1a1a2e' }}>
                    🔍 Scope of Work — {projectName}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {scopes.map((s, i) => (
                      <div key={i} style={{ padding: '14px 16px', borderLeft: '3px solid #c9a84c', background: '#fdfcf9', borderRadius: '0 8px 8px 0' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{s.title}</div>
                        <div style={{ fontSize: 12.5, color: '#3a3a5c', lineHeight: 1.7 }}>{s.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exclusions */}
                <div className="print-no-break" style={{ marginBottom: 28 }}>
                  <div className="flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#c0392b', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #1a1a2e' }}>
                    🚫 Exclusions & Assumptions
                  </div>
                  <ul style={{ listStyle: 'none', marginBottom: 20 }}>
                    {exclusions.map((e, i) => (
                      <li key={i} className="flex gap-2.5" style={{ padding: '6px 0', borderBottom: '1px dashed #e2dfd6', fontSize: 13, color: '#3a3a5c', lineHeight: 1.6 }}>
                        <span style={{ color: '#c0392b', fontSize: 16, flexShrink: 0, marginTop: -1 }}>×</span>{e}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Timeline */}
                <div className="print-no-break" style={{ marginBottom: 28 }}>
                  <div className="flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #1a1a2e' }}>
                    📅 Project Timeline
                  </div>
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${Math.min(phases.length, 3)}, 1fr)` }}>
                    {phases.map((p, i) => (
                      <div key={i} style={{ border: '1px solid #e2dfd6', borderRadius: 8, padding: 14, textAlign: 'center', background: '#fdfcf9' }}>
                        <div className="flex items-center justify-center" style={{ width: 30, height: 30, background: '#1a1a2e', color: '#fff', borderRadius: '50%', fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, margin: '0 auto 8px' }}>{i + 1}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', marginBottom: 3 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 600, marginBottom: 5 }}>{p.days}</div>
                        <div style={{ fontSize: 11, color: '#8888aa', lineHeight: 1.6 }}>{p.tasks}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Summary */}
                <div className="print-no-break" style={{ marginBottom: 28 }}>
                  <div className="flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #1a1a2e' }}>
                    💰 Price Summary
                  </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #1a1a2e' }}>
                      <th style={{ padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', color: '#8888aa', textAlign: 'left' }}>Item Description</th>
                      <th style={{ padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', color: '#8888aa', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', color: '#8888aa', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ padding: '10px 14px', fontSize: 11, textTransform: 'uppercase', color: '#8888aa', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costItems.map((c, i) => {
                      const qty = parseFloat(String(c.qty) || '1');
                      const unitPrice = parseFloat(String(c.unitPrice || c.amount).replace(/,/g, '')) || 0;
                      return (
                        <tr key={i}>
                          <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #e2dfd6' }}>{c.label}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #e2dfd6', textAlign: 'center' }}>{qty}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #e2dfd6', textAlign: 'right' }}>{symbol}{unitPrice.toLocaleString(locale)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, borderBottom: '1px solid #e2dfd6', textAlign: 'right', fontWeight: 700, color: '#1a1a2e' }}>{symbol}{(qty * unitPrice).toLocaleString(locale)}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td style={{ padding: '10px 14px', fontSize: 13.5, borderBottom: '1px solid #e2dfd6', color: '#8888aa', textDecoration: 'line-through' }}>Subtotal</td>
                      <td style={{ padding: '10px 14px', fontSize: 13.5, borderBottom: '1px solid #e2dfd6', textAlign: 'right', fontWeight: 600, color: '#8888aa', textDecoration: 'line-through' }}>{symbol}{subtotal.toLocaleString(locale)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 14px', fontSize: 13.5, borderBottom: '1px solid #e2dfd6' }}>Discount ({discount}%)</td>
                      <td style={{ padding: '10px 14px', fontSize: 13.5, borderBottom: '1px solid #e2dfd6', textAlign: 'right', fontWeight: 600, color: '#c0392b' }}>
                        -{symbol}{Math.round(subtotal * disc / 100).toLocaleString(locale)}
                      </td>
                    </tr>
                    {includeGST && (
                      <tr>
                        <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid #e2dfd6', color: '#8888aa' }}>GST ({gstRate}%)</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, borderBottom: '1px solid #e2dfd6', textAlign: 'right', color: '#8888aa' }}>{symbol}{computedGSTStr}</td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ padding: '10px 14px', fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700 }}>Total Investment</td>
                      <td style={{ padding: '10px 14px', fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, textAlign: 'right', color: '#2d7a5f' }}>{symbol}{totalInvestment.toLocaleString(locale)}</td>
                    </tr>
                  </tbody>
                </table>
                </div>

                {/* Payment Milestones */}
                <div className="print-no-break" style={{ marginBottom: 28 }}>
                  <div className="flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #1a1a2e' }}>
                    🏦 Payment Milestones
                  </div>
                  <div className="flex gap-3">
                    {payments.map((p, i) => (
                      <div key={i} className="flex-1 text-center" style={{ padding: '16px 12px', border: '1px solid #e2dfd6', borderRadius: 8, background: '#fdfcf9' }}>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: '#1a1a2e' }}>{p.pct}</div>
                        <div style={{ fontSize: 11, color: '#8888aa', margin: '4px 0', textTransform: 'uppercase', letterSpacing: 1 }}>{p.label}</div>
                        <div style={{ fontSize: 12, color: '#3a3a5c', fontWeight: 500 }}>{p.trigger}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, marginTop: 28, paddingBottom: 8, borderBottom: '2px solid #1a1a2e' }}>
                  📜 Terms & Conditions
                </div>
                <ul style={{ listStyle: 'none', marginBottom: 20 }}>
                  {terms.map((t, i) => (
                    <li key={i} className="flex gap-2.5" style={{ padding: '8px 0', borderBottom: '1px solid #e2dfd6', fontSize: 13, color: '#3a3a5c', lineHeight: 1.6 }}>
                      <span style={{ color: '#c9a84c', fontSize: 16, flexShrink: 0, marginTop: -1 }}>•</span>{t}
                    </li>
                  ))}
                </ul>

                {/* Warranty */}
                {warranty && (
                  <div className="print-no-break" style={{ marginBottom: 20, background: '#fdfcf9', border: '1.5px solid #e2dfd6', borderRadius: 8, padding: '16px 20px' }}>
                    <strong style={{ display: 'block', color: '#1a1a2e', marginBottom: 8, fontSize: 14 }}>Post-Launch Warranty</strong>
                    <div style={{ fontSize: 13, color: '#3a3a5c', lineHeight: 1.6 }}>{warranty}</div>
                  </div>
                )}

                {/* Next Steps */}
                <div className="print-no-break" style={{ marginBottom: 28 }}>
                  <div className="flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 14, marginTop: 28, paddingBottom: 8, borderBottom: '2px solid #1a1a2e' }}>
                    🚀 Next Steps
                  </div>
                  <ul style={{ listStyle: 'none', marginBottom: 20 }}>
                    {nextSteps.map((step, i) => (
                      <li key={i} className="flex gap-2.5" style={{ padding: '8px 0', fontSize: 13, color: '#3a3a5c', lineHeight: 1.6 }}>
                        <span style={{ background: '#2d7a5f', color: '#fff', fontSize: 11, fontWeight: 700, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Note */}
                <div style={{ background: '#f5eed8', border: '1px solid #c9a84c', borderRadius: 8, padding: '14px 18px', fontSize: 13, color: '#3a3a5c', lineHeight: 1.7, marginTop: 8 }}>
                  <strong style={{ color: '#1a1a2e' }}>Note:</strong> This quotation is valid for {validity} days from the date of issue. Upon approval, a formal contract will be generated.
                </div>
              </div>

              {/* Footer / Sign-off Block */}
              <div className="print-no-break flex justify-between items-end gap-10" style={{ padding: '34px 48px', borderTop: '3px double #1a1a2e', background: '#fdfcf9' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#8888aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 40 }}>Issued By</div>
                  <div style={{ borderBottom: '1px solid #e2dfd6', width: '100%', marginBottom: 12 }}></div>
                  <strong style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: '#1a1a2e', display: 'block', marginBottom: 3 }}>{signatureName}</strong>
                  <div style={{ fontSize: 13, color: '#3a3a5c' }}>{signatureTitle}</div>
                  <div style={{ fontSize: 12, color: '#8888aa', marginTop: 10 }}>{companyName}</div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#8888aa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 40 }}>Accepted By (Client)</div>
                  <div style={{ borderBottom: '1px solid #e2dfd6', width: '100%', marginBottom: 12 }}></div>
                  <div style={{ fontSize: 13, color: '#3a3a5c', marginBottom: 3 }}>Name: ____________________</div>
                  <div style={{ fontSize: 13, color: '#3a3a5c', marginBottom: 3 }}>Title: _____________________</div>
                  <div style={{ fontSize: 13, color: '#3a3a5c', marginTop: 10 }}>Date: _____________________</div>
                </div>
              </div>

              {/* Validity Strip */}
              <div style={{ background: '#1a1a2e', color: '#fff', textAlign: 'center', padding: 10, fontSize: 12.5, letterSpacing: 0.5 }}>
                Valid for <span style={{ color: '#c9a84c', fontWeight: 600 }}>{validity} Days</span> from date of issue
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 500, gap: 14, color: '#8888aa' }}>
              <div style={{ fontSize: 56, opacity: 0.25 }}>📄</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: '#8888aa' }}>No Quotation Generated</h3>
              <p style={{ fontSize: 13, maxWidth: 300, lineHeight: 1.7 }}>Fill in the details on the left panel and click "Generate Quotation" to preview your document.</p>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 999, background: '#2d7a5f', color: '#fff', padding: '12px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 6px 24px rgba(0,0,0,0.15)', transform: copied ? 'translateY(0)' : 'translateY(80px)', opacity: copied ? 1 : 0, transition: 'all 0.3s', pointerEvents: 'none' }}>
        ✓ Quotation copied to clipboard
      </div>

      <style>{`
        .fade-in { animation: fadeUp 0.35s ease; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
      `}</style>
    </div>
  );
}
