/**
 * OomaLabs Quotation Generator - Modular Data & Asset Definitions
 * This module can be shared, imported, or ported to any web project.
 */

export interface ScopeItem {
  title: string;
  desc: string;
}

export interface Phase {
  name: string;
  days: string;
  tasks: string;
}

export interface PaymentMilestone {
  pct: string;
  label: string;
  trigger: string;
}

export interface CostItem {
  label: string;
  amount: string;
  qty?: string;
  unitPrice?: string;
}

export interface MetaField {
  label: string;
  value: string;
  subValue?: string;
}

export interface QuotationData {
  projectName: string;
  companyName: string;
  companyAddress: string;
  companyContact: string;
  signatureName: string;
  signatureTitle: string;
  executiveSummaryGoal: string;
  selectedServices: string[];
  customServices: string[];
  metaFields: MetaField[];
  scopes: ScopeItem[];
  phases: Phase[];
  deliverables: string[];
  exclusions: string[];
  warranty: string;
  nextSteps: string[];
  costItems: CostItem[];
  payments: PaymentMilestone[];
  terms: string[];
  currency: 'USD' | 'INR';
  discount: string;
  includeGST: boolean;
  gstRate: string;
}

export const serviceScopeMap: Record<string, ScopeItem[]> = {
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

export const servicePhaseMap: Record<string, Phase[]> = {
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

export const serviceDeliverables: Record<string, string[]> = {
  'Web Application': ['Responsive Web App', 'Admin Dashboard', 'REST API', 'Database Schema'],
  'Mobile App': ['iOS App', 'Android App', 'Push Notifications', 'App Store Listing'],
  'UI/UX Design': ['Wireframes', 'UI Mockups', 'Design System', 'Prototype'],
  'Cloud Architecture': ['Architecture Diagram', 'CI/CD Pipeline', 'Monitoring Setup', 'Documentation'],
  'Maintenance': ['Monthly Reports', 'Bug Fixes', 'Security Patches', 'Performance Audit'],
  'E-commerce': ['Product Catalog', 'Shopping Cart', 'Payment Gateway', 'Order Management'],
};

export const servicePriceMap: Record<string, number> = {
  'Web Application': 15000,
  'Mobile App': 20000,
  'UI/UX Design': 8000,
  'Cloud Architecture': 12000,
  'Maintenance': 5000,
  'E-commerce': 18000,
};

export const serviceIcons: Record<string, string> = {
  'Web Application': '🌐',
  'Mobile App': '📱',
  'UI/UX Design': '🎨',
  'Cloud Architecture': '☁️',
  'Maintenance': '🔧',
  'E-commerce': '🛒',
};

export const serviceExclusionsMap: Record<string, string[]> = {
  'Web Application': [
    'Content writing or copywriting services.',
    'Purchasing of third-party domain or hosting.',
    'Data migration from legacy systems.'
  ],
  'Mobile App': [
    'App store developer account fees.',
    'Creation of promotional videos or marketing material.',
    'Backend server hosting fees.'
  ],
  'UI/UX Design': [
    'Implementation or coding of the designs.',
    'Purchasing of premium stock photography or fonts.',
    'Brand logo design (unless specified).'
  ],
  'Cloud Architecture': [
    'Actual cloud provider monthly usage fees (AWS/GCP/Azure invoices).',
    'Application code refactoring to fit cloud native patterns.',
    'Procurement of third-party software licenses.'
  ],
  'Maintenance': [
    'Development of entirely new features or large modules.',
    'On-site support or hardware maintenance.',
    'Fixes for code modified by unauthorized third parties.'
  ],
  'E-commerce': [
    'Product data entry or catalog population.',
    'Payment gateway merchant account setup fees.',
    'Professional product photography.'
  ],
};

export const serviceWarrantyMap: Record<string, string> = {
  'Web Application': '30-day post-launch warranty for fixing reproducible bugs within the original scope. New features post-launch are billed separately.',
  'Mobile App': '45-day post-launch warranty for fixing reproducible bugs and crash resolution on supported OS versions.',
  'UI/UX Design': '14-day revision period post handoff for minor adjustments to final mockups.',
  'Cloud Architecture': '30-day monitoring and fine-tuning period to ensure stable infrastructure and expected scaling.',
  'Maintenance': 'Covered under continuous SLAs as defined in the maintenance agreement rather than a standalone warranty.',
  'E-commerce': '30-day post-launch warranty covering core workflows (checkout, cart, inventory sync).',
};

export const serviceNextStepsMap: Record<string, string[]> = {
  'Web Application': [
    'Review and approve this quotation.',
    'Process initial deposit.',
    'Share existing brand assets and access credentials.'
  ],
  'Mobile App': [
    'Approve quotation & sign agreement.',
    'Pay mobilization deposit.',
    'Schedule initial architecture workshop.'
  ],
  'UI/UX Design': [
    'Sign approval off on quotation.',
    'Complete creative brief questionnaire.',
    'Schedule discovery and research kickoff.'
  ],
  'Cloud Architecture': [
    'Approve proposal.',
    'Provide current infrastructure access.',
    'Schedule technical deep-dive call.'
  ],
  'Maintenance': [
    'Sign SLA agreement.',
    'Provide repository & server access.',
    'Initial codebase audit and onboarding.'
  ],
  'E-commerce': [
    'Approve and sign quotation.',
    'Provide preliminary product lists.',
    'Setup initial merchant accounts.'
  ],
};

export const defaultTerms: string[] = [
  'Revisions outside the specified scope may incur additional charges at standard hourly rates.',
  'Client delays in providing required assets may extend the final delivery deadline.',
  'Source files and intellectual property transfer upon final payment completion.',
  'All prices are quoted in the chosen currency unless otherwise specified.',
];

export const defaultPayments: PaymentMilestone[] = [
  { pct: '50%', label: 'Deposit', trigger: 'To commence work' },
  { pct: '25%', label: 'Milestone', trigger: 'Upon beta delivery' },
  { pct: '25%', label: 'Final', trigger: 'Prior to launch' },
];

export function computeQuotationTotals(
  costItems: CostItem[],
  discountPct: number,
  includeGST: boolean,
  gstRate: number
) {
  const subtotal = costItems.reduce((sum, item) => {
    const qty = parseFloat(String(item.qty) || '1');
    const unitPrice = parseFloat(String(item.unitPrice || item.amount).replace(/,/g, '')) || 0;
    return sum + (qty * unitPrice);
  }, 0);

  const discountAmount = Math.round(subtotal * (discountPct / 100));
  const priceAfterDiscount = subtotal - discountAmount;
  const gstAmount = includeGST ? Math.round(priceAfterDiscount * (gstRate / 100)) : 0;
  const totalInvestment = priceAfterDiscount + gstAmount;

  return {
    subtotal,
    discountAmount,
    priceAfterDiscount,
    gstAmount,
    totalInvestment,
  };
}
