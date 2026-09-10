import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthPage } from '@/pages/AuthPage';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { TemplatesPage } from '@/pages/TemplatesPage';
import { AssetsPage } from '@/pages/AssetsPage';
import { PluginsPage } from '@/pages/PluginsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { RenderJobsPage } from '@/pages/RenderJobsPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { Music, Type, Sticker, Palette, Wand2, Film, Sparkles, LayoutTemplate, Bell, Users, Shield, Code2, ScrollText, Activity, HardDrive, Download } from 'lucide-react';

function AdminShell() {
  const { session, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  const pageMap: Record<string, { component: React.ReactNode; title: string }> = {
    dashboard: { component: <DashboardPage />, title: 'Dashboard' },
    projects: { component: <ProjectsPage />, title: 'Projects' },
    templates: { component: <TemplatesPage />, title: 'Templates' },
    assets: { component: <AssetsPage />, title: 'Assets' },
    audio: { component: <PlaceholderPage title="Audio" description="Audio library and sound effects" icon={<Music className="h-8 w-8 text-secondary-400" />} />, title: 'Audio' },
    fonts: { component: <PlaceholderPage title="Fonts" description="Font management" icon={<Type className="h-8 w-8 text-secondary-400" />} />, title: 'Fonts' },
    stickers: { component: <PlaceholderPage title="Stickers" description="Sticker library" icon={<Sticker className="h-8 w-8 text-secondary-400" />} />, title: 'Stickers' },
    categories: { component: <PlaceholderPage title="Categories" description="Content taxonomy" icon={<Palette className="h-8 w-8 text-secondary-400" />} />, title: 'Categories' },
    effects: { component: <PlaceholderPage title="Effects" description="Visual effects library" icon={<Wand2 className="h-8 w-8 text-secondary-400" />} />, title: 'Effects' },
    transitions: { component: <PlaceholderPage title="Transitions" description="Transition library" icon={<Film className="h-8 w-8 text-secondary-400" />} />, title: 'Transitions' },
    'text-typography': { component: <PlaceholderPage title="Text & Typography" description="Text styling and typography" icon={<Type className="h-8 w-8 text-secondary-400" />} />, title: 'Text & Typography' },
    animation: { component: <PlaceholderPage title="Animation" description="Animation presets and keyframes" icon={<Sparkles className="h-8 w-8 text-secondary-400" />} />, title: 'Animation' },
    'ai-tools': { component: <PlaceholderPage title="AI Tools" description="AI-powered creative tools" icon={<Sparkles className="h-8 w-8 text-secondary-400" />} />, title: 'AI Tools' },
    widgets: { component: <PlaceholderPage title="Widgets" description="Widget builder and library" icon={<LayoutTemplate className="h-8 w-8 text-secondary-400" />} />, title: 'Widgets' },
    plugins: { component: <PluginsPage />, title: 'Plugins' },
    'render-jobs': { component: <RenderJobsPage />, title: 'Render Jobs' },
    'export-jobs': { component: <PlaceholderPage title="Export Jobs" description="Export job queue" icon={<Download className="h-8 w-8 text-secondary-400" />} />, title: 'Export Jobs' },
    storage: { component: <PlaceholderPage title="Storage" description="Storage management" icon={<HardDrive className="h-8 w-8 text-secondary-400" />} />, title: 'Storage' },
    notifications: { component: <PlaceholderPage title="Notifications" description="User notifications" icon={<Bell className="h-8 w-8 text-secondary-400" />} />, title: 'Notifications' },
    users: { component: <PlaceholderPage title="Users" description="User management" icon={<Users className="h-8 w-8 text-secondary-400" />} />, title: 'Users' },
    permissions: { component: <PlaceholderPage title="Permissions" description="Role and permission management" icon={<Shield className="h-8 w-8 text-secondary-400" />} />, title: 'Permissions' },
    'api-keys': { component: <PlaceholderPage title="API Keys" description="API key management" icon={<Code2 className="h-8 w-8 text-secondary-400" />} />, title: 'API Keys' },
    logs: { component: <PlaceholderPage title="Logs" description="System logs" icon={<ScrollText className="h-8 w-8 text-secondary-400" />} />, title: 'Logs' },
    'audit-logs': { component: <PlaceholderPage title="Audit Logs" description="Audit trail" icon={<Activity className="h-8 w-8 text-secondary-400" />} />, title: 'Audit Logs' },
    settings: { component: <SettingsPage />, title: 'Settings' },
    developer: { component: <PlaceholderPage title="Developer Tools" description="Developer console and diagnostics" icon={<Code2 className="h-8 w-8 text-secondary-400" />} />, title: 'Developer Tools' },
  };

  const current = pageMap[activePage] ?? pageMap.dashboard;

  return (
    <div className="flex h-screen overflow-hidden bg-secondary-50">
      <Sidebar active={activePage} onNavigate={setActivePage} collapsed={sidebarCollapsed} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onToggleSidebar={() => setSidebarCollapsed((v) => !v)} title={current.title} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {current.component}
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AdminShell />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
