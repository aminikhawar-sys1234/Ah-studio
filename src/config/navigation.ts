import {
  LayoutDashboard,
  FolderKanban,
  LayoutTemplate,
  Image,
  Puzzle,
  Settings,
  Film,
  Bell,
  Users,
  Database,
  Shield,
  HardDrive,
  Code2,
  Palette,
  Music,
  Type,
  Sparkles,
  Sticker,
  Wand2,
  Download,
  Activity,
  ScrollText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
}

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },

  { id: 'projects', label: 'Projects', icon: FolderKanban, group: 'Content' },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate, group: 'Content' },
  { id: 'assets', label: 'Assets', icon: Image, group: 'Content' },
  { id: 'audio', label: 'Audio', icon: Music, group: 'Content' },
  { id: 'fonts', label: 'Fonts', icon: Type, group: 'Content' },
  { id: 'stickers', label: 'Stickers', icon: Sticker, group: 'Content' },
  { id: 'categories', label: 'Categories', icon: Palette, group: 'Content' },

  { id: 'effects', label: 'Effects', icon: Wand2, group: 'Editor' },
  { id: 'transitions', label: 'Transitions', icon: Film, group: 'Editor' },
  { id: 'text-typography', label: 'Text & Typography', icon: Type, group: 'Editor' },
  { id: 'animation', label: 'Animation', icon: Sparkles, group: 'Editor' },
  { id: 'ai-tools', label: 'AI Tools', icon: Sparkles, group: 'Editor' },
  { id: 'widgets', label: 'Widgets', icon: LayoutTemplate, group: 'Editor' },

  { id: 'plugins', label: 'Plugins', icon: Puzzle, group: 'System' },
  { id: 'render-jobs', label: 'Render Jobs', icon: Film, group: 'System' },
  { id: 'export-jobs', label: 'Export Jobs', icon: Download, group: 'System' },
  { id: 'storage', label: 'Storage', icon: HardDrive, group: 'System' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'System' },

  { id: 'users', label: 'Users', icon: Users, group: 'Admin' },
  { id: 'permissions', label: 'Permissions', icon: Shield, group: 'Admin' },
  { id: 'api-keys', label: 'API Keys', icon: Code2, group: 'Admin' },
  { id: 'logs', label: 'Logs', icon: ScrollText, group: 'Admin' },
  { id: 'audit-logs', label: 'Audit Logs', icon: Activity, group: 'Admin' },

  { id: 'settings', label: 'Settings', icon: Settings, group: 'Admin' },
  { id: 'developer', label: 'Developer Tools', icon: Database, group: 'Admin' },
];
