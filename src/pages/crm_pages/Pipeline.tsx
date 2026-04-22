import { Card } from "@/components/ui/card";
import { Phone, MessageCircle, Mail, MoreVertical } from "lucide-react";

const stages = [
  {
    name: "New Leads",
    count: 2,
    value: "₹2,10,000",
    color: "bg-blue-500",
    leads: [
      { name: "Vikram Sharma", company: "Vikram Enterprises", owner: "PS", value: "1,50,000" },
      { name: "Ravi Teja", company: "FutureTech", owner: "PS", value: "60,000" },
    ],
  },
  {
    name: "Contacted",
    count: 1,
    value: "₹75,000",
    color: "bg-cyan-500",
    leads: [
      { name: "Neha Gupta", company: "BlueSky Solutions", owner: "RV", value: "75,000" },
    ],
  },
  {
    name: "Interested",
    count: 1,
    value: "₹15,00,000",
    color: "bg-amber-500",
    leads: [
      { name: "Arjun Reddy", company: "TechNova Pvt Ltd", owner: "OA", value: "15,00,000" },
    ],
  },
  {
    name: "Proposal/Quotation",
    count: 1,
    value: "₹1,20,000",
    color: "bg-purple-500",
    leads: [
      { name: "Sanjay Kumar", company: "InnovateX", owner: "PS", value: "1,20,000" },
    ],
  },
  {
    name: "Negotiation",
    count: 1,
    value: "₹2,50,000",
    color: "bg-cyan-500",
    leads: [
      { name: "Meera Das", company: "PixelCraft", owner: "RV", value: "2,50,000" },
    ],
  },
  {
    name: "Won",
    count: 1,
    value: "₹50,000",
    color: "bg-green-500",
    leads: [
      { name: "Rahul Sharma", company: "ABC Pvt Ltd", owner: "PS", value: "50,000" },
    ],
  },
  {
    name: "Onboarding",
    count: 1,
    value: "₹80,000",
    color: "bg-cyan-500",
    leads: [
      { name: "Aditi Rao", company: "Sun Media", owner: "AP", value: "80,000" },
    ],
  },
  {
    name: "Completed",
    count: 1,
    value: "₹5,00,000",
    color: "bg-gray-500",
    leads: [
      { name: "Karan Desai", company: "Elite Corp", owner: "OA", value: "5,00,000" },
    ],
  },
  {
    name: "Lost",
    count: 0,
    value: "₹0",
    color: "bg-red-500",
    leads: [],
  },
];

const ownerColors: Record<string, string> = {
  PS: "bg-purple-500",
  RV: "bg-green-500",
  OA: "bg-blue-500",
  AP: "bg-orange-500",
};

export default function Pipeline() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Pipeline</h1>
        <p className="text-muted-foreground">Manage your sales pipeline</p>
      </div>

      {/* Pipeline Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {stages.map((stage) => (
            <div key={stage.name} className="flex-shrink-0 w-80">
              {/* Stage Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">{stage.name}</h3>
                  <span className="text-xs bg-background text-muted-foreground px-2 py-1 rounded">{stage.count}</span>
                </div>
                <div className="text-sm text-muted-foreground">{stage.value}</div>
              </div>

              {/* Stage Column */}
              <div className="space-y-3">
                {stage.leads.map((lead, idx) => (
                  <Card key={idx} className="bg-card border-border p-4 hover:shadow-lg transition-shadow cursor-move">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-foreground text-sm">{lead.name}</h4>
                        <p className="text-xs text-muted-foreground">{lead.company}</p>
                      </div>
                      <button className="p-1 hover:bg-background rounded">
                        <MoreVertical size={14} className="text-muted-foreground" />
                      </button>
                    </div>

                    {/* Contact Actions */}
                    <div className="flex gap-2 my-3 py-3 border-t border-b border-border">
                      <button className="p-1.5 hover:bg-background rounded transition-colors" title="Call">
                        <Phone size={14} className="text-muted-foreground" />
                      </button>
                      <button className="p-1.5 hover:bg-background rounded transition-colors" title="WhatsApp">
                        <MessageCircle size={14} className="text-muted-foreground" />
                      </button>
                      <button className="p-1.5 hover:bg-background rounded transition-colors" title="Email">
                        <Mail size={14} className="text-muted-foreground" />
                      </button>
                    </div>

                    {/* Lead Info */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-foreground">₹{lead.value}</div>
                      <div className={`w-6 h-6 rounded-full ${ownerColors[lead.owner]} flex items-center justify-center text-xs font-bold text-white`}>
                        {lead.owner}
                      </div>
                    </div>

                    {/* Create Task Button */}
                    <button className="w-full mt-3 px-3 py-2 bg-primary text-primary-foreground rounded font-medium text-sm hover:bg-primary/90 transition-colors">
                      Create Task
                    </button>
                  </Card>
                ))}

                {/* Empty State */}
                {stage.leads.length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">Drag here to mark as {stage.name}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
