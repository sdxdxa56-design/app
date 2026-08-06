import React, { useState, useEffect } from 'react';
import { SiteAlert } from '../firebase';
import { Megaphone, X } from 'lucide-react';

interface AlertBarProps {
  alerts: SiteAlert[];
}

export default function AlertBar({ alerts }: AlertBarProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsDismissed(false);
  }, [alerts]);

  const activeAlerts = alerts.filter(alert => {
    if (!alert.isActive) return false;
    const now = new Date();
    if (alert.startDate && new Date(alert.startDate) > now) return false;
    if (alert.endDate && new Date(alert.endDate) < now) return false;
    return true;
  });

  if (activeAlerts.length === 0 || isDismissed) {
    return null;
  }

  // Choose background color based on alert selection
  const getBgClass = (color: string) => {
    switch (color) {
      case 'red': return 'bg-rose-600 text-white';
      case 'blue': return 'bg-sky-600 text-white';
      case 'green': return 'bg-emerald-600 text-white';
      case 'amber': return 'bg-amber-500 text-slate-950';
      default: return 'bg-rose-600 text-white';
    }
  };

  const primaryAlert = activeAlerts[0];

  return (
    <div 
      className={`relative w-full overflow-hidden py-2 px-8 flex items-center justify-between z-50 font-sans shadow-sm border-b border-white/10 ${getBgClass(primaryAlert.backgroundColor)}`}
      id="global_alert_bar"
    >
      {/* Styles for horizontal infinite scroll */}
      <style>{`
        @keyframes alertMarquee {
          0% { transform: translate3d(100%, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        .alert-marquee-text {
          display: inline-block;
          white-space: nowrap;
          animation: alertMarquee 20s linear infinite;
        }
        .alert-marquee-text:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="flex items-center gap-2 z-10 font-bold text-xs shrink-0 select-none">
        <Megaphone className="w-4 h-4 animate-bounce shrink-0" />
        <span className="bg-black/15 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider">
          تنبيه هام 🚨
        </span>
      </div>

      <div className="flex-1 overflow-hidden mx-4 relative flex items-center h-5">
        <div className="alert-marquee-text w-full text-right text-xs font-black select-none cursor-default" dir="rtl">
          {primaryAlert.text}
        </div>
      </div>

      <button
        onClick={() => setIsDismissed(true)}
        className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0 z-10"
        title="إغلاق التنبيه"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
