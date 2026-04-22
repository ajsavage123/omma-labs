import { Card } from "@/components/ui/card";

const projects = [
  {
    id: 1,
    name: "ABC Pvt Ltd Onboarding",
    status: "Partial",
    stage: "Setup",
    dueDate: "Apr 29",
    tasksCompleted: 1,
    tasksTotal: 2,
    owners: ["PR", "AN"],
  },
  {
    id: 2,
    name: "Sun Media Onboarding",
    status: "Pending",
    stage: "Intake",
    dueDate: "May 22",
    tasksCompleted: 0,
    tasksTotal: 1,
    owners: ["AN"],
  },
];

const statusColors: Record<string, string> = {
  Partial: "bg-amber-500",
  Pending: "bg-gray-500",
  Completed: "bg-green-500",
};

const ownerColors: Record<string, string> = {
  PR: "bg-purple-500",
  AN: "bg-orange-500",
};

export default function Projects() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Onboarding Projects</h1>
        <p className="text-muted-foreground">Active client onboarding workflows</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="bg-card border-border p-6 border-2 border-dashed">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground text-lg">{project.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded text-xs font-medium text-white ${statusColors[project.status]}`}>
                    {project.status}
                  </span>
                  <span className="text-sm text-muted-foreground">Stage: {project.stage}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <span className="text-sm font-medium text-foreground">
                    {project.tasksCompleted} / {project.tasksTotal} tasks
                  </span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(project.tasksCompleted / project.tasksTotal) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {project.owners.map((owner) => (
                    <div
                      key={owner}
                      className={`w-8 h-8 rounded-full ${ownerColors[owner]} flex items-center justify-center text-xs font-bold text-white border-2 border-card`}
                    >
                      {owner}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">Due: {project.dueDate}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
