import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Plus, MoreVertical } from "lucide-react";

const leads = [
  {
    id: 1,
    name: "Vikram Sharma",
    company: "Vikram Enterprises",
    email: "vikram@vikramenterprises.in",
    phone: "+91 9876543210",
    service: "E-Commerce Website",
    stage: "New Leads",
    stageColor: "bg-blue-500",
    value: "₹1,50,000",
    owner: "PS",
    ownerColor: "bg-purple-500",
  },
  {
    id: 2,
    name: "Neha Gupta",
    company: "BlueSky Solutions",
    email: "neha@bluesky.in",
    phone: "+91 9988776655",
    service: "SEO & Content",
    stage: "Contacted",
    stageColor: "bg-cyan-500",
    value: "₹75,000",
    owner: "RV",
    ownerColor: "bg-green-500",
  },
  {
    id: 3,
    name: "Arjun Reddy",
    company: "TechNova Pvt Ltd",
    email: "arjun@technova.com",
    phone: "+91 9123456789",
    service: "Custom SaaS App",
    stage: "Interested",
    stageColor: "bg-amber-500",
    value: "₹15,00,000",
    owner: "OA",
    ownerColor: "bg-blue-500",
  },
  {
    id: 4,
    name: "Sanjay Kumar",
    company: "InnovateX",
    email: "sanjay@innovatex.in",
    phone: "+91 9898989898",
    service: "Corporate Website",
    stage: "Proposal/Quotation",
    stageColor: "bg-purple-500",
    value: "₹1,20,000",
    owner: "PS",
    ownerColor: "bg-purple-500",
  },
  {
    id: 5,
    name: "Meera Das",
    company: "PixelCraft",
    email: "meera@pixelcraft.co.in",
    phone: "+91 9777777777",
    service: "Brand Identity & Web",
    stage: "Negotiation",
    stageColor: "bg-cyan-500",
    value: "₹2,50,000",
    owner: "RV",
    ownerColor: "bg-green-500",
  },
  {
    id: 6,
    name: "Rahul Sharma",
    company: "ABC Pvt Ltd",
    email: "rahul@abc.in",
    phone: "+91 9666666666",
    service: "Social Media Mgmt",
    stage: "Won",
    stageColor: "bg-green-500",
    value: "₹50,000",
    owner: "PS",
    ownerColor: "bg-purple-500",
  },
  {
    id: 7,
    name: "Aditi Rao",
    company: "Sun Media",
    email: "aditi@sunmedia.com",
    phone: "+91 9555555555",
    service: "Video Editing Retainer",
    stage: "Onboarding",
    stageColor: "bg-cyan-500",
    value: "₹80,000",
    owner: "AP",
    ownerColor: "bg-orange-500",
  },
  {
    id: 8,
    name: "Karan Desai",
    company: "Elite Corp",
    email: "karan@elitecorp.in",
    phone: "+91 9444444444",
    service: "Custom Portal",
    stage: "Completed",
    stageColor: "bg-gray-500",
    value: "₹5,00,000",
    owner: "OA",
    ownerColor: "bg-blue-500",
  },
  {
    id: 9,
    name: "Pooja Joshi",
    company: "GreenTech",
    email: "pooja@greentech.in",
    phone: "+91 9333333333",
    service: "SEO Campaign",
    stage: "Lost",
    stageColor: "bg-red-500",
    value: "₹30,000",
    owner: "RV",
    ownerColor: "bg-green-500",
  },
  {
    id: 10,
    name: "Ravi Teja",
    company: "FutureTech",
    email: "ravi@startup.in",
    phone: "+91 9222222222",
    service: "Landing Page",
    stage: "New Leads",
    stageColor: "bg-blue-500",
    value: "₹60,000",
    owner: "PS",
    ownerColor: "bg-purple-500",
  },
];

export default function Leads() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Leads</h1>
          <p className="text-muted-foreground">Manage all your sales leads</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={18} className="mr-2" />
          Add Lead
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Search leads..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button className="px-4 py-2 bg-background border border-input rounded-lg hover:bg-card transition-colors">
          Filter
        </button>
      </div>

      {/* Leads Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Name / Company</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Contact</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Service</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Stage</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Value</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Owner</th>
                <th className="px-6 py-3 text-left font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border hover:bg-background/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{lead.name}</div>
                    <div className="text-xs text-muted-foreground">{lead.company}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-foreground">{lead.email}</div>
                    <div className="text-xs text-muted-foreground">{lead.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">{lead.service}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${lead.stageColor}`}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">{lead.value}</td>
                  <td className="px-6 py-4">
                    <div className={`w-8 h-8 rounded-full ${lead.ownerColor} flex items-center justify-center text-xs font-bold text-white`}>
                      {lead.owner}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 hover:bg-background rounded transition-colors">
                      <MoreVertical size={16} className="text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
