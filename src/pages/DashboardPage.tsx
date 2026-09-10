import { useEffect, useState } from 'react';
import { FolderKanban, LayoutTemplate, Image, Puzzle, Film, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface DashboardStats {
  projects: number;
  templates: number;
  assets: number;
  plugins: number;
  renderJobs: number;
}

interface RecentItem {
  id: string;
  name: string;
  status: string;
  type: string;
  created_at: string;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    projects: 0,
    templates: 0,
    assets: 0,
    plugins: 0,
    renderJobs: 0,
  });
  const [recentProjects, setRecentProjects] = useState<RecentItem[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [projects, templates, assets, plugins, jobs] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('templates').select('*', { count: 'exact', head: true }),
        supabase.from('assets').select('*', { count: 'exact', head: true }),
        supabase.from('plugins').select('*', { count: 'exact', head: true }),
        supabase.from('render_jobs').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        projects: projects.count ?? 0,
        templates: templates.count ?? 0,
        assets: assets.count ?? 0,
        plugins: plugins.count ?? 0,
        renderJobs: jobs.count ?? 0,
      });

      const { data: recentProj } = await supabase
        .from('projects')
        .select('id, name, status, type, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentProjects((recentProj ?? []) as RecentItem[]);

      const { data: recentJ } = await supabase
        .from('render_jobs')
        .select('id, status, type:status, name:status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentJobs(
        (recentJ ?? []).map((j) => ({
          id: j.id,
          name: `Job ${j.id.slice(0, 8)}`,
          status: j.status,
          type: 'render',
          created_at: j.created_at,
        }))
      );

      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { label: 'Projects', value: stats.projects, icon: FolderKanban, color: 'primary' },
    { label: 'Templates', value: stats.templates, icon: LayoutTemplate, color: 'accent' },
    { label: 'Assets', value: stats.assets, icon: Image, color: 'success' },
    { label: 'Plugins', value: stats.plugins, icon: Puzzle, color: 'secondary' },
    { label: 'Render Jobs', value: stats.renderJobs, icon: Film, color: 'primary' },
  ];

  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    accent: 'bg-accent-50 text-accent-600',
    success: 'bg-success-50 text-success-600',
    secondary: 'bg-secondary-100 text-secondary-600',
  };

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your creative platform" />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorMap[card.color]}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-secondary-900">
                {loading ? '—' : card.value}
              </p>
              <p className="text-sm text-secondary-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-secondary-400" />
            <h3 className="text-sm font-semibold text-secondary-900">Recent Projects</h3>
          </div>
          <div className="space-y-3">
            {recentProjects.length === 0 ? (
              <p className="text-sm text-secondary-400 py-4 text-center">No projects yet</p>
            ) : (
              recentProjects.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
                      <FolderKanban className="h-4 w-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary-900">{p.name}</p>
                      <p className="text-xs text-secondary-400">{p.type}</p>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-secondary-400" />
            <h3 className="text-sm font-semibold text-secondary-900">Recent Render Jobs</h3>
          </div>
          <div className="space-y-3">
            {recentJobs.length === 0 ? (
              <p className="text-sm text-secondary-400 py-4 text-center">No render jobs yet</p>
            ) : (
              recentJobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-100">
                      <CheckCircle2 className="h-4 w-4 text-secondary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary-900">{j.name}</p>
                      <p className="text-xs text-secondary-400">{new Date(j.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <StatusBadge status={j.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
