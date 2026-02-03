import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Play,
  Database,
  Settings,
  Sparkles,
  ChevronRight,
  Zap,
  Terminal,
  Hexagon
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/agents', icon: Bot, label: 'Agentes' },
  { path: '/runs', icon: Play, label: 'Execuções' },
  { path: '/knowledge', icon: Database, label: 'Knowledge' },
  { path: '/settings', icon: Settings, label: 'Config' },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  if (location.pathname === '/welcome') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 glass-strong fixed h-screen z-50 flex flex-col">
        {/* Logo */}
        <Link to="/welcome" className="p-5 flex items-center gap-3 border-b border-zinc-800/50">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-cyan via-cyber-purple to-cyber-pink flex items-center justify-center">
              <Hexagon className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyber-cyan rounded-full status-dot"></div>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">NHP</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Cognitive OS</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'active text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-cyber-cyan' : ''}`} />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto text-cyber-cyan" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-zinc-800/50">
          <div className="glass rounded-xl p-4 gradient-border">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-cyber-cyan" />
              <span className="text-xs font-semibold text-zinc-300">Quick Run</span>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3">
              Execute um orquestrador com um prompt rápido
            </p>
            <button className="w-full btn-primary text-zinc-900 font-semibold text-sm py-2 rounded-lg flex items-center justify-center gap-2">
              <Terminal className="w-4 h-4" />
              Iniciar
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="p-4 border-t border-zinc-800/50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyber-green status-dot"></div>
              <span className="text-zinc-500">Sistema Online</span>
            </div>
            <span className="text-zinc-600 font-mono">v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="min-h-screen p-8 grid-bg">
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
