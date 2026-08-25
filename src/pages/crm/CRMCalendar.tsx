import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Link2, LogOut, HelpCircle, Loader2, RefreshCw } from "lucide-react";
import { useCRMData } from "@/contexts/CRMDataContext";
import { googleCalendarService, type LinkedAccount } from "@/services/googleCalendarService";
import { useToast } from "@/hooks/useToast";


const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

export default function CRMCalendar() {
  const { tasks, loading, teamMembers, selectedSalesRepId, crmViewMode } = useCRMData();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());

  const activeRep = (teamMembers || []).find(m => m.id === selectedSalesRepId);
  const filterLabel = crmViewMode === 'mine' ? 'My Calendar' : 
    selectedSalesRepId === 'all' ? 'All Team Calendar' : 
    activeRep ? `${activeRep.full_name || activeRep.username}` : 'Team Calendar';

  // Google Calendar Integration states
  const [clientId, setClientId] = useState(googleCalendarService.getClientId());
  const [editingClientId, setEditingClientId] = useState(!googleCalendarService.getClientId());
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [connectingAccount, setConnectingAccount] = useState(false);

  useEffect(() => {
    setLinkedAccounts(googleCalendarService.getLinkedAccounts());
  }, []);

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const days = [];
  const firstDay = firstDayOfMonth(currentDate);
  const daysCount = daysInMonth(currentDate);

  // Previous month days
  const prevMonthDays = daysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i) });
  }

  // Current month days
  for (let i = 1; i <= daysCount; i++) {
    days.push({ day: i, isCurrentMonth: true, date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i) });
  }

  // Next month days
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({ day: i, isCurrentMonth: false, date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i) });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getTasksForDate = (day: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
    return tasks.filter(t => new Date(t.due_date).toDateString() === dateStr);
  };

  const selectedDateTasks = tasks.filter(t => {
    const d = new Date(t.due_date);
    return d.getDate() === selectedDate && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  });

  const saveClientId = () => {
    if (!clientId.trim()) {
      toast.error("Please enter a valid Client ID");
      return;
    }
    googleCalendarService.setClientId(clientId.trim());
    setEditingClientId(false);
    toast.success("Google Client ID saved");
  };

  const connectAccount = async () => {
    const savedId = googleCalendarService.getClientId();
    if (!savedId) {
      toast.error("Please configure your Google Client ID first.");
      return;
    }

    setConnectingAccount(true);
    await googleCalendarService.addAccount(
      savedId,
      (newAcc) => {
        setLinkedAccounts(googleCalendarService.getLinkedAccounts());
        toast.success(`Google Account connected: ${newAcc.email}`);
        setConnectingAccount(false);
      },
      (err) => {
        console.error(err);
        toast.error("Failed to connect Google Account. Verify your Client ID and configuration.");
        setConnectingAccount(false);
      }
    );
  };

  const disconnectAccount = (email: string) => {
    googleCalendarService.disconnectAccount(email);
    setLinkedAccounts(googleCalendarService.getLinkedAccounts());
    toast.success(`Disconnected account: ${email}`);
  };

  const syncAllTasks = async (accountEmail: string) => {
    setSyncingAll(true);
    try {
      toast.success("Synchronizing tasks...");
      let successCount = 0;
      for (const task of tasks) {
        try {
          await googleCalendarService.syncTask(task, accountEmail);
          successCount++;
        } catch (e) {
          console.error(`Failed to sync task: ${task.title}`, e);
        }
      }
      toast.success(`Synced ${successCount} tasks successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed bulk sync");
    } finally {
      setSyncingAll(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-4 lg:space-y-6">
      
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl lg:text-3xl font-black text-foreground mb-1 tracking-tight">Calendar</h1>
          <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black rounded-full uppercase tracking-wider">
            {filterLabel}
          </span>
        </div>
        <p className="text-sm text-muted-foreground font-medium">View scheduled tasks and follow-ups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="bg-card border-border p-4 lg:p-6 lg:col-span-2 rounded-2xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-foreground tracking-tight">{monthName}</h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-background rounded-xl transition-colors text-foreground"
                title="Previous month"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-background rounded-xl transition-colors text-foreground"
                title="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-4">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
              <div key={`${day}-${idx}`} className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 lg:gap-2">
            {days.map((dayObj, idx) => {
              const isSelected = dayObj.isCurrentMonth && dayObj.day === selectedDate;
              const dateTasks = getTasksForDate(dayObj.day, dayObj.isCurrentMonth);
              const hasTask = dateTasks.length > 0;
              const isToday = dayObj.isCurrentMonth && dayObj.day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();

              return (
                <button
                  key={idx}
                  onClick={() => dayObj.isCurrentMonth && setSelectedDate(dayObj.day)}
                  className={`p-1 rounded-xl text-xs lg:text-sm font-bold transition-all relative h-10 lg:h-14 flex items-center justify-center ${
                    !dayObj.isCurrentMonth
                      ? "text-muted-foreground opacity-20 cursor-default"
                      : isSelected
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : isToday
                      ? "bg-primary/10 text-primary border-2 border-primary/50"
                      : hasTask
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      : "text-foreground hover:bg-background border border-transparent"
                  }`}
                >
                  {dayObj.day}
                  {hasTask && !isSelected && <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full" />}
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          {/* Tasks for Selected Date */}
          <Card className="bg-card border-border p-6 rounded-2xl shadow-xl h-fit">
            <h3 className="font-semibold text-foreground mb-4">
              {new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </h3>

            <div className="space-y-3">
              {selectedDateTasks.length > 0 ? (
                selectedDateTasks.map((task, idx) => (
                  <div key={idx} className="flex flex-col p-3 bg-background rounded-lg gap-2">
                    <div className="flex gap-3 items-start">
                      <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-2" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm">{task.title}</p>
                        {task.crm_leads && (
                          <p className="text-xs text-muted-foreground mt-1">For: {task.crm_leads.contact_person} ({task.crm_leads.company_name})</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-border/10 flex-wrap justify-end">
                      <a 
                        href={googleCalendarService.generateGoogleCalendarLink(task)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white rounded text-[9px] font-black uppercase tracking-wider transition-all shadow-sm"
                        title="Add to Google Calendar directly (No API keys required)"
                      >
                        Add to Cal
                      </a>
                      <a 
                        href={googleCalendarService.generateGmailComposeLink(
                          task,
                          task.crm_leads?.email || '',
                          googleCalendarService.generateGoogleCalendarLink(task)
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded text-[9px] font-black uppercase tracking-wider transition-all shadow-sm"
                        title="Compose prefilled Gmail invitation to send"
                      >
                        Gmail Invite
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No tasks on this date</p>
              )}
            </div>
          </Card>

          {/* Google Calendar Configuration */}
          <Card className="bg-card border-border p-6 rounded-2xl shadow-xl h-fit space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="text-primary h-5 w-5" />
                <h3 className="font-bold text-foreground text-sm tracking-tight">Google Calendar Sync</h3>
              </div>
              <button 
                onClick={() => setShowInstructions(!showInstructions)} 
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                title="Google Setup Guide"
              >
                <HelpCircle size={18} />
              </button>
            </div>

            {/* Instruction Panel */}
            {showInstructions && (
              <div className="p-3.5 bg-background border border-border rounded-xl text-xs space-y-2 leading-relaxed text-muted-foreground">
                <p className="font-bold text-foreground">How to generate a Client ID:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" className="text-primary hover:underline font-semibold">Google Cloud Console</a>.</li>
                  <li>Create a Project and enable the **Google Calendar API**.</li>
                  <li>Create credentials under **OAuth Client ID** (select **Web Application**).</li>
                  <li>Add <code className="bg-muted px-1.5 py-0.5 rounded font-mono">http://localhost:5173</code> to **Authorized JavaScript Origins**.</li>
                  <li>Paste the generated Client ID in the field below.</li>
                </ol>
              </div>
            )}

            {/* Client ID Configuration Form */}
            {editingClientId ? (
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Google OAuth Client ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    placeholder="Enter Client ID from Google Console"
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary"
                  />
                  <button onClick={saveClientId} className="px-3 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-xl transition-colors">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center bg-background border border-border p-3 rounded-xl">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase">OAuth Client ID</span>
                  <span className="text-xs text-foreground font-mono truncate block">{googleCalendarService.getClientId()}</span>
                </div>
                <button 
                  onClick={() => setEditingClientId(true)} 
                  className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-[10px] font-bold text-foreground rounded-lg transition-colors border"
                >
                  Edit
                </button>
              </div>
            )}

            {/* Account List and Auth Actions */}
            {!editingClientId && (
              <div className="space-y-4 pt-2">
                <button
                  onClick={connectAccount}
                  disabled={connectingAccount}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-xl transition-colors shadow shadow-primary/10 disabled:opacity-50"
                >
                  {connectingAccount ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Link2 size={16} />
                  )}
                  Link Google Account
                </button>

                {linkedAccounts.length > 0 ? (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Connected Accounts</label>
                    <div className="space-y-2">
                      {linkedAccounts.map((account, idx) => {
                        const isExpired = Date.now() > account.expiresAt;
                        return (
                          <div key={idx} className="bg-background border border-border p-3 rounded-xl space-y-2">
                            <div className="flex justify-between items-center gap-2">
                              <div className="min-w-0 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isExpired ? 'bg-destructive animate-pulse' : 'bg-emerald-500'}`} />
                                <div className="truncate">
                                  <span className="text-xs font-bold text-foreground block truncate">{account.name}</span>
                                  <span className="text-[10px] text-muted-foreground block truncate">{account.email}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => disconnectAccount(account.email)}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-colors"
                                title="Disconnect account"
                              >
                                <LogOut size={14} />
                              </button>
                            </div>
                            
                            {!isExpired && (
                              <button
                                onClick={() => syncAllTasks(account.email)}
                                disabled={syncingAll}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-muted hover:bg-muted/80 text-[10px] font-bold text-foreground rounded-lg transition-colors border"
                              >
                                {syncingAll ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <RefreshCw size={12} />
                                )}
                                Sync All CRM Tasks
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground text-center py-2">No Google Accounts linked yet</p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
