import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Search, 
  CreditCard, 
  Clock, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  Info, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

/* ================= GLOBAL CONFIG ================= */
const GLOBAL = {
  currency: "INR",
  paymentDefault: "50% advance · 50% on delivery",
  support: "7 days post-delivery support included",
  revisions: "2 revision rounds included",
  delayNote: "Timeline may extend if client delays content or approvals",
};

/* ================= SERVICES ================= */
const SERVICES = [
  {
    category: "E-Commerce",
    emoji: "🛒",
    color: "#00e5a0",
    stacks: [
      {
        id: "ec1",
        slug: "shopify-store",
        name: "Shopify Store",
        displayName: "Launch Your Online Store Fast",
        type: "No-Code",
        level: "Beginner",
        platform: "Shopify",
        badge: "Most Popular",
        timeline: "1–2 weeks",
        bestFor: "Small businesses & quick launches",
        roi: "Start selling online within days",
        compare: "Faster than building from scratch",
        price: { amount: 15000, display: "₹15,000" },
        features: [
          "Custom Shopify theme setup",
          "Product catalog & collections",
          "Payment integration (Razorpay / Stripe)",
          "Shipping & tax configuration",
          "Mobile-responsive storefront",
          "Basic SEO setup",
        ],
        notIncluded: [
          "Product photography",
          "Copywriting",
          "Logo design",
          "Bulk product upload (>20)",
        ],
        thirdParty: [
          { name: "Shopify Basic Plan", cost: "₹1,994/mo" },
          { name: "Domain Name", cost: "₹799/yr" },
          { name: "Payment Gateway", cost: "2% (domestic) · 3% (intl)" },
        ],
        payment: GLOBAL.paymentDefault,
        support: GLOBAL.support,
        revisions: GLOBAL.revisions,
        note: "Ideal for quick, reliable e-commerce launches",
      },
      {
        id: "ec2",
        slug: "woocommerce-store",
        name: "WooCommerce Store",
        displayName: "Flexible Online Store (Full Control)",
        type: "Low-Code",
        level: "Intermediate",
        platform: "WordPress + WooCommerce",
        badge: "Best Value",
        timeline: "2–3 weeks",
        bestFor: "Businesses wanting full control",
        roi: "Lower long-term cost vs Shopify",
        compare: "More flexible than SaaS platforms",
        price: { amount: 25000, display: "₹25,000" },
        features: [
          "WordPress + WooCommerce setup",
          "Custom design (Elementor)",
          "Payment integration",
          "Coupons & discounts",
          "Inventory management",
          "SEO plugin setup",
        ],
        notIncluded: [
          "Product uploads",
          "Copywriting",
          "Brand design",
        ],
        thirdParty: [
          { name: "Hosting", cost: "₹199/mo" },
          { name: "Domain", cost: "₹799/yr" },
          { name: "Payment Gateway", cost: "2%–3%" },
        ],
        payment: GLOBAL.paymentDefault,
        support: GLOBAL.support,
        revisions: GLOBAL.revisions,
      },
      {
        id: "ec3",
        slug: "custom-ecommerce",
        name: "Custom E-Commerce",
        displayName: "Scalable Custom E-Commerce Platform",
        type: "Full-Stack",
        level: "Advanced",
        platform: "Next.js + Node.js",
        badge: "Premium",
        timeline: "6–10 weeks",
        bestFor: "Scaling startups & serious brands",
        roi: "Fully owned system, no platform lock-in",
        compare: "More powerful than Shopify/WooCommerce",
        price: { amount: 120000, display: "₹1,20,000" },
        features: [
          "Custom storefront (Next.js)",
          "Admin dashboard",
          "Advanced search & filters",
          "Auth system",
          "Order management",
          "Cloud storage integration",
        ],
        notIncluded: [
          "Content writing",
          "Brand identity",
        ],
        thirdParty: [
          { name: "Hosting (Vercel)", cost: "₹1,600/mo" },
          { name: "Database", cost: "₹800/mo" },
          { name: "Storage", cost: "Pay-as-you-go" },
        ],
        payment: "40% advance · 30% mid · 30% delivery",
        support: GLOBAL.support,
        revisions: GLOBAL.revisions,
        note: "Built for long-term scale and ownership",
      },
    ],
  },
  {
    category: "Business Website",
    emoji: "🌐",
    color: "#4f9cf9",
    stacks: [
      {
        id: "bw1",
        slug: "wix-website",
        name: "Wix Website",
        displayName: "Quick Business Website",
        type: "No-Code",
        level: "Beginner",
        badge: "Fast Launch",
        platform: "Wix",
        timeline: "3–5 days",
        bestFor: "Local businesses",
        roi: "Get online presence instantly",
        price: { amount: 8000, display: "₹8,000" },
        features: [
          "Up to 10 pages",
          "Contact forms",
          "WhatsApp integration",
          "Basic SEO",
        ],
        notIncluded: [
          "E-commerce",
          "Copywriting",
        ],
        thirdParty: [
          { name: "Wix Plan", cost: "₹1,300/mo" },
        ],
        payment: "100% advance",
        support: GLOBAL.support,
      },
      {
        id: "bw2",
        slug: "wordpress-website",
        name: "WordPress Website",
        displayName: "Professional Business Website",
        type: "Low-Code",
        level: "Intermediate",
        badge: "Most Flexible",
        platform: "WordPress",
        timeline: "1–2 weeks",
        bestFor: "Growing businesses",
        roi: "Better SEO + long-term control",
        price: { amount: 18000, display: "₹18,000" },
        features: [
          "Custom pages",
          "Blog setup",
          "Lead capture forms",
          "SEO optimization",
        ],
        thirdParty: [
          { name: "Hosting", cost: "₹199/mo" },
          { name: "Domain", cost: "₹799/yr" },
        ],
        payment: GLOBAL.paymentDefault,
        support: GLOBAL.support,
      },
      {
        id: "bw3",
        slug: "high-performance-website",
        name: "High Performance Website",
        displayName: "Ultra Fast Premium Website",
        type: "Full-Stack",
        level: "Advanced",
        badge: "High Performance",
        platform: "Next.js / Custom",
        timeline: "3–4 weeks",
        bestFor: "Serious brands",
        roi: "Faster site = more conversions",
        price: { amount: 50000, display: "₹50,000" },
        features: [
          "Custom UI",
          "SEO optimized",
          "CMS integration",
          "High performance (90+ score)",
        ],
        thirdParty: [
          { name: "Hosting", cost: "₹0–₹1,600/mo" },
          { name: "CMS", cost: "₹0–₹1,700/mo" },
        ],
        payment: GLOBAL.paymentDefault,
        support: GLOBAL.support,
      },
    ],
  },
];

export default function ServiceMenuCardPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(SERVICES[0].category);

  const filteredServices = SERVICES.find(c => c.category === activeCategory)?.stacks.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.displayName.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[5%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full"></div>
      </div>

      <header className="sticky top-0 z-[60] bg-[#0c0c0e]/90 backdrop-blur-2xl border-b border-white/5 h-16 flex items-center justify-between px-6 transition-all">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/ideas')} 
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-gray-400 hover:text-white transition-all active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[14px] font-black uppercase text-white tracking-tight flex items-center gap-2">
              Service <span className="text-emerald-400">Menu Card</span>
            </h1>
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">OomaLabs Offerings</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex relative group">
             <input 
               type="text" 
               placeholder="Search offerings..."
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="w-full bg-[#11111d]/50 border border-white/5 rounded-2xl py-2.5 md:py-3.5 pl-10 pr-4 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 transition-all placeholder:text-gray-600"
             />
             <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-400 transition-colors" />
          </div>
          <button className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">
            Share Menu
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto py-12 px-6">
        {/* Title Section */}
        <div className="mb-12 text-center md:text-left">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">
             <Sparkles size={12} /> Standard Pricing Index
           </div>
           <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-4 leading-none">
             Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Growth Stack</span>.
           </h2>
           <p className="text-gray-400 text-lg max-w-2xl font-medium"> Transparent pricing, fixed timelines, and high-performance delivery. All-in-one solutions for your business journey. </p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2 no-scrollbar">
           {SERVICES.map(cat => (
             <button
               key={cat.category}
               onClick={() => setActiveCategory(cat.category)}
               className={`shrink-0 flex items-center gap-3 px-6 py-4 rounded-[24px] font-black uppercase tracking-widest text-[11px] transition-all border ${
                 activeCategory === cat.category 
                 ? 'bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.1)]' 
                 : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
               }`}
             >
                <span className="text-xl">{cat.emoji}</span>
                {cat.category}
             </button>
           ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {filteredServices.map((service) => (
             <div 
               key={service.id}
               className="group relative flex flex-col bg-[#0f0f12] border border-white/5 rounded-[40px] overflow-hidden hover:border-emerald-500/30 transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
             >
                {/* Visual Accent */}
                <div 
                  className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity"
                  style={{ background: SERVICES.find(c => c.category === activeCategory)?.color || '#10b981' }}
                />

                <div className="p-8 flex flex-col flex-1">
                   {/* Card Header */}
                   <div className="flex justify-between items-start mb-6">
                      <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        {service.type} · {service.level}
                      </div>
                      {service.badge && (
                        <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                          {service.badge}
                        </div>
                      )}
                   </div>

                   <h3 className="text-2xl font-black text-white mb-2 group-hover:text-emerald-400 transition-colors">
                     {service.name}
                   </h3>
                   <p className="text-gray-500 text-sm font-medium line-clamp-2 mb-6">
                     {service.displayName}
                   </p>

                   {/* Pricing Row */}
                   <div className="flex items-end gap-3 mb-8">
                      <div className="text-4xl font-black text-white">{service.price.display}</div>
                      <div className="text-gray-600 text-[10px] font-black uppercase tracking-widest mb-1">Base Package</div>
                   </div>

                   {/* Stats Grid */}
                   <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 group-hover:bg-white/[0.05] transition-all">
                         <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Clock size={12} className="text-emerald-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Timeline</span>
                         </div>
                         <div className="text-[13px] font-bold text-white">{service.timeline}</div>
                      </div>
                      <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 group-hover:bg-white/[0.05] transition-all">
                         <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Zap size={12} className="text-cyan-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Platform</span>
                         </div>
                         <div className="text-[13px] font-bold text-white">{service.platform || 'Custom'}</div>
                      </div>
                   </div>

                   {/* Features */}
                   <div className="space-y-3 mb-8 flex-1">
                      <div className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4">Included Features</div>
                      {service.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                           <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                           <span className="text-[13px] font-medium text-gray-300">{f}</span>
                        </div>
                      ))}
                   </div>

                   {/* Third Party Section */}
                   {service.thirdParty && (
                     <div className="mb-8 p-5 rounded-[24px] bg-white/[0.03] border border-white/5">
                        <div className="flex items-center gap-2 mb-4">
                           <CreditCard size={14} className="text-gray-400" />
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Recurring Costs</span>
                        </div>
                        <div className="space-y-2">
                           {service.thirdParty.map((p, i) => (
                             <div key={i} className="flex justify-between items-center text-[11px] font-bold">
                                <span className="text-gray-500">{p.name}</span>
                                <span className="text-white">{p.cost}</span>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}

                   {/* CTA */}
                   <button className="w-full py-4 bg-white/5 hover:bg-white text-gray-400 hover:text-black rounded-2xl font-black uppercase tracking-widest text-[11px] border border-white/5 hover:border-white transition-all group/btn flex items-center justify-center gap-2">
                      Request Consultation <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                   </button>
                </div>
             </div>
           ))}
        </div>

        {/* Global Terms Info */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="p-8 rounded-[40px] bg-[#1a1a2e]/30 border border-white/5 backdrop-blur-sm">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                 <ShieldCheck className="text-emerald-400" size={24} />
              </div>
              <h4 className="text-lg font-black text-white uppercase tracking-tight mb-2">Quality Assurance</h4>
              <p className="text-sm text-gray-500 leading-relaxed font-medium"> {GLOBAL.support} and {GLOBAL.revisions}. We ensure your launch is smooth and error-free. </p>
           </div>
           <div className="p-8 rounded-[40px] bg-[#1a1a2e]/30 border border-white/5 backdrop-blur-sm">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6">
                 <CreditCard className="text-cyan-400" size={24} />
              </div>
              <h4 className="text-lg font-black text-white uppercase tracking-tight mb-2">Flexible Payments</h4>
              <p className="text-sm text-gray-500 leading-relaxed font-medium"> Standard Payment: {GLOBAL.paymentDefault}. Transparent financial roadmap for every project. </p>
           </div>
           <div className="p-8 rounded-[40px] bg-[#1a1a2e]/30 border border-white/5 backdrop-blur-sm">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                 <Info className="text-blue-400" size={24} />
              </div>
              <h4 className="text-lg font-black text-white uppercase tracking-tight mb-2">Technical Insight</h4>
              <p className="text-sm text-gray-500 leading-relaxed font-medium"> {GLOBAL.delayNote}. We prioritize communication to maintain peak performance velocity. </p>
           </div>
        </div>

        {/* Bottom Contact */}
        <div className="mt-20 p-10 md:p-16 rounded-[60px] bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 border border-white/10 text-center relative overflow-hidden group">
           <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-6">Found Your Perfect <span className="text-emerald-400">Match</span>?</h3>
           <p className="text-gray-400 max-w-xl mx-auto mb-10 text-lg font-medium">Let's talk about implementation, integrations, and your custom requirements. The OomaLabs team is ready to scale with you.</p>
           <button onClick={() => navigate('/meetings')} className="px-10 py-5 bg-white text-black rounded-[24px] font-black uppercase tracking-widest text-[12px] shadow-2xl hover:scale-105 transition-all">
             Schedule Strategy Session
           </button>
        </div>
      </main>

      <footer className="py-12 border-t border-white/5 text-center">
         <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.5em]">OomaLabs Professional Services · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
