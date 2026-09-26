import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Briefcase, Copy, Check, MessageCircle, Mail, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CRMPortfolioShareModal({ isOpen, onClose }: Props) {
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [targetPhone, setTargetPhone] = useState('');

  if (!isOpen) return null;

  const portfolioUrl = "https://oomalabs.com";
  const pitchText = `Hi! This is from OomaLabs Technologies. We build high-performance web applications, custom CRM engines, mobile apps, and enterprise software. 

You can check out our live project credentials and portfolio here: ${portfolioUrl}

Let us know if you'd like to explore how we can modernize your digital operations or schedule a quick 10-minute discovery demo!`;

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(pitchText);
    setCopiedPitch(true);
    toast.success("Portfolio pitch copied to clipboard!");
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portfolioUrl);
    setCopiedLink(true);
    toast.success("Portfolio link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppDispatch = () => {
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(pitchText);
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  const handleEmailDispatch = () => {
    const subject = encodeURIComponent("OomaLabs - Portfolio & Technology Solutions");
    const body = encodeURIComponent(pitchText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-lg bg-card border-border shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Share OomaLabs Portfolio</h2>
            <p className="text-xs text-muted-foreground">Day 6: Value showcase, case studies & credentials</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-3.5 bg-muted/30 border border-border rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Live Portfolio URL
              </span>
              <Button variant="ghost" size="sm" onClick={handleCopyLink} className="h-7 text-xs">
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedLink ? "Copied" : "Copy Link"}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 bg-background p-2 rounded-lg border border-input text-xs text-muted-foreground font-mono">
              <span className="truncate">{portfolioUrl}</span>
              <a href={portfolioUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                Open <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ready-to-Send Outreach Script
              </label>
              <Button variant="outline" size="sm" onClick={handleCopyPitch} className="h-7 text-xs">
                {copiedPitch ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedPitch ? "Copied Pitch" : "Copy Script"}
              </Button>
            </div>
            <textarea
              readOnly
              rows={5}
              value={pitchText}
              className="w-full bg-muted/20 border border-border rounded-lg p-3 text-xs text-foreground font-sans resize-none leading-relaxed"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Direct Instant Dispatch
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetPhone}
                onChange={e => setTargetPhone(e.target.value)}
                placeholder="Optional Phone (e.g. 919876543210)"
                className="flex-1 bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button size="sm" onClick={handleWhatsAppDispatch} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </Button>
              <Button size="sm" variant="outline" onClick={handleEmailDispatch} className="gap-1 text-xs">
                <Mail className="w-3.5 h-3.5" />
                Email
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
