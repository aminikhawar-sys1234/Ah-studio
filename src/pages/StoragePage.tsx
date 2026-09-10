import { useEffect, useState } from 'react';
import { HardDrive, Database, Image, Video, Music, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatBytes } from '@/lib/utils';

export function StoragePage() {
  const [stats, setStats] = useState({ totalAssets: 0, totalSize: 0, byType: {} as Record<string, { count: number; size: number }> });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('assets').select('type, size_bytes');
      if (error || !data) { setLoading(false); return; }
      const byType: Record<string, { count: number; size: number }> = {};
      let totalSize = 0;
      for (const row of data as { type: string; size_bytes: number }[]) {
        if (!byType[row.type]) byType[row.type] = { count: 0, size: 0 };
        byType[row.type].count++;
        byType[row.type].size += row.size_bytes;
        totalSize += row.size_bytes;
      }
      setStats({ totalAssets: data.length, totalSize, byType });
      setLoading(false);
    }
    load();
  }, []);

  const typeIcons: Record<string, typeof Image> = {
    image: Image, video: Video, audio: Music, music: Music, font: FileText, sticker: Image, gif: Image, lut: FileText,
  };

  return (
    <div>
      <PageHeader title="Storage" description="Monitor your asset storage usage" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <HardDrive className="h-5 w-5 text-primary-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-secondary-900">{loading ? '—' : stats.totalAssets}</p>
          <p className="text-sm text-secondary-500">Total Assets</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
              <Database className="h-5 w-5 text-accent-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-secondary-900">{loading ? '—' : formatBytes(stats.totalSize)}</p>
          <p className="text-sm text-secondary-500">Total Size</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50">
              <Image className="h-5 w-5 text-success-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-secondary-900">{loading ? '—' : Object.keys(stats.byType).length}</p>
          <p className="text-sm text-secondary-500">Asset Types</p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-secondary-900 mb-4">Storage by Type</h3>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-secondary-100 rounded animate-pulse" />)}
          </div>
        ) : Object.keys(stats.byType).length === 0 ? (
          <p className="text-sm text-secondary-400 text-center py-8">No assets stored yet.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(stats.byType).map(([type, info]) => {
              const Icon = typeIcons[type] ?? FileText;
              const pct = stats.totalSize > 0 ? (info.size / stats.totalSize) * 100 : 0;
              return (
                <div key={type} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-100 flex-shrink-0">
                    <Icon className="h-4 w-4 text-secondary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-secondary-700 capitalize">{type}</span>
                      <span className="text-xs text-secondary-500">{info.count} files · {formatBytes(info.size)}</span>
                    </div>
                    <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
