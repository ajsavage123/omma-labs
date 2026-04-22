import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Plus } from "lucide-react";
import { useState } from "react";

const teamMembers = [
  { id: 1, name: "OomaLabs Admin", role: "Admin", avatar: "OA", color: "bg-blue-500" },
  { id: 2, name: "Priya Singh", role: "Sales", avatar: "PS", color: "bg-purple-500" },
  { id: 3, name: "Rahul Verma", role: "Sales", avatar: "RV", color: "bg-green-500" },
  { id: 4, name: "Ananya Patel", role: "Operations", avatar: "AP", color: "bg-orange-500" },
];

export default function Settings() {
  const [profileName, setProfileName] = useState("OomaLabs Admin");
  const [profileEmail, setProfileEmail] = useState("admin@oomalabs.com");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your CRM preferences</p>
      </div>

      {/* Profile Section */}
      <Card className="bg-card border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Profile</h2>
        <p className="text-sm text-muted-foreground mb-4">Your personal account settings</p>

        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">OA</span>
            </div>
            <Button className="bg-background text-foreground border border-input hover:bg-background/80">
              Change Avatar
            </Button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input
                type="text"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Save Profile</Button>
        </div>
      </Card>

      {/* Team Members Section */}
      <Card className="bg-card border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
            <p className="text-sm text-muted-foreground">Manage who has access to the CRM</p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus size={18} className="mr-2" />
            Invite Member
          </Button>
        </div>

        <div className="space-y-3">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-background/80 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${member.color} flex items-center justify-center text-white font-bold text-sm`}>
                  {member.avatar}
                </div>
                <div>
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                </div>
              </div>
              <Button className="bg-background text-foreground border border-input hover:bg-background/80">
                <Edit2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Automations Section */}
      <Card className="bg-card border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Automations</h2>
        <p className="text-sm text-muted-foreground mb-4">Configure automatic actions within the CRM</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-background rounded-lg">
            <div>
              <p className="font-medium text-foreground">Auto-assign leads</p>
              <p className="text-xs text-muted-foreground">Automatically assign new leads to team members</p>
            </div>
            <button className="w-12 h-6 bg-gray-600 rounded-full transition-colors hover:bg-gray-500" />
          </div>

          <div className="flex items-center justify-between p-4 bg-background rounded-lg">
            <div>
              <p className="font-medium text-foreground">Email notifications</p>
              <p className="text-xs text-muted-foreground">Send email updates for important events</p>
            </div>
            <button className="w-12 h-6 bg-primary rounded-full transition-colors hover:bg-primary/90" />
          </div>
        </div>
      </Card>
    </div>
  );
}
