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
  CheckCircle2,
  Volume2,
  VolumeX
} from "lucide-react";
import { notificationService } from "@/utils/notificationService";
import { OomaLogo } from "@/components/OomaLogo";
import { useCRMData } from "@/contexts/CRMDataContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getTaskDueDate } from "@/utils/dateUtils";

interface LayoutProps {
  children: ReactNode;
}

interface CRMTask {
  id: string;
  title: string;
  due_date: string;
  status: string;
  created_at?: string;
  crm_leads?: {
    company_name: string;
  } | null;
  [key: string]: any;
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/crm", icon: LayoutDashboard },
  { label: "Leads", href: "/crm/leads", icon: Users },
  { label: "Pipeline", href: "/crm/pipeline", icon: TrendingUp },
  { label: "Tasks", href: "/crm/tasks", icon: CheckSquare },
  { label: "Calendar", href: "/crm/calendar", icon: Calendar },
  { label: "Notes", href: "/crm/notes", icon: FileText },
  { label: "Projects", href: "/crm/projects", icon: Briefcase },
  { label: "Reports", href: "/crm/reports", icon: BarChart3, adminOnly: true },
  { label: "Settings", href: "/crm/settings", icon: Settings },
];

export default function CRMLayout({ children }: LayoutProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { tasks: globalTasks, refreshTasks, crmViewMode, setCrmViewMode, teamMembers, selectedSalesRepId, setSelectedSalesRepId } = useCRMData();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('crm_notifications_muted') === 'true');
  const [bellRinging, setBellRinging] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Filter tasks to show ONLY the current user's PENDING tasks that are currently DUE or OVERDUE.
  // IMPORTANT: Always scoped to user?.id regardless of crmViewMode (Team vs My CRM).
  // This prevents admins from accidentally clearing other people's tasks via "Clear All".
  const tasks = globalTasks
    .filter((t: any) => {
      if (t.assigned_to !== user?.id) return false; // strict user scope
      if (t.status !== 'Pending') return false;
      const dueDate = getTaskDueDate(t.due_date, t.due_time);
      if (!dueDate) return false;
      return dueDate.getTime() <= now.getTime();
    })
    .sort((a: any, b: any) => {
      const dateA = getTaskDueDate(a.due_date, a.due_time)?.getTime() || 0;
      const dateB = getTaskDueDate(b.due_date, b.due_time)?.getTime() || 0;
      return dateB - dateA;
    });

  useEffect(() => {
    const handleTaskDue = () => {
      setBellRinging(true);
      const timer = setTimeout(() => setBellRinging(false), 800);
      return () => clearTimeout(timer);
    };

    window.addEventListener('crm-task-due', handleTaskDue);
    return () => window.removeEventListener('crm-task-due', handleTaskDue);
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newVal = !isMuted;
    setIsMuted(newVal);
    localStorage.setItem('crm_notifications_muted', String(newVal));
    if (newVal) {
      toast.success("Notification sounds muted");
    } else {
      toast.success("Notification sounds unmuted");
    }
  };

  const handleMarkCompleted = async (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('crm_tasks')
        .update({ status: 'Completed' })
        .eq('id', taskId);
      
      if (error) throw error;
      
      toast.success("Task completed");
      refreshTasks();
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete task");
    }
  };

  const handleMarkAllCompleted = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (tasks.length === 0) return;
    try {
      const taskIds = tasks.map((t: any) => t.id);
      const { error } = await supabase
        .from('crm_tasks')
        .update({ status: 'Completed' })
        .in('id', taskIds);
      
      if (error) throw error;
      
      toast.success("All tasks marked as completed");
      refreshTasks();
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete all tasks");
    }
  };

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
    notificationService.requestPermission(); // Request native push on mount once
  }, []);


  return (
    <div className="crm-root fixed inset-0 w-screen h-screen h-[100dvh] max-h-[100dvh] flex overflow-hidden bg-background">
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
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col h-full shrink-0`}
      >
        {/* Logo Section - TIGHT & CLEAN */}
        <div className="px-5 py-6 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${!sidebarOpen && !isMobile && "justify-center w-full"}`}>
            {/* Original OomaLogo - the ¾ arc mark */}
            <OomaLogo size={32} className="hover:scale-105 transition-transform" />
            {(sidebarOpen || isMobile) && (
              <div className="flex flex-col">
                <span className="text-md font-bold tracking-tight text-white uppercase">OOMA</span>
                <span className="text-[9px] font-extrabold text-purple-400 tracking-[0.2em] uppercase mt-0.5">CRM ENGINE</span>
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
          {navItems
            .filter(item => !item.adminOnly || isAdmin)
            .map((item) => {
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

      {/* Main Content Area - Native Mobile App Fixed Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full max-h-full bg-background relative overflow-hidden">
        {/* Top Navigation Bar - Responsive Sticky Header */}
        <header className="bg-card border-b border-border px-3 sm:px-6 py-2 sm:py-3 z-30 shrink-0 sticky top-0 shadow-sm">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: Menu & Title/Search */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {isMobile && (
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 -ml-1 hover:bg-background rounded-xl text-muted-foreground transition-colors shrink-0"
                  aria-label="Toggle menu"
                >
                  <Menu size={20} />
                </button>
              )}
              <div className="relative flex-1 max-w-md group hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
                <input
                  type="search"
                  placeholder="Search anything..."
                  className="w-full pl-9 pr-4 py-1.5 bg-background/50 border border-input rounded-xl text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              {/* Mobile Header Title */}
              {isMobile && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <OomaLogo size={20} />
                  <span className="text-xs font-bold text-foreground tracking-tight uppercase">CRM ENGINE</span>
                </div>
              )}
            </div>

            {/* Right Actions: Admin Filter (Desktop) + Bell + Exit */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Desktop Global Salesperson Control */}
              {isAdmin && (
                <div className="hidden sm:flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
                  <button
                    onClick={() => setCrmViewMode('mine')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      crmViewMode === 'mine' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Filter to My CRM data"
                  >
                    My CRM
                  </button>
                  <button
                    onClick={() => setCrmViewMode('team')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      crmViewMode === 'team' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Filter to Team CRM data"
                  >
                    Team CRM
                  </button>

                  {crmViewMode === 'team' && (
                    <div className="ml-1 border-l border-border/60 pl-1.5 flex items-center gap-1">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider hidden md:inline">Rep:</span>
                      <select
                        value={selectedSalesRepId}
                        onChange={(e) => setSelectedSalesRepId(e.target.value)}
                        className="text-xs font-bold text-foreground bg-background border border-input rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer max-w-[160px] truncate shadow-sm"
                        title="Select Sales Representative"
                      >
                        <option value="all" className="bg-background text-foreground dark:bg-slate-900 dark:text-white font-bold">
                          All Team Members
                        </option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.id} className="bg-background text-foreground dark:bg-slate-900 dark:text-white font-bold">
                            {m.full_name || m.username} {m.id === user?.id ? '(Me)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`p-2 sm:p-2.5 rounded-xl transition-all duration-300 relative bell-btn ${notificationsOpen ? 'bg-primary/20 text-primary scale-105 shadow-inner' : 'hover:bg-background text-muted-foreground'}`}
                aria-label="Notifications"
              >
                <Bell size={18} className={`bell-icon transition-transform ${bellRinging ? 'bell-ringing text-primary' : tasks.length > 0 ? 'bell-oscillating text-primary' : ''}`} />
                {tasks.length > 0 && !notificationsOpen && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center bg-red-500 text-white font-black text-[9px] w-4 h-4 rounded-full border-2 border-card shadow-md animate-pulse">
                    {tasks.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-3 w-[290px] sm:w-96 bg-card/95 backdrop-blur-md border border-border/80 shadow-[0_10px_50px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden z-[100] flex flex-col max-h-[85vh] transition-all duration-300 animate-in">
                  <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between sticky top-0">
                    <h3 className="font-black text-sm text-foreground uppercase tracking-wider">Notifications</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleMute}
                        className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                        title={isMuted ? "Unmute sounds" : "Mute sounds"}
                      >
                        {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                      </button>
                      {tasks.length > 0 && (
                        <button
                          onClick={handleMarkAllCompleted}
                          className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
                        >
                          Clear All
                        </button>
                      )}
                      <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">{tasks.length} Pending</span>
                    </div>
                  </div>
                  
                  <div className="overflow-y-auto custom-scrollbar flex-1">
                    {tasks.length === 0 ? (
                      <div className="px-4 py-8 text-center flex flex-col items-center gap-2">
                        <CheckCircle2 size={32} className="text-muted-foreground/30" />
                        <p className="text-sm font-medium text-muted-foreground">You're all caught up!</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/30">
                        {tasks
                          .sort((a: CRMTask, b: CRMTask) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                          .slice(0, 5)
                          .map((task: CRMTask) => (
                          <Link 
                            key={task.id} 
                            to="/crm/tasks"
                            onClick={() => setNotificationsOpen(false)}
                            className="p-4 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all flex items-start gap-3 group border-l-2 border-transparent hover:border-primary"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-all duration-200">
                              <Bell size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{task.title}</p>
                                <button
                                  onClick={(e) => handleMarkCompleted(e, task.id)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all duration-200"
                                  title="Mark as completed"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                              </div>
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
          </div>
        </div>

          {/* Mobile Dedicated Filter Sub-Bar (When Admin) */}
          {isAdmin && (
            <div className="sm:hidden mt-2 pt-2 border-t border-border/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 shrink-0">
                <button
                  onClick={() => setCrmViewMode('mine')}
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all ${
                    crmViewMode === 'mine' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  My CRM
                </button>
                <button
                  onClick={() => setCrmViewMode('team')}
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-all ${
                    crmViewMode === 'team' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Team CRM
                </button>
              </div>

              {crmViewMode === 'team' && (
                <div className="flex-1 flex items-center justify-end gap-1 min-w-0">
                  <span className="text-[9px] font-black text-muted-foreground uppercase shrink-0">Rep:</span>
                  <select
                    value={selectedSalesRepId}
                    onChange={(e) => setSelectedSalesRepId(e.target.value)}
                    className="text-[11px] font-bold text-foreground bg-background border border-input rounded-lg px-2 py-1 focus:outline-none cursor-pointer w-full max-w-[170px] truncate shadow-sm"
                  >
                    <option value="all" className="bg-background text-foreground dark:bg-slate-900 dark:text-white font-bold">
                      All Team Members
                    </option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id} className="bg-background text-foreground dark:bg-slate-900 dark:text-white font-bold">
                        {m.full_name || m.username} {m.id === user?.id ? '(Me)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Internal Scrollable Content Body - Locks viewport */}
        <main className="flex-1 min-h-0 w-full overflow-y-auto overscroll-y-contain custom-scrollbar relative bg-background flex flex-col [webkit-overflow-scrolling:touch]">
          <div className={location.pathname.includes('/pipeline') ? "flex-1 flex flex-col w-full h-full" : "px-3 sm:px-6 lg:px-12 py-3 sm:py-6 pb-6 sm:pb-8 max-w-7xl mx-auto w-full flex-1"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
