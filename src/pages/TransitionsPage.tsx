import { AssetTypePage } from './AssetTypePage';
import { Film } from 'lucide-react';

export function TransitionsPage() {
  return (
    <AssetTypePage
      title="Transitions"
      description="Transition library for video editing"
      assetType="transition"
      icon={Film}
      iconColor="bg-accent-50 text-accent-600"
      extraFields={[
        { key: 'duration', label: 'Default Duration (seconds)' },
        { key: 'direction', label: 'Direction' },
      ]}
    />
  );
}
