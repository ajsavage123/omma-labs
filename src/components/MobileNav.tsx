import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, Wrench } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function MobileNav() {
  const { user } = useAuth();

  if (!user) return null;

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Home', end: true },
    { to: '/contacts', icon: <Users size={20} />, label: 'Directory' },
    { to: '/ideas', icon: <Wrench size={20} className="text-emerald-400" />, label: 'Tools' },
  ];

  if (user.role === 'admin') {
    navItems.push({ to: '/admin', icon: <ShieldCheck size={20} />, label: 'Admin' });
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0c0c0e]/95 backdrop-blur-xl border-t border-white/10 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-6">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `
              flex flex-col items-center gap-1 transition-all duration-300
              ${isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            {item.icon && <div className="relative">{item.icon}</div>}
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
