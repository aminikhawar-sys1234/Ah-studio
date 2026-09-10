export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { className: string; label: string }> = {
    draft: { className: 'badge-secondary', label: 'Draft' },
    published: { className: 'badge-success', label: 'Published' },
    unpublished: { className: 'badge-warning', label: 'Unpublished' },
    active: { className: 'badge-success', label: 'Active' },
    inactive: { className: 'badge-secondary', label: 'Inactive' },
    error: { className: 'badge-error', label: 'Error' },
    queued: { className: 'badge-secondary', label: 'Queued' },
    processing: { className: 'badge-primary', label: 'Processing' },
    completed: { className: 'badge-success', label: 'Completed' },
    failed: { className: 'badge-error', label: 'Failed' },
    cancelled: { className: 'badge-secondary', label: 'Cancelled' },
    editing: { className: 'badge-primary', label: 'Editing' },
    rendering: { className: 'badge-primary', label: 'Rendering' },
    archived: { className: 'badge-secondary', label: 'Archived' },
  };

  const config = map[status] ?? { className: 'badge-secondary', label: status };
  return <span className={config.className}>{config.label}</span>;
}
