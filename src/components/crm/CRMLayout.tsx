import { type ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  CheckSquare,
  Calendar,
  FileText,
  Briefcase,
  BarChart3,
  Settings,
  Menu,
  X,
  Search,
  Bell,
  Home
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: "Dashboard", href: "/crm", icon: LayoutDashboard },
  { label: "Leads", href: "/crm/leads", icon: Users },
  { label: "Pipeline", href: "/crm/pipeline", icon: TrendingUp },
  { label: "Tasks", href: "/crm/tasks", icon: CheckSquare },
  { label: "Calendar", href: "/crm/calendar", icon: Calendar },
  { label: "Notes", href: "/crm/notes", icon: FileText },
  { label: "Projects", href: "/crm/projects", icon: Briefcase },
  { label: "Reports", href: "/crm/reports", icon: BarChart3 },
  { label: "Settings", href: "/crm/settings", icon: Settings },
];

export default function CRMLayout({ children }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on navigation on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  return (
    <div className="crm-root h-screen flex overflow-hidden relative">
      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          isMobile 
            ? `fixed inset-y-0 left-0 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `${sidebarOpen ? "w-64" : "w-20"}`
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col h-full`}
      >
        {/* Logo Section - TIGHT & CLEAN */}
        <div className="px-5 py-6 flex items-center justify-between">
          <div className={`flex items-center gap-2.5 ${!sidebarOpen && !isMobile && "justify-center w-full"}`}>
            <img 
              src="/ooma-icon.png" 
              alt="Ooma Logo" 
              className="w-12 h-12 object-contain rounded-full mix-blend-screen contrast-[1.2] brightness-125 transition-all hover:scale-110" 
            />
            {(sidebarOpen || isMobile) && (
              <div className="flex flex-col">
                <span className="text-xl font-black text-white tracking-tighter leading-none uppercase">OOMA</span>
                <span className="text-[11px] font-black text-cyan-400 tracking-[0.25em] uppercase mt-1.5 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">CRM ENGINE</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-sidebar-accent/10 rounded-xl transition-colors text-muted-foreground"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || (item.href === "/crm" && location.pathname === "/crm/");
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/10"
                } ${!sidebarOpen && !isMobile && "justify-center"}`}
              >
                <Icon size={20} className={`flex-shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                {(sidebarOpen || isMobile) && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
              </Link>
            );
          })}

          {/* Mobile Only Exit Button */}
          {isMobile && (
            <div className="pt-4 mt-4 border-t border-sidebar-border/50">
              <Link
                to="/"
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600/20 transition-all border border-red-500/20"
              >
                <Home size={20} className="flex-shrink-0" />
                <span className="text-sm font-black tracking-tight">Exit CRM</span>
              </Link>
            </div>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
          <div className={`flex items-center gap-3 ${!sidebarOpen && !isMobile && "justify-center"}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-sidebar-border shadow-md">
              <span className="text-white font-black text-xs">OA</span>
            </div>
            {(sidebarOpen || isMobile) && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-foreground truncate tracking-tight">OomaLabs Admin</span>
                <span className="text-[10px] text-muted-foreground truncate font-medium">admin@oomalabs.com</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-card border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between z-30">
          <div className="flex items-center gap-4 flex-1">
            {isMobile && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 hover:bg-background rounded-xl text-muted-foreground transition-colors"
              >
                <Menu size={24} />
              </button>
            )}
            <div className="relative flex-1 max-w-md group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
              <input
                type="search"
                placeholder="Search anything..."
                className="w-full pl-10 pr-4 py-2 bg-background/50 border border-input rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <button className="p-2.5 hover:bg-background rounded-xl transition-colors text-muted-foreground relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-card" />
            </button>
            <Link 
              to="/"
              className="hidden sm:flex px-4 py-2 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 active:scale-95 items-center"
            >
              <Home size={18} className="mr-2" />
              Exit CRM
            </Link>
            {/* Mobile Only Search/Plus */}
            <button className="sm:hidden p-2.5 hover:bg-background rounded-xl text-muted-foreground">
              <Search size={20} />
            </button>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative bg-background flex flex-col">
          {!location.pathname.includes('/pipeline') && (
            <div className="h-6 lg:h-8 w-full flex-shrink-0 block clear-both" id="crm-layout-spacer" />
          )}
          
          <div className={location.pathname.includes('/pipeline') ? "flex-1 flex flex-col w-full h-full" : "px-6 lg:px-12 pb-20 max-w-7xl mx-auto w-full"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
