import { type ReactNode, useState, useEffect, useRef } from "react";
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
  Home,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { notificationService } from "@/utils/notificationService";

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
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user?.workspace_id) return;

    const fetchPendingTasks = async () => {
      const { data } = await supabase
        .from('crm_tasks')
        .select('*, crm_leads(company_name)')
        .eq('workspace_id', user.workspace_id)
        .eq('status', 'Pending')
        .order('due_date', { ascending: true });
      
      if (data) setTasks(data);
    };

    fetchPendingTasks();
    notificationService.requestPermission(); // Request native push on mount

    const channel = supabase
      .channel('layout_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_tasks',
          filter: `workspace_id=eq.${user.workspace_id}`
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          if (eventType === 'INSERT' && newRecord.status === 'Pending') {
            setTasks(prev => {
              const updated = [...prev, newRecord].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
              // Trigger native push when a new task is assigned/created
              notificationService.showNotification(`New Task: ${newRecord.title}`, {
                body: `Due: ${newRecord.due_date}`,
                tag: newRecord.id
              });
              return updated;
            });
          } else if (eventType === 'UPDATE') {
            if (newRecord.status !== 'Pending') {
              setTasks(prev => prev.filter(t => t.id !== newRecord.id));
            } else {
              setTasks(prev => {
                const exists = prev.some(t => t.id === newRecord.id);
                const updated = exists 
                  ? prev.map(t => t.id === newRecord.id ? { ...t, ...newRecord } : t)
                  : [...prev, newRecord];
                return updated.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
              });
            }
          } else if (eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== oldRecord.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.workspace_id]);

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
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`p-2.5 rounded-xl transition-colors relative ${notificationsOpen ? 'bg-primary/10 text-primary' : 'hover:bg-background text-muted-foreground'}`}
              >
                <Bell size={20} />
                {tasks.length > 0 && !notificationsOpen && (
                  <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-card"></span>
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden z-50 flex flex-col max-h-[85vh]">
                  <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between sticky top-0">
                    <h3 className="font-black text-sm text-foreground uppercase tracking-wider">Notifications</h3>
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{tasks.length} Pending</span>
                  </div>
                  
                  <div className="overflow-y-auto custom-scrollbar flex-1">
                    {tasks.length === 0 ? (
                      <div className="px-4 py-8 text-center flex flex-col items-center gap-2">
                        <CheckCircle2 size={32} className="text-muted-foreground/30" />
                        <p className="text-sm font-medium text-muted-foreground">You're all caught up!</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {tasks
                          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                          .slice(0, 5)
                          .map((task) => (
                          <Link 
                            key={task.id} 
                            to="/crm/tasks"
                            onClick={() => setNotificationsOpen(false)}
                            className="p-4 hover:bg-muted/50 transition-colors flex items-start gap-3 group"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors">
                              <Bell size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{task.title}</p>
                              {task.crm_leads && (
                                <p className="text-xs text-muted-foreground truncate font-medium mt-0.5">{task.crm_leads.company_name}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`text-[9px] flex-shrink-0 font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                  task.priority === 'High' ? 'text-red-500 border-red-500/30 bg-red-500/10' : 
                                  task.priority === 'Low' ? 'text-green-500 border-green-500/30 bg-green-500/10' : 
                                  'text-amber-500 border-amber-500/30 bg-amber-500/10'
                                }`}>
                                  {task.priority || 'Medium'}
                                </span>
                                <span className="text-[10px] font-bold text-primary truncate">
                                  Due: {task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date'} 
                                  {task.due_time ? ` @ ${task.due_time.substring(0, 5)}` : ''}
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {tasks.length > 0 && (
                    <div className="p-2 border-t border-border bg-card sticky bottom-0">
                      <Link 
                        to="/crm/tasks"
                        onClick={() => setNotificationsOpen(false)}
                        className="block w-full py-2 text-center text-xs font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        View All Tasks
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
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
