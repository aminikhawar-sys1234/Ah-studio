import { useState } from 'react';
import { navItems } from '@/config/navigation';
import { Clapperboard, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  active: string;
  onNavigate: (id: string) => void;
  collapsed: boolean;
}

export function Sidebar({ active, onNavigate, collapsed }: SidebarProps) {
  const groups = Array.from(new Set(navItems.map((n) => n.group)));

  return (
    <aside
      className={cn(
        'flex flex-col bg-secondary-900 border-r border-secondary-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex items-center gap-2 px-4 py-5 border-b border-secondary-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 flex-shrink-0">
          <Clapperboard className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">AH Studio</p>
            <p className="text-xs text-secondary-400 truncate">Creative Platform</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((group) => {
          const items = navItems.filter((n) => n.group === group);
          return (
            <div key={group} className="mb-1">
              {!collapsed && (
                <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-secondary-500">
                  {group}
                </p>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors relative group',
                      isActive
                        ? 'text-white bg-primary-600/20'
                        : 'text-secondary-400 hover:text-white hover:bg-secondary-800',
                      collapsed && 'justify-center'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-0 h-full w-0.5 bg-primary-500" />
                    )}
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
