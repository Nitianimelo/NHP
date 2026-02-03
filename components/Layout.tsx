import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Bot, Play, Database, Settings, Key } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agents', icon: Bot, label: 'Agentes' },
  { to: '/runs', icon: Play, label: 'Execuções' },
  { to: '/knowledge', icon: Database, label: 'Knowledge' },
  { to: '/api', icon: Key, label: 'API' },
  { to: '/settings', icon: Settings, label: 'Config' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  if (location.pathname === '/welcome') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-neutral-950">
      {/* Sidebar */}
      <aside className="w-52 border-r border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <span className="text-base font-semibold text-white">NHP</span>
          <span className="text-xs text-neutral-500 ml-2">v1.0</span>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  isActive
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800 text-xs text-neutral-600">
          Cognitive OS
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
};
