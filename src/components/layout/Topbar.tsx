import { Menu, Search, Bell, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface TopbarProps {
  onToggleSidebar: () => void;
  title: string;
}

export function Topbar({ onToggleSidebar, title }: TopbarProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-secondary-200 bg-white px-6 py-3">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="text-secondary-500 hover:text-secondary-700">
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-secondary-900">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search..."
            className="input pl-10 w-64"
          />
        </div>

        <button className="relative text-secondary-500 hover:text-secondary-700">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent-500" />
        </button>

        <div className="flex items-center gap-3 border-l border-secondary-200 pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-secondary-900">{user?.email ?? 'User'}</p>
          </div>
          <button onClick={signOut} className="text-secondary-400 hover:text-error-600 transition-colors" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
