import { useEffect, useState } from 'react';
import { Shield, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
}

interface Permission {
  id: string;
  label: string;
  description: string;
}

const roles: Role[] = [
  { id: 'super_admin', name: 'Super Admin', description: 'Full system access including all settings and security', level: 100 },
  { id: 'admin', name: 'Admin', description: 'Manage users, content, and system configuration', level: 80 },
  { id: 'developer', name: 'Developer', description: 'Access to developer tools, API keys, and plugin management', level: 60 },
  { id: 'designer', name: 'Designer', description: 'Create and manage templates, assets, and projects', level: 40 },
  { id: 'moderator', name: 'Moderator', description: 'Review and moderate user content', level: 30 },
  { id: 'creator', name: 'Creator', description: 'Create and manage own projects and assets', level: 20 },
  { id: 'user', name: 'User', description: 'Basic access to projects and templates', level: 10 },
  { id: 'guest', name: 'Guest', description: 'View-only access to published content', level: 0 },
];

const permissions: Permission[] = [
  { id: 'READ_PROJECT', label: 'Read Projects', description: 'View project content' },
  { id: 'WRITE_PROJECT', label: 'Write Projects', description: 'Create and edit projects' },
  { id: 'READ_ASSETS', label: 'Read Assets', description: 'View assets in the library' },
  { id: 'WRITE_ASSETS', label: 'Write Assets', description: 'Upload and manage assets' },
  { id: 'EXPORT_ACCESS', label: 'Export', description: 'Export and download content' },
  { id: 'AI_ACCESS', label: 'AI Tools', description: 'Use AI-powered features' },
  { id: 'STORAGE_ACCESS', label: 'Storage', description: 'Manage storage configuration' },
  { id: 'EDITOR_ACCESS', label: 'Editor', description: 'Access the editor canvas' },
  { id: 'NETWORK_ACCESS', label: 'Network', description: 'Make external API calls' },
  { id: 'PLUGIN_MANAGE', label: 'Manage Plugins', description: 'Install and configure plugins' },
  { id: 'USER_MANAGE', label: 'Manage Users', description: 'Manage user accounts and roles' },
  { id: 'SYSTEM_CONFIG', label: 'System Config', description: 'Configure system settings' },
];

const defaultMatrix: Record<string, string[]> = {
  super_admin: permissions.map((p) => p.id),
  admin: ['READ_PROJECT', 'WRITE_PROJECT', 'READ_ASSETS', 'WRITE_ASSETS', 'EXPORT_ACCESS', 'AI_ACCESS', 'STORAGE_ACCESS', 'EDITOR_ACCESS', 'USER_MANAGE', 'SYSTEM_CONFIG'],
  developer: ['READ_PROJECT', 'WRITE_PROJECT', 'READ_ASSETS', 'WRITE_ASSETS', 'EXPORT_ACCESS', 'AI_ACCESS', 'EDITOR_ACCESS', 'NETWORK_ACCESS', 'PLUGIN_MANAGE'],
  designer: ['READ_PROJECT', 'WRITE_PROJECT', 'READ_ASSETS', 'WRITE_ASSETS', 'EXPORT_ACCESS', 'EDITOR_ACCESS'],
  moderator: ['READ_PROJECT', 'READ_ASSETS'],
  creator: ['READ_PROJECT', 'WRITE_PROJECT', 'READ_ASSETS', 'WRITE_ASSETS', 'EXPORT_ACCESS', 'EDITOR_ACCESS'],
  user: ['READ_PROJECT', 'READ_ASSETS'],
  guest: [],
};

export function PermissionsPage() {
  const [matrix, setMatrix] = useState<Record<string, string[]>>(defaultMatrix);
  const [dirty, setDirty] = useState(false);

  const toggle = (roleId: string, permId: string) => {
    setMatrix((prev) => {
      const current = prev[roleId] ?? [];
      const next = current.includes(permId) ? current.filter((p) => p !== permId) : [...current, permId];
      return { ...prev, [roleId]: next };
    });
    setDirty(true);
  };

  return (
    <div>
      <PageHeader title="Permissions" description="Configure role-based access control"
        actions={dirty ? <button className="btn-primary" onClick={() => { setDirty(false); }}>Save Changes</button> : undefined} />

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-secondary-200 bg-secondary-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500 sticky left-0 bg-secondary-50">
                Permission
              </th>
              {roles.map((r) => (
                <th key={r.id} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-secondary-500 min-w-[80px]">
                  <div className="flex flex-col items-center gap-1">
                    <Shield className={cn('h-4 w-4', r.level >= 80 ? 'text-error-500' : r.level >= 40 ? 'text-primary-500' : 'text-secondary-400')} />
                    <span>{r.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100">
            {permissions.map((perm) => (
              <tr key={perm.id} className="hover:bg-secondary-50">
                <td className="px-4 py-3 sticky left-0 bg-white">
                  <div>
                    <p className="text-sm font-medium text-secondary-900">{perm.label}</p>
                    <p className="text-xs text-secondary-400">{perm.description}</p>
                  </div>
                </td>
                {roles.map((r) => {
                  const has = (matrix[r.id] ?? []).includes(perm.id);
                  const isSuperAdmin = r.id === 'super_admin';
                  return (
                    <td key={r.id} className="px-3 py-3 text-center">
                      <button
                        onClick={() => !isSuperAdmin && toggle(r.id, perm.id)}
                        disabled={isSuperAdmin}
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors',
                          isSuperAdmin && 'cursor-not-allowed',
                          has
                            ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                            : 'bg-secondary-100 text-secondary-300 hover:bg-secondary-200'
                        )}
                      >
                        {has ? <Check className="h-4 w-4" /> : <X className="h-3 w-3" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {roles.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className={cn('h-4 w-4', r.level >= 80 ? 'text-error-500' : r.level >= 40 ? 'text-primary-500' : 'text-secondary-400')} />
              <p className="text-sm font-semibold text-secondary-900">{r.name}</p>
            </div>
            <p className="text-xs text-secondary-500 mb-2">{r.description}</p>
            <p className="text-xs text-secondary-400">{(matrix[r.id] ?? []).length} permissions granted</p>
          </div>
        ))}
      </div>
    </div>
  );
}
