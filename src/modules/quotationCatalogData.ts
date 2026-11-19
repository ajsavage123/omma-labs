/**
 * OomaLabs Quotation Generator - Hierarchical Module Catalog & Pricing Data
 * Categorized by:
 * - High-level: Websites, Applications, AI Automations
 * - 19 Website Types (Business, Corporate, Portfolio, Landing Page, E-commerce, etc.)
 * - Sub-groups: Pages, Features, Add-ons
 */

export interface CatalogItem {
  id: string;
  name: string;
  category: 'Websites' | 'Applications' | 'AI Automations';
  subCategory: string;
  group: 'Pages' | 'Features' | 'Add-ons';
  defaultPriceUSD: number;
  defaultPriceINR: number;
  description?: string;
}

export interface CatalogSubCategory {
  name: string;
  category: 'Websites' | 'Applications' | 'AI Automations';
  description?: string;
  icon?: string;
  pages: string[];
  features: string[];
  addons: string[];
}

export const WEBSITE_CATALOG: Record<string, { icon: string; pages: string[]; features: string[]; addons: string[] }> = {
  'Business Website': {
    icon: '💼',
    pages: [
      'Home', 'About', 'Services', 'Service Detail', 'Contact', 'FAQ',
      'Testimonials / Reviews', 'Gallery', 'Locations', 'Blog', 'Team',
      'Team Member Detail', 'Pricing', 'Process / How It Works', 'Industries',
      'Case Studies', 'Projects', 'Project Detail', 'Partners / Clients',
      'Certifications', 'Awards', 'Careers', 'Career Detail', 'News',
      'News Detail', 'Resources', 'Resource Detail', 'Downloads',
      'Downloads Detail', 'Events', 'Event Detail', 'Offers', 'Offer Detail',
      'Contact Locations', 'Privacy Policy', 'Terms & Conditions', 'Cookie Policy',
      'Accessibility', 'Sitemap', 'Search Results', 'Thank You', '404 Page', 'Coming Soon'
    ],
    features: [
      'Responsive Design', 'CMS', 'Contact Form', 'CTA Buttons', 'WhatsApp Button',
      'Google Maps', 'Social Media Links', 'Image Gallery', 'FAQ Accordion',
      'Blog / CMS', 'Basic SEO', 'Analytics', 'Spam Protection', 'Search',
      'Newsletter Signup', 'Lead Capture', 'Form Notifications', 'Social Sharing',
      'Cookie Consent', 'Performance Optimization', 'Security', 'Schema Markup',
      'Open Graph', 'XML Sitemap', 'Robots.txt', 'Image Optimization',
      'Video Embeds', 'Testimonials Slider', 'Logo / Brand Assets', 'Breadcrumbs',
      'Sticky Header', 'Mobile Navigation', 'Multi-language', 'Live Chat',
      'AI Chatbot', 'Booking System', 'CRM Integration'
    ],
    addons: [
      'WhatsApp Automation', 'Email Automation', 'Advanced SEO', 'Advanced Analytics',
      'Marketing Pixels', 'Heatmaps', 'A/B Testing', 'Custom Animations',
      'Third-party Integrations', 'API Integration', 'Maps / Location Integration',
      'Payment Gateway', 'Maintenance & Support', 'Additional Page',
      'Additional Service Page', 'Blog Setup', 'Custom Module', 'Custom Form',
      'Custom Dashboard', 'Member Login'
    ]
  },

  'Corporate Website': {
    icon: '🏢',
    pages: [
      'Home', 'About Company', 'Services', 'Service Detail', 'Industries',
      'Case Studies', 'Team', 'Careers', 'Career Detail', 'Blog', 'Contact',
      'Locations', 'Leadership', 'Leadership Detail', 'Investor Relations',
      'Press / Media', 'News', 'News Detail', 'Resources', 'Whitepapers',
      'Reports', 'Partners', 'Clients', 'Certifications', 'Awards', 'ESG',
      'Sustainability', 'Policies', 'Governance', 'FAQ', 'Search Results',
      'Privacy Policy', 'Terms & Conditions', 'Cookie Policy', 'Accessibility',
      'Sitemap', '404 Page'
    ],
    features: [
      'Responsive Design', 'CMS', 'Contact Forms', 'Search', 'Mega Menu',
      'Team Profiles', 'Google Maps', 'Analytics', 'SEO', 'Security',
      'Lead Capture', 'Newsletter', 'Downloads', 'Document Library',
      'Social Sharing', 'Social Links', 'Breadcrumbs', 'Structured Data',
      'Open Graph', 'XML Sitemap', 'Robots.txt', 'Performance Optimization',
      'Image Optimization', 'Video Integration', 'Media Library', 'Multi-language',
      'Localization', 'Live Chat', 'AI Chatbot', 'CRM Integration',
      'Lead Automation', 'Marketing Automation', 'Advanced Analytics',
      'Advanced SEO', 'Custom UI/UX', 'Custom Forms', 'API Integration',
      'SSO', 'Careers / Job Portal', 'Application Tracking', 'Job Search', 'Employee Stories'
    ],
    addons: [
      'Events', 'Event Registration', 'Webinars', 'Press Releases',
      'Investor Documents', 'Compliance Documents', 'Cookie Management',
      'Personalization', 'A/B Testing', 'Heatmaps', 'Chat Integration',
      'WhatsApp Integration', 'Maintenance & Support', 'Additional Page',
      'Custom Module', 'Third-party Integration', 'Advanced Security',
      'Performance Monitoring', 'Content Workflow', 'Approval Workflow'
    ]
  },

  'Portfolio Website': {
    icon: '🎨',
    pages: [
      'Home', 'About', 'Portfolio', 'Project Detail', 'Services', 'Testimonials',
      'Resume / CV', 'Blog', 'Contact', 'Project Category', 'Project Archive',
      'Client Detail', 'Case Study', 'Case Study Detail', 'Skills', 'Experience',
      'Education', 'Certifications', 'Awards', 'Press', 'Speaking', 'Publications',
      'Downloads', 'Media Kit', 'Contact Locations', 'FAQ', 'Privacy Policy',
      'Terms & Conditions', 'Cookie Policy', '404 Page'
    ],
    features: [
      'Responsive Design', 'Project Gallery', 'Image / Video Gallery', 'Project Filtering',
      'Contact Form', 'Social Links', 'Download CV', 'SEO', 'CMS', 'Search',
      'Tags', 'Categories', 'Related Projects', 'Featured Projects', 'Project Slider',
      'Lightbox', 'Video Embeds', 'Before / After Gallery', 'Image Optimization',
      'Lazy Loading', 'Analytics', 'Conversion Tracking', 'Newsletter', 'Social Sharing',
      'Open Graph', 'Schema Markup', 'XML Sitemap', 'Performance Optimization',
      'Custom Animations', 'Interactive Portfolio', 'Timeline', 'Skills Visualization',
      'Testimonials Slider', 'Map Integration', 'Booking / Consultation', 'Lead Capture',
      'Form Notifications', 'CRM Integration', 'Email Automation', 'WhatsApp Button',
      'Live Chat', 'AI Assistant'
    ],
    addons: [
      'Advanced Gallery', 'Advanced SEO', 'Video Integration', 'Multi-language',
      'Custom Domain', 'Password-protected Projects', 'Private Portfolio',
      'Client Proofing', 'File Downloads', 'Project Inquiry', 'Advanced Analytics',
      'A/B Testing', 'Third-party Integrations', 'API Integration',
      'Maintenance & Support', 'Additional Project Page', 'Custom Module',
      'Custom Form', 'Custom Landing Page', 'Portfolio Migration', 'Content Import',
      'Media Library', 'Custom UI/UX', 'Performance Monitoring', 'CTA Buttons',
      'Filters', 'User Accounts', 'User Dashboard'
    ]
  },

  'Landing Page': {
    icon: '🎯',
    pages: [
      'Landing Page', 'Thank You Page', 'Privacy Policy', 'Terms & Conditions',
      'Cookie Policy', 'FAQ', 'Offer Detail', 'Pricing Section', 'Comparison Section',
      'Features Section', 'Benefits Section', 'Use Cases', 'Problem / Solution',
      'How It Works', 'Process Section', 'Testimonials', 'Reviews', 'Case Studies',
      'Logos / Trust Bar', 'Team Section', 'Founder Section', 'FAQ Section',
      'Guarantee Section', 'Countdown Section', 'Contact Section', 'Footer', '404 Page'
    ],
    features: [
      'Responsive Design', 'Hero Section', 'CTA', 'Lead Form', 'WhatsApp Button',
      'Analytics', 'Conversion Tracking', 'Form Notifications', 'UTM Tracking',
      'Pixel Tracking', 'Event Tracking', 'Heatmaps', 'Session Recording',
      'A/B Testing', 'Sticky CTA', 'Exit Intent', 'Popup Form', 'Progressive Form',
      'Multi-step Form', 'Conditional Form', 'Form Validation', 'Spam Protection',
      'Email Notifications', 'CRM Integration', 'Email Automation', 'WhatsApp Automation',
      'Chatbot', 'Live Chat', 'Custom Animations', 'Video Background', 'Video Embed',
      'Image Optimization', 'SEO', 'Advanced SEO', 'Schema Markup', 'Open Graph',
      'Fast Loading', 'Mobile Optimization', 'Accessibility', 'Cookie Consent',
      'Payment Gateway', 'Checkout', 'Coupon Code', 'Appointment Booking', 'Calendar',
      'Social Proof', 'Dynamic Content', 'Personalization', 'Geo Targeting',
      'Device Targeting', 'Referral Tracking', 'Affiliate Tracking'
    ],
    addons: [
      'Advanced Analytics', 'Custom Domain', 'Custom UI/UX', 'API Integration',
      'Third-party Integration', 'Additional Landing Page', 'A/B Variant',
      'Advanced Forms', 'Lead Scoring', 'Lead Routing', 'Sales Notifications',
      'CRM Webhook', 'Downloadable Lead Magnet', 'Newsletter Signup',
      'Maintenance & Support', 'Custom Module', 'Custom Script', 'CMS',
      'Contact Form', 'CTA Buttons', 'Search'
    ]
  },

  'E-commerce Website': {
    icon: '🛒',
    pages: [
      'Home', 'Shop', 'Product Category', 'Product Detail', 'Cart', 'Checkout',
      'My Account', 'Orders', 'Wishlist', 'Contact', 'FAQ', 'Privacy Policy',
      'Terms & Conditions', 'Shipping / Returns', 'About', 'Brands', 'Brand Detail',
      'Deals', 'Offers', 'Sale Page', 'New Arrivals', 'Best Sellers',
      'Product Search', 'Search Results', 'Compare Products', 'Gift Cards',
      'Store Locator', 'Track Order', 'Order Detail', 'Invoice', 'Addresses',
      'Payment Methods'
    ],
    features: [
      'Product Catalogue', 'Filters', 'Product Variants', 'Shopping Cart',
      'Coupons', 'Reviews & Ratings', 'Order Tracking', 'Inventory Management',
      'Customer Accounts', 'Payment Gateway', 'Shipping Calculation',
      'Tax Calculation', 'Product Recommendations', 'Related Products',
      'Recently Viewed', 'Back-in-stock Alerts', 'Low-stock Alerts',
      'Product Bundles', 'Cross-sell', 'Upsell', 'Subscriptions',
      'Digital Products', 'Download Delivery', 'Guest Checkout', 'Saved Cart',
      'Abandoned Cart', 'Email Notifications', 'SMS Notifications',
      'WhatsApp Notifications', 'Returns Management', 'Refunds',
      'Exchange Management', 'Order Management', 'Customer Management',
      'Vendor Management', 'Search Engine', 'SEO', 'Schema Markup', 'Analytics',
      'Conversion Tracking', 'Pixel Tracking', 'Marketing Automation',
      'CRM Integration', 'Email Automation', 'WhatsApp Automation'
    ],
    addons: [
      'Loyalty Program', 'Rewards', 'Referral Program', 'Affiliate Program',
      'Store Credit', 'Multi-currency', 'Multi-language', 'Multiple Tax Rules',
      'Advanced Shipping', 'Marketplace / Multi-vendor', 'Product Comparison',
      'Bulk Product Upload', 'Advanced Filters', 'Subscription Products',
      'AI Product Assistant', 'Advanced Analytics', 'Custom UI/UX',
      'API Integration', 'POS Integration', 'ERP Integration',
      'Accounting Integration', 'Maintenance & Support', 'Responsive Design'
    ]
  },

  'Booking / Appointment Website': {
    icon: '📅',
    pages: [
      'Home', 'Services', 'Service Detail', 'Booking', 'Availability',
      'Booking Confirmation', 'My Bookings', 'Team / Staff', 'Staff Detail',
      'Locations', 'Contact', 'FAQ', 'About', 'Pricing', 'Packages',
      'Memberships', 'Offers', 'Gift Cards', 'Calendar', 'Time Slots'
    ],
    features: [
      'Staff Selection', 'Availability Management', 'Cancellation / Rescheduling',
      'Email Notifications', 'Payment During Booking', 'Google Calendar Integration',
      'Online Booking', 'Recurring Appointments', 'Multiple Locations',
      'SMS Reminders', 'WhatsApp Reminders', 'Online Payments', 'CRM Integration',
      'Staff Dashboard', 'Automation', 'Waitlist', 'Group Booking', 'Class Booking',
      'Resource Booking', 'Room Booking', 'Equipment Booking', 'Buffer Time',
      'Blackout Dates', 'Holiday Calendar', 'Timezone Support', 'Calendar Sync',
      'Outlook Calendar', 'iCal Sync', 'Appointment Types', 'Duration Rules',
      'Pricing Rules', 'Deposit Payments', 'Refunds', 'Coupons', 'Promo Codes',
      'Customer Accounts', 'Customer Profiles', 'Booking History', 'Invoice Generation',
      'Receipts', 'Email Templates', 'SMS Templates', 'WhatsApp Templates',
      'Review Requests', 'Ratings', 'Staff Availability', 'Staff Leave Management',
      'Staff Permissions', 'Branch Management', 'Lead Capture', 'Lead Routing',
      'CRM Automation', 'Payment Gateway', 'Subscription Billing', 'Membership Billing'
    ],
    addons: [
      'Analytics', 'Booking Analytics', 'Revenue Analytics', 'Conversion Tracking',
      'No-show Tracking', 'Reminder Automation', 'Follow-up Automation',
      'AI Booking Assistant', 'Chatbot', 'Live Chat', 'Maps Integration',
      'Directions', 'Multi-language', 'Multi-currency', 'Custom UI/UX',
      'API Integration', 'Third-party Integrations', 'Advanced Booking',
      'Advanced Reports', 'Custom Forms', 'Additional Service',
      'Maintenance & Support', 'Responsive Design', 'CMS'
    ]
  },

  'Directory Website': {
    icon: '📂',
    pages: [
      'Home', 'Listings', 'Category', 'Listing Detail', 'Search Results',
      'Submit Listing', 'User Dashboard', 'Saved Listings', 'Contact', 'About',
      'FAQ', 'Pricing', 'Vendor Registration', 'Vendor Profile', 'Vendor Dashboard',
      'Listing Management', 'Claim Listing', 'Listing Approval', 'Listing Verification',
      'Location Search', 'Map View'
    ],
    features: [
      'Search', 'Advanced Filters', 'Categories', 'Listing Profiles',
      'Listing Submission', 'Reviews & Ratings', 'Favourites', 'Featured Listings',
      'Paid Listings', 'Advanced Map', 'Reviews Moderation', 'Subscription Plans',
      'Payment Gateway', 'CRM Integration', 'Listing Import', 'Bulk Listing Upload',
      'Listing Export', 'Duplicate Detection', 'Business Hours', 'Contact Details',
      'Phone Reveal', 'Website Link', 'Social Links', 'Photo Gallery',
      'Video Gallery', 'Amenities', 'Attributes', 'Tags', 'Related Listings',
      'Similar Listings', 'Nearby Listings', 'Distance Search', 'Radius Search',
      'Geo Search', 'Map Clustering', 'Directions', 'Lead Forms',
      'Enquiry Management', 'Messaging', 'Notifications', 'Email Alerts',
      'Saved Searches', 'Search Alerts', 'User Registration', 'Login',
      'Password Reset', 'User Profiles', 'User Roles', 'Vendor Verification',
      'Admin Moderation', 'Report Listing', 'Abuse Reporting', 'Listing Expiry',
      'Renewal', 'Featured Placement', 'Sponsored Listings', 'Subscription Billing',
      'Commission Management', 'Coupons'
    ],
    addons: [
      'Analytics', 'Listing Analytics', 'Lead Analytics', 'SEO', 'Schema Markup',
      'Open Graph', 'Multi-language', 'Multi-location', 'API Integration',
      'WhatsApp Integration', 'AI Search', 'AI Listing Assistant',
      'Advanced Search', 'Custom UI/UX', 'Mobile PWA', 'Maintenance & Support',
      'Custom Module', 'Additional Listing Type', 'Responsive Design', 'CMS'
    ]
  },

  'Membership Website': {
    icon: '👑',
    pages: [
      'Home', 'About', 'Membership Plans', 'Registration', 'Login',
      'Member Dashboard', 'Member Profile', 'Account Settings', 'Subscription',
      'Billing', 'Members-only Content', 'Contact', 'FAQ', 'Pricing',
      'Membership Detail', 'Benefits', 'Community', 'Member Directory',
      'Events', 'Event Detail', 'Resources', 'Resource Detail', 'Courses',
      'Course Detail', 'Downloads', 'Profile Settings', 'Security Settings',
      'Privacy Settings', 'Payment History', 'Invoices'
    ],
    features: [
      'User Registration', 'Password Reset', 'Membership Levels', 'Content Restriction',
      'Recurring Payments', 'User Roles', 'Profile Management', 'Email Notifications',
      'Subscription Management', 'Billing Management', 'Payment Gateway', 'Coupons',
      'Trial Periods', 'Upgrade / Downgrade', 'Cancellation', 'Renewal',
      'Grace Period', 'Access Expiry', 'Entitlement Management', 'Role-based Access',
      'Permissions', 'Private Pages', 'Private Posts', 'Private Downloads',
      'Community Integration', 'Forums', 'Comments', 'Messaging',
      'Member Search', 'Member Verification', 'Profile Approval',
      'Email Automation', 'SMS Notifications', 'WhatsApp Notifications',
      'CRM Integration', 'Member Import', 'Member Export', 'Activity History',
      'Login History', 'Content Library', 'Document Library', 'Video Library',
      'Newsletter', 'Events Management', 'Event Registration', 'Booking', 'Calendar'
    ],
    addons: [
      'Analytics', 'Membership Analytics', 'Revenue Analytics', 'Engagement Analytics',
      'AI Assistant', 'Chatbot', 'Advanced Membership Levels', 'Paid Content',
      'Advanced Access Control', 'Recurring Subscription Automation',
      'Custom Dashboard', 'API Integration', 'SSO', 'Multi-language',
      'Advanced Security', 'Custom UI/UX', 'Mobile PWA', 'Maintenance & Support',
      'Custom Module', 'Responsive Design', 'CMS', 'Contact Form', 'CTA Buttons'
    ]
  },

  'Blog / Publication Website': {
    icon: '📰',
    pages: [
      'Home', 'Blog', 'Article Detail', 'Category', 'Author', 'Search',
      'About', 'Contact', 'Privacy Policy', 'Terms & Conditions', 'News',
      'News Detail', 'Opinion', 'Opinion Detail', 'Topics', 'Topic Detail',
      'Archive', 'Tag Archive', 'Author Archive', 'Featured Articles',
      'Trending Articles', 'Latest Articles', 'Related Articles', 'Popular Articles',
      'Newsletter', 'Subscribe', 'Membership', 'Paywall', 'Media', 'Video',
      'Podcast', 'Podcast Episode', 'Events', 'Event Detail'
    ],
    features: [
      'CMS', 'Categories', 'Tags', 'Article Search', 'Author Profiles',
      'Comments', 'Social Sharing', 'Newsletter Signup', 'SEO', 'Analytics',
      'Editorial Workflow', 'Drafts', 'Scheduled Publishing', 'Content Approval',
      'Version History', 'Media Library', 'Image Optimization', 'Video Embeds',
      'Audio Embeds', 'Podcast Feed', 'RSS Feed', 'Sitemap', 'Schema Markup',
      'Open Graph', 'Canonical URLs', 'Robots.txt', 'Search Engine',
      'Internal Search', 'Recommendations', 'Reading List', 'Bookmarks',
      'Saved Articles', 'Print View', 'PDF Export', 'Email Article',
      'Author Follow', 'Topic Follow', 'Push Notifications', 'Comment Moderation',
      'User Registration', 'User Login', 'User Profiles', 'Social Login',
      'Newsletter Automation', 'Blog Migration', 'Bulk Content Upload'
    ],
    addons: [
      'Advanced SEO', 'Paywall / Membership', 'AI Content Assistant',
      'Multi-language', 'Advanced Analytics', 'Advertising Slots',
      'Sponsored Content', 'Subscription Billing', 'CRM Integration',
      'Email Automation', 'WhatsApp Sharing', 'Custom UI/UX',
      'API Integration', 'Third-party Integrations', 'Performance Optimization',
      'Accessibility', 'Maintenance & Support', 'Custom Module',
      'Additional Content Type', 'Responsive Design'
    ]
  },

  'Educational Website': {
    icon: '🎓',
    pages: [
      'Home', 'Courses', 'Course Detail', 'Lessons', 'Lesson Detail',
      'Student Registration', 'Student Login', 'Student Dashboard', 'Progress',
      'Quiz', 'Results', 'Certificates', 'Instructor Profile', 'Contact',
      'FAQ', 'Pricing', 'Course Category', 'Learning Paths', 'Programs',
      'Program Detail', 'Assignments', 'Assignment Detail', 'Exams',
      'Exam Detail', 'Question Bank', 'Resources', 'Downloads', 'Events',
      'Live Classes', 'Community', 'Discussion', 'Announcements',
      'Student Profile', 'Instructor Dashboard'
    ],
    features: [
      'Course Catalogue', 'Student Accounts', 'Lesson Management', 'Video Lessons',
      'Quizzes', 'Progress Tracking', 'Instructor Profiles', 'Search',
      'Payment Gateway', 'Subscriptions', 'Advanced Quizzes',
      'Zoom / Meeting Integration', 'Automated Certificates', 'CRM Integration',
      'AI Tutor', 'Multi-language', 'Course Reviews', 'Ratings', 'Bookmarks',
      'Notes', 'Watch History', 'Resume Learning', 'Completion Tracking',
      'Attendance', 'Gradebook', 'Leaderboards', 'Badges', 'Gamification',
      'Learning Analytics', 'Student Analytics', 'Instructor Analytics',
      'Course Analytics', 'Enrollment Management', 'Cohorts', 'Batch Management',
      'Calendar', 'Schedule', 'Notifications', 'Email Automation',
      'SMS Notifications', 'WhatsApp Notifications', 'Payment Plans',
      'Coupons', 'Discounts', 'Trial Courses', 'Memberships'
    ],
    addons: [
      'Content Drip', 'Prerequisites', 'Access Control', 'Certificates Verification',
      'Certificate Download', 'Plagiarism Check', 'Proctoring',
      'Question Randomization', 'Time Limits', 'Pass Criteria', 'API Integration',
      'SSO', 'Custom Dashboard', 'Custom UI/UX', 'Advanced Analytics',
      'AI Content Assistant', 'AI Assessment', 'Maintenance & Support',
      'Custom Module', 'Responsive Design'
    ]
  },

  'Marketplace Website': {
    icon: '🛍️',
    pages: [
      'Home', 'Products / Services', 'Category', 'Listing Detail', 'Search',
      'Seller Profile', 'Seller Dashboard', 'Cart', 'Checkout', 'Orders',
      'User Dashboard', 'Contact', 'About', 'FAQ', 'Seller Registration',
      'Seller Verification', 'Seller Detail', 'Product Detail', 'Service Detail',
      'Category Detail', 'Search Results', 'Wishlist', 'Saved Listings',
      'Messages', 'Notifications', 'Reviews', 'Ratings', 'Returns',
      'Refunds', 'Disputes', 'Support', 'Seller Payouts', 'Commission', 'Vendor Policies'
    ],
    features: [
      'Multi-vendor', 'Product / Service Listings', 'Search & Filters',
      'Commission Management', 'Order Management', 'Payments', 'Vendor Verification',
      'Advanced Vendor Management', 'Seller Subscriptions', 'Featured Listings',
      'Advanced Commission Rules', 'Messaging', 'Shipping Integration',
      'CRM Integration', 'Analytics', 'Seller Analytics', 'Sales Analytics',
      'Customer Analytics', 'Inventory Management', 'Product Variants',
      'Bulk Upload', 'Order Fulfillment', 'Shipping Labels', 'Tracking',
      'Tax Calculation', 'Coupons', 'Promotions', 'Discounts', 'Seller Coupons',
      'Seller Storefront', 'Store Categories', 'Featured Vendors',
      'Sponsored Vendors', 'Vendor Ads', 'Vendor Memberships', 'Payout Scheduling',
      'Payment Gateway', 'Escrow', 'Dispute Management', 'Refund Management',
      'Email Automation', 'WhatsApp Automation', 'CRM Automation', 'Search Engine',
      'Advanced Search'
    ],
    addons: [
      'AI Search', 'AI Seller Assistant', 'Multi-language', 'Multi-currency',
      'API Integration', 'Third-party Integration', 'Custom UI/UX',
      'Mobile PWA', 'Advanced Analytics', 'Custom Module', 'Maintenance & Support',
      'Responsive Design', 'CMS', 'Contact Form', 'CTA Buttons', 'Filters',
      'User Accounts', 'Admin Dashboard', 'Email Notifications', 'SEO', 'Advanced SEO'
    ]
  },

  'Real Estate Website': {
    icon: '🏠',
    pages: [
      'Home', 'Properties', 'Property Category', 'Property Detail', 'Search',
      'Agent Profile', 'Locations', 'Schedule Viewing', 'Saved Properties',
      'Enquiry', 'Contact', 'About', 'Projects', 'Project Detail',
      'Property Type', 'New Projects', 'Featured Properties', 'Commercial',
      'Residential', 'Rentals', 'Luxury', 'Land', 'Agents', 'Agent Directory',
      'Developers', 'Developer Profile', 'Amenities', 'Floor Plans',
      'Brochures', 'Gallery', 'Video Tour', 'Virtual Tour', 'Mortgage Calculator',
      'Property Comparison', 'Map Search'
    ],
    features: [
      'Advanced Search', 'Filters', 'Property Listings', 'Property Gallery',
      'Agent Profiles', 'Favourites', 'Enquiry Forms', 'Viewing Requests',
      'Property Import', 'Advanced Map', 'CRM Integration', 'WhatsApp Enquiries',
      'Lead Automation', 'Property Valuation', 'EMI Calculator', 'Loan Calculator',
      'Stamp Duty Calculator', 'Registration Calculator', 'ROI Calculator',
      'Rental Yield', 'Area Converter', 'Location Insights', 'Nearby Places',
      'Commute Map', 'School Search', 'Hospital Search', 'Price Trends',
      'Market Reports', 'Saved Searches', 'Search Alerts', 'Lead Capture',
      'Lead Routing', 'Lead Scoring', 'Agent Assignment', 'Contact Management',
      'Follow-up Automation', 'Email Automation', 'SMS Notifications',
      'WhatsApp Automation', 'Appointment Booking', 'Calendar', 'Document Upload',
      'Document Management', 'Property Documents', 'Owner Portal'
    ],
    addons: [
      'Agent Dashboard', 'Admin Dashboard', 'Listing Approval', 'Listing Verification',
      'Featured Listings', 'Paid Listings', 'Subscription Plans', 'Payment Gateway',
      'Analytics', 'Lead Analytics', 'Listing Analytics', 'SEO', 'Schema Markup',
      'Multi-language', 'API Integration', 'Custom UI/UX', 'Mobile PWA',
      'AI Property Assistant', 'AI Search', 'Maintenance & Support'
    ]
  },

  'Restaurant / Food Website': {
    icon: '🍽️',
    pages: [
      'Home', 'Menu', 'Menu Category', 'Food Item Detail', 'Reservation',
      'Online Ordering', 'Cart', 'Checkout', 'Locations', 'Offers',
      'Gallery', 'Contact', 'About', 'FAQ', 'Catering', 'Catering Detail',
      'Private Dining', 'Events', 'Event Detail', 'Order Tracking',
      'Order History', 'My Account', 'Loyalty', 'Gift Cards', 'Coupons',
      'Deals', 'Branches', 'Branch Detail', 'Delivery Areas', 'Menu Search',
      'Dietary Information', 'Allergen Information', 'Nutrition'
    ],
    features: [
      'Digital Menu', 'Table Reservation', 'Food Categories', 'Payment Gateway',
      'Location Map', 'Order Notifications', 'Delivery Integration',
      'POS Integration', 'WhatsApp Ordering', 'Online Payments', 'Multiple Locations',
      'Loyalty Program', 'Order Automation', 'CRM Integration',
      'Kitchen Display Integration', 'Delivery Tracking', 'Pickup Orders',
      'Scheduled Orders', 'Preorders', 'Table Management', 'Waitlist',
      'Reservation Management', 'Guest Profiles', 'Customer Accounts',
      'Order Management', 'Refunds', 'Promotions', 'Rewards', 'Reviews',
      'Ratings', 'Review Requests', 'Email Notifications', 'SMS Notifications',
      'WhatsApp Notifications', 'Email Automation', 'Marketing Automation',
      'CRM Automation', 'Analytics', 'Sales Analytics', 'Order Analytics',
      'Customer Analytics', 'Menu Management', 'Inventory Integration',
      'Ingredient Management', 'Kitchen Management', 'Staff Accounts', 'Branch Management'
    ],
    addons: [
      'Multi-language', 'Multi-currency', 'AI Menu Assistant', 'AI Ordering Assistant',
      'Chatbot', 'Live Chat', 'Maps Integration', 'Directions', 'SEO',
      'Schema Markup', 'API Integration', 'Third-party Integration',
      'Custom UI/UX', 'Mobile PWA', 'Advanced Analytics', 'Maintenance & Support',
      'Custom Module', 'Responsive Design', 'CMS', 'Contact Form'
    ]
  },

  'Hotel / Accommodation Website': {
    icon: '🏨',
    pages: [
      'Home', 'Rooms', 'Room Detail', 'Availability', 'Booking',
      'Booking Confirmation', 'Amenities', 'Gallery', 'Offers', 'Location',
      'My Booking', 'Contact', 'About', 'FAQ', 'Rooms & Suites',
      'Room Type', 'Room Comparison', 'Packages', 'Package Detail',
      'Experiences', 'Experience Detail', 'Dining', 'Dining Detail',
      'Spa', 'Spa Detail', 'Events', 'Event Detail', 'Meeting Rooms',
      'Wedding', 'Wedding Detail', 'Gift Cards', 'Virtual Tour'
    ],
    features: [
      'Availability Calendar', 'Online Booking', 'Guest Details', 'Payment Gateway',
      'Room Gallery', 'Google Maps', 'Email Notifications', 'Channel Manager Integration',
      'Multiple Properties', 'Advanced Booking', 'Payment Automation',
      'WhatsApp Notifications', 'Guest CRM', 'Loyalty Program', 'Multi-language',
      'Rate Plans', 'Dynamic Pricing', 'Room Inventory', 'Rate Calendar',
      'Promo Codes', 'Coupons', 'Extra Services', 'Airport Transfer',
      'Restaurant Reservation', 'Spa Booking', 'Event Booking', 'Guest Accounts',
      'Booking History', 'Cancellation', 'Modification', 'Refunds', 'Invoices',
      'Receipts', 'Email Automation', 'SMS Notifications', 'WhatsApp Automation',
      'CRM Integration', 'Channel Manager', 'OTA Integration', 'PMS Integration',
      'POS Integration', 'Housekeeping Integration', 'Staff Dashboard',
      'Property Dashboard', 'Revenue Analytics', 'Occupancy Analytics', 'Booking Analytics'
    ],
    addons: [
      'Guest Analytics', 'Review Management', 'Review Requests', 'SEO',
      'Schema Markup', 'Maps Integration', 'AI Concierge', 'Chatbot',
      'Live Chat', 'API Integration', 'Custom UI/UX', 'Mobile PWA',
      'Advanced Analytics', 'Maintenance & Support', 'Custom Module',
      'Responsive Design', 'CMS', 'Contact Form', 'CTA Buttons', 'Search'
    ]
  },

  'Event Website': {
    icon: '🎟️',
    pages: [
      'Home', 'About Event', 'Schedule', 'Speakers', 'Speaker Detail',
      'Venue', 'Registration', 'Tickets', 'Sponsors', 'FAQ', 'Contact',
      'About Organizer', 'Organizer Profile', 'Agenda', 'Session Detail',
      'Track', 'Track Detail', 'Workshops', 'Workshop Detail', 'Exhibitors',
      'Exhibitor Detail', 'Networking', 'Travel Information', 'Accommodation',
      'Venue Map', 'Directions', 'Downloads', 'Resources', 'News',
      'Announcements', 'Gallery', 'Videos', 'Live Stream', 'Event App'
    ],
    features: [
      'Ticketing', 'Speaker Profiles', 'Email Confirmation', 'Payment Gateway',
      'Countdown', 'Multiple Ticket Types', 'Early-bird Pricing', 'QR Code Tickets',
      'Check-in System', 'Email Automation', 'Sponsor Management',
      'Live Streaming Integration', 'Analytics', 'Attendee Registration',
      'Attendee Profiles', 'Badge Generation', 'QR Check-in', 'Session Check-in',
      'Attendance Tracking', 'Ticket Transfer', 'Ticket Cancellation', 'Refunds',
      'Promo Codes', 'Discounts', 'Group Registration', 'Corporate Registration',
      'Waitlist', 'Session Booking', 'Capacity Management', 'Room Management',
      'Speaker Management', 'Sponsor Portal', 'Exhibitor Portal',
      'Volunteer Management', 'Staff Dashboard', 'Push Notifications',
      'Email Notifications', 'SMS Notifications', 'WhatsApp Notifications',
      'Messaging', 'Meeting Scheduling', 'Surveys', 'Feedback', 'Polls', 'Q&A', 'Live Chat'
    ],
    addons: [
      'Maps Integration', 'Social Sharing', 'SEO', 'Schema Markup',
      'CRM Integration', 'API Integration', 'Payment Automation',
      'Advanced Analytics', 'Multi-language', 'Custom UI/UX', 'Mobile PWA',
      'Maintenance & Support', 'Custom Module', 'Responsive Design',
      'CMS', 'Contact Form', 'CTA Buttons', 'Search', 'Filters', 'User Accounts'
    ]
  },

  'Nonprofit / Organization Website': {
    icon: '🤝',
    pages: [
      'Home', 'About', 'Programs', 'Projects', 'Impact / Reports', 'Team',
      'Events', 'Get Involved', 'Donate', 'Volunteer', 'Blog', 'Contact',
      'Mission', 'Vision', 'Values', 'Leadership', 'Leadership Detail',
      'Annual Reports', 'Financial Reports', 'Impact Stories', 'Story Detail',
      'Campaigns', 'Campaign Detail', 'Causes', 'Cause Detail', 'Partners',
      'Sponsors', 'News', 'News Detail', 'Resources', 'Downloads', 'FAQ',
      'Privacy Policy', 'Terms & Conditions'
    ],
    features: [
      'Donation Form', 'Volunteer Form', 'Event Registration', 'Newsletter',
      'Project Gallery', 'Impact Reports', 'Contact Forms', 'Payment Gateway',
      'Analytics', 'CMS', 'Recurring Donations', 'Donor Management',
      'CRM Integration', 'Volunteer Management', 'Email Automation',
      'Payment Automation', 'Multi-language', 'Advanced Analytics',
      'Donor Portal', 'Donor Profiles', 'Donation History', 'Receipts',
      'Tax Receipts', 'Campaign Progress', 'Fundraising Goals',
      'Peer-to-peer Fundraising', 'Fundraising Pages', 'Recurring Giving',
      'Matching Gifts', 'Pledge Management', 'Grant Management',
      'Grant Applications', 'Volunteer Registration', 'Volunteer Profiles',
      'Volunteer Scheduling', 'Volunteer Hours', 'Event Management',
      'Ticketing', 'Membership', 'Community', 'Member Directory',
      'Newsletter Automation', 'SMS Notifications', 'WhatsApp Notifications',
      'Social Sharing', 'Social Media Integration'
    ],
    addons: [
      'Maps Integration', 'SEO', 'Schema Markup', 'Open Graph',
      'Content Workflow', 'Approval Workflow', 'Document Library',
      'Media Library', 'API Integration', 'Accounting Integration',
      'CRM Automation', 'AI Assistant', 'Donation Assistant', 'Chatbot',
      'Custom UI/UX', 'Mobile PWA', 'Custom Dashboard', 'Advanced Security',
      'Maintenance & Support', 'Custom Module'
    ]
  },

  'SaaS / Web Application Website': {
    icon: '⚡',
    pages: [
      'Home', 'Features', 'Pricing', 'Solutions', 'Documentation', 'Blog',
      'About', 'Contact', 'Login', 'Sign Up', 'Forgot Password',
      'Product Overview', 'Feature Detail', 'Pricing Detail', 'Use Case',
      'Use Case Detail', 'Integrations', 'Integration Detail', 'API Documentation',
      'Developer Portal', 'Changelog', 'Status', 'Security', 'Compliance',
      'Resources', 'Guides', 'Tutorials', 'FAQ', 'Contact Sales', 'Request Demo'
    ],
    features: [
      'User Registration', 'Dashboard', 'Pricing Plans', 'Subscriptions',
      'Product Search', 'API / Integration Support', 'Analytics', 'Notifications',
      'Advanced Dashboard', 'Team Accounts', 'Role Management', 'API Integration',
      'SSO', 'AI Features', 'Advanced Analytics', 'Billing Automation',
      'Custom UI/UX', 'User Profiles', 'Account Settings', 'Workspace Management',
      'Organization Management', 'Permissions', 'Role-based Access', 'Invitations',
      'Team Management', 'Activity Logs', 'Audit Logs', 'Usage Metering',
      'Quotas', 'Plan Limits', 'Feature Flags', 'Onboarding', 'Product Tours',
      'In-app Help', 'Search', 'Global Search', 'Email Notifications',
      'Webhooks', 'API Keys', 'OAuth', 'Third-party Integrations',
      'Billing Portal', 'Invoices', 'Payment Gateway', 'Coupons', 'Trials',
      'Upgrade / Downgrade', 'Cancellation', 'Refunds', 'Support Tickets'
    ],
    addons: [
      'Live Chat', 'Chatbot', 'Knowledge Base', 'Status Page',
      'Incident Management', 'Feature Requests', 'Feedback', 'Surveys',
      'A/B Testing', 'Event Tracking', 'Product Analytics', 'Marketing Analytics',
      'CRM Integration', 'Email Automation', 'WhatsApp Automation',
      'AI Assistant', 'AI Copilot', 'Multi-language', 'Mobile PWA', 'Maintenance & Support'
    ]
  },

  'Customer Portal': {
    icon: '🔐',
    pages: [
      'Login', 'Forgot Password', 'Dashboard', 'Profile', 'Projects',
      'Project Detail', 'Documents', 'Document Detail', 'Invoices',
      'Invoice Detail', 'Payments', 'Payment Detail', 'Support', 'Support Ticket',
      'Notifications', 'Settings', 'Account', 'Team', 'Team Member',
      'Messages', 'Activity', 'Tasks', 'Task Detail', 'Milestones',
      'Milestone Detail', 'Reports', 'Report Detail', 'Contracts',
      'Contract Detail', 'Approvals', 'Approval Detail', 'Requests',
      'Request Detail', 'Knowledge Base', 'FAQ', 'Contact'
    ],
    features: [
      'Secure Login', 'User Dashboard', 'Project Tracking', 'Document Upload',
      'Invoice Viewing', 'Online Payments', 'Support Requests', 'Role-based Access',
      'Activity History', 'Profile Management', 'Password Reset',
      'Two-factor Authentication', 'Session Management', 'Device Management',
      'Project Timeline', 'Task Management', 'Task Assignment', 'Status Tracking',
      'File Storage', 'File Sharing', 'File Preview', 'Version History',
      'Document Approval', 'E-signature', 'Invoice Download', 'Receipt Download',
      'Payment History', 'Saved Payment Methods', 'Payment Gateway', 'Support Chat',
      'Ticket Routing', 'Ticket Priority', 'SLA Tracking', 'Search',
      'Global Search', 'Email Notifications', 'SMS Notifications',
      'WhatsApp Notifications', 'Push Notifications', 'Advanced Reporting',
      'CRM Integration', 'Accounting Integration', 'Live Chat', 'Approval Workflows'
    ],
    addons: [
      'Automation', 'Mobile App / PWA', 'Calendar', 'Meeting Scheduling',
      'Time Tracking', 'Timesheets', 'Expense Claims', 'Feedback',
      'Surveys', 'Announcements', 'Team Collaboration', 'Comments',
      'Mentions', 'API Integration', 'SSO', 'Custom Dashboard',
      'Advanced Security', 'Audit Logs', 'Analytics', 'Custom UI/UX'
    ]
  },

  'Custom Website': {
    icon: '✨',
    pages: [
      'Custom Home', 'Custom About', 'Custom Services', 'Custom Service Detail',
      'Custom Contact', 'Custom FAQ', 'Custom Blog', 'Custom Portfolio',
      'Custom Projects', 'Custom Project Detail', 'Custom Products',
      'Custom Product Detail', 'Custom Categories', 'Custom Search',
      'Custom Listing', 'Custom Listing Detail', 'Custom Dashboard',
      'Custom User Profile', 'Custom Registration', 'Custom Login',
      'Custom Account Settings', 'Custom Checkout', 'Custom Cart',
      'Custom Booking', 'Custom Calendar', 'Custom Payments',
      'Custom Subscription', 'Custom Membership', 'Custom Directory',
      'Custom Marketplace', 'Custom Portal', 'Custom Reports',
      'Custom Analytics', 'Custom Admin', 'Custom CMS', 'Custom Forms',
      'Custom Workflow', 'Custom Approval', 'Custom Notifications', 'Custom Messaging'
    ],
    features: [
      'Custom File Storage', 'Custom Document Management', 'Custom Role Management',
      'Custom Permissions', 'Custom Search Engine', 'Custom Maps',
      'Custom Location Services', 'Custom Media Gallery', 'Custom Video',
      'Custom Audio', 'Custom Chat', 'Custom AI Assistant', 'Custom Automation',
      'Custom API', 'Custom Integrations', 'Custom Webhooks', 'Custom OAuth',
      'Custom SSO', 'Custom SEO', 'Custom Schema', 'Custom Open Graph',
      'Custom Performance Optimization', 'Custom Security', 'Custom Backup',
      'Custom Audit Logs', 'Custom Activity History', 'Custom Reporting',
      'Custom Export', 'Custom Import', 'Custom Bulk Upload',
      'Custom Data Migration', 'Custom Multi-language', 'Custom Multi-currency',
      'Custom Personalization', 'Custom A/B Testing', 'Custom Tracking',
      'Custom CRM Integration', 'Custom Accounting Integration',
      'Custom Email Automation', 'Custom WhatsApp Automation'
    ],
    addons: [
      'Custom SMS Automation', 'Custom Payment Gateway', 'Custom Shipping Integration',
      'Custom ERP Integration', 'Custom POS Integration', 'Custom AI Features',
      'Custom Mobile PWA', 'Custom Offline Mode', 'Custom UI/UX',
      'Custom Accessibility', 'Custom Advanced Security', 'Custom Maintenance & Support',
      'Custom Module', 'Custom Third-party Integration', 'Custom Performance Monitoring',
      'Responsive Design', 'CMS', 'Contact Form', 'CTA Buttons', 'Search'
    ]
  }
};

export const APPLICATION_CATALOG: Record<string, { icon: string; pages: string[]; features: string[]; addons: string[] }> = {
  'Mobile Application (iOS / Android)': {
    icon: '📱',
    pages: [
      'Splash Screen', 'Onboarding Walkthrough', 'Auth / Login / Register', 'Home Screen',
      'Product / Item Catalog', 'Item Detail Screen', 'User Profile', 'Settings & Preferences',
      'Notifications Center', 'Cart / Checkout Screen', 'Order Status / Tracking Screen'
    ],
    features: [
      'Native Device Camera & Photos', 'Push Notifications (FCM / APNs)', 'Biometric Auth (FaceID / Fingerprint)',
      'Offline Storage & Local Cache (SQLite/WatermelonDB)', 'Deep Linking & Universal Links', 'GPS Location & Maps',
      'Dark / Light Theme Engine', 'In-App Purchases (RevenueCat / StoreKit)', 'Social Login (Apple, Google)',
      'Haptic Feedback & Micro-interactions', 'Gesture Driven Navigation'
    ],
    addons: [
      'Apple App Store Deployment & Review Handling', 'Google Play Store Setup & Compliance',
      'Crashlytics & Sentry Telemetry', 'Live Chat Support in App', 'Real-time WebSocket Sync',
      'Multi-lingual Localization (i18n)', 'App Icon & Splash Screen Asset Generation'
    ]
  },

  'Enterprise SaaS / Web App': {
    icon: '💻',
    pages: [
      'Landing & Marketing Site', 'Authentication & Multi-Tenant Login', 'Executive Dashboard',
      'CRUD Resource Management Tables', 'Detailed Analytics & Charts', 'Billing & Plan Upgrade',
      'Team & Permissions Manager', 'Audit Logs & Security Logins', 'API Keys & Webhooks Console'
    ],
    features: [
      'Role-Based Access Control (RBAC)', 'Real-time Data Subscriptions (Supabase/PostgreSQL)',
      'Data Export (CSV, Excel, PDF)', 'Advanced Filtering & Full-Text Search',
      'Automated Email Receipts & Invoicing', 'Stripe Billing & Subscription Lifecycle',
      'Audit Logging for Compliance', 'Dark Mode & Custom Theming'
    ],
    addons: [
      'Single Sign-On (SAML / Okta / Azure AD)', 'SOC2 / HIPAA Compliance Hardening',
      'Custom Domain White-labeling for Tenants', 'Automated Daily Database Backups',
      'Dedicated Staging & Production CI/CD Pipeline'
    ]
  },

  'Internal Business Tool & Admin Panel': {
    icon: '🛠️',
    pages: [
      'Admin Login', 'Master Overview Dashboard', 'User Management Table',
      'Transactions & Orders Ledger', 'CMS Content Editor', 'System Health & Metrics',
      'Support Tickets Management'
    ],
    features: [
      'Bulk Data Operations & Imports', 'Granular Permission Matrix', 'Audit Trail Recording',
      'Interactive Chart Widgets', 'Inline Editing Tables', 'One-Click Status Toggles'
    ],
    addons: [
      'Slack / Teams Notification Hooks', 'Automated Daily Health Reports via Email',
      'Internal LDAP / Google Workspace Auth', 'High-volume Database Query Optimizer'
    ]
  }
};

export const AI_AUTOMATION_CATALOG: Record<string, { icon: string; pages: string[]; features: string[]; addons: string[] }> = {
  'AI Customer Support & Sales Agents': {
    icon: '🤖',
    pages: [
      'Chatbot Embed Widget', 'Agent Conversation History Console', 'Knowledge Base & Document Uploader',
      'Prompt & Persona Tuning Dashboard', 'Fallback & Human Handover Desk', 'Analytics & CSAT Rating Report'
    ],
    features: [
      'RAG (Retrieval-Augmented Generation) over Company Docs', 'Multi-turn Context Memory',
      'Smart Lead Capture & CRM Sync', 'Human Agent Escalation Trigger', 'Sentiment Analysis & Tone Matching',
      'Custom Action Calling (Check Order Status, Book Meeting)'
    ],
    addons: [
      'WhatsApp Business API AI Agent', 'Zendesk / Freshdesk / Intercom Integration',
      'Multi-language Translation on the Fly', 'Custom Fine-Tuned Domain Model',
      'Weekly Query Insights & Gap Analysis'
    ]
  },

  'Automated Business Workflows (n8n / Make)': {
    icon: '⚡',
    pages: [
      'Workflow Architecture Map', 'Trigger & Webhook Ingestion Point',
      'Error Handling & Dead Letter Queue Dashboard', 'Execution Log & Health Monitor'
    ],
    features: [
      'CRM ↔ ERP Bi-directional Sync', 'Automated Lead Qualification & Enrichment',
      'Instant WhatsApp & Email Follow-up Trigger', 'Automated Invoice Generation & Dispatch',
      'Scheduled Database Reconciliation Jobs'
    ],
    addons: [
      'Self-hosted n8n Server Setup & SSL', 'Custom Python / JavaScript Webhook Parsers',
      'High-Availability Failover & Retry Policies', 'Slack Channel Alerting on Failure'
    ]
  },

  'Document AI & OCR Processing': {
    icon: '📄',
    pages: [
      'Document Drag-and-Drop Portal', 'Extracted Data Review & Approval Screen',
      'Batch Uploads History', 'Export to Accounting / DB Console'
    ],
    features: [
      'Automated Invoice / Receipt Line Item Extraction', 'Contract & ID Card Data Parsing',
      'Validation Rules & Confidence Scoring', 'Direct Supabase / Database Ingestion'
    ],
    addons: [
      'Custom OCR Model Training for Proprietary Forms', 'GDPR / PII Data Redaction on Ingestion',
      'Cloud Storage Archival with SHA-256 Checksums'
    ]
  }
};

/**
 * Calculates default pricing tags based on group and complexity
 */
export interface DefaultModulePrices {
  usd: number;
  inr: number;
}

export function getDefaultModulePrices(group: 'Pages' | 'Features' | 'Add-ons'): DefaultModulePrices {
  switch (group) {
    case 'Pages': return { usd: 120, inr: 5000 };
    case 'Features': return { usd: 280, inr: 12000 };
    case 'Add-ons': return { usd: 450, inr: 22000 };
    default: return { usd: 200, inr: 8000 };
  }
}

export function getDefaultPrice(group: 'Pages' | 'Features' | 'Add-ons', currency: 'USD' | 'INR' | 'BOTH'): number {
  const p = getDefaultModulePrices(group);
  if (currency === 'INR') return p.inr;
  return p.usd;
}

export function getDefaultPriceFormatted(group: 'Pages' | 'Features' | 'Add-ons', currency: 'USD' | 'INR' | 'BOTH'): string {
  const p = getDefaultModulePrices(group);
  if (currency === 'USD') {
    return `$${p.usd.toLocaleString('en-US')}`;
  } else if (currency === 'INR') {
    return `₹${p.inr.toLocaleString('en-IN')}`;
  } else {
    return `₹${p.inr.toLocaleString('en-IN')} / $${p.usd.toLocaleString('en-US')}`;
  }
}

