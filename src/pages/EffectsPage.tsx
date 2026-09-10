import { AssetTypePage } from './AssetTypePage';
import { Wand2 } from 'lucide-react';

export function EffectsPage() {
  return (
    <AssetTypePage
      title="Effects"
      description="Visual effects library"
      assetType="effect"
      icon={Wand2}
      iconColor="bg-primary-50 text-primary-600"
      extraFields={[
        { key: 'intensity', label: 'Default Intensity' },
        { key: 'category', label: 'Effect Category' },
      ]}
    />
  );
}
