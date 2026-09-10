import { type ReactNode } from 'react';
import { Search } from 'lucide-react';

interface ToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
}

export function Toolbar({ search, onSearchChange, searchPlaceholder = 'Search...', children }: ToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
        <input
          type="text"
          className="input pl-10"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
