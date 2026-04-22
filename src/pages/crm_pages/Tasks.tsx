import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Phone, Mail } from "lucide-react";
import { useState } from "react";

const allTasks = [
  {
    id: "T-1",
    title: "Follow up with Vikram",
    type: "Call",
    date: "Apr 22, 2026",
    lead: "Vikram Sharma",
    company: "Vikram Enterprises",
    assignee: "Priya Singh",
    status: "today",
  },
  {
    id: "T-2",
    title: "Send draft contract to Meera",
    type: "Email",
    date: "Apr 22, 2026",
    lead: "Meera Das",
    company: "PixelCraft",
    assignee: "Rahul Verma",
    status: "today",
  },
  {
    id: "T-3",
    title: "Schedule meeting with Arjun",
    type: "Call",
    date: "Apr 25, 2026",
    lead: "Arjun Reddy",
    company: "TechNova Pvt Ltd",
    assignee: "OomaLabs Admin",
    status: "upcoming",
  },
  {
    id: "T-4",
    title: "Call Pooja regarding budget",
    type: "Call",
    date: "Apr 20, 2026",
    lead: "Pooja Joshi",
    company: "GreenTech",
    assignee: "Priya Singh",
    status: "overdue",
  },
];

const tabs = [
  { id: "today", label: "Today", count: 2 },
  { id: "upcoming", label: "Upcoming", count: 2 },
  { id: "overdue", label: "Overdue", count: 1 },
  { id: "completed", label: "Done", count: 0 },
];

export default function Tasks() {
  const [activeTab, setActiveTab] = useState("today");
  const [checkedTasks, setCheckedTasks] = useState<string[]>([]);

  const filteredTasks = allTasks.filter((task) => {
    if (activeTab === "completed") return false;
    return task.status === activeTab;
  });

  const toggleTask = (id: string) => {
    setCheckedTasks((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Tasks</h1>
          <p className="text-muted-foreground">Manage your follow-ups and to-dos</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={18} className="mr-2" />
          Add Task
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label} <span className="ml-2 text-xs bg-background px-2 py-1 rounded">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="bg-card border-border p-4 hover:bg-background/50 transition-colors">
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <button
                onClick={() => toggleTask(task.id)}
                className="mt-1 flex-shrink-0"
              >
                {checkedTasks.includes(task.id) ? (
                  <CheckCircle2 size={20} className="text-primary" />
                ) : (
                  <div className="w-5 h-5 border-2 border-muted-foreground rounded-full hover:border-primary transition-colors" />
                )}
              </button>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`font-medium ${checkedTasks.includes(task.id) ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {task.type === "Call" ? <Phone size={14} /> : <Mail size={14} />}
                        {task.type}
                      </div>
                      <span>{task.date}</span>
                      <span>•</span>
                      <span>{task.lead}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {task.status === "overdue" && (
                    <div className="px-3 py-1 bg-red-500/20 text-red-500 text-xs font-medium rounded-full flex-shrink-0">
                      Overdue
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tasks in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
