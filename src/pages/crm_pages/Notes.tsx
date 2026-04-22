import { Card } from "@/components/ui/card";

const notes = [
  {
    id: 1,
    content: "They specifically mentioned competitor XYZ's dashboard as their benchmark. We should show them our custom reporting module.",
    company: "TechNova Pvt Ltd",
    author: "OomaLabs Admin",
    date: "Apr 21",
  },
];

export default function Notes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Notes</h1>
        <p className="text-muted-foreground">All notes attached to leads</p>
      </div>

      <div className="space-y-4">
        {notes.map((note) => (
          <Card key={note.id} className="bg-card border-border p-6">
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-foreground leading-relaxed">{note.content}</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-foreground">{note.company}</p>
                <p className="text-muted-foreground">{note.author}</p>
              </div>
              <p className="text-muted-foreground">{note.date}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
