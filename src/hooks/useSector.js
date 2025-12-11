import { useMemo } from 'react';
import { getSectorConfig } from '../config/sectorConfig';

export function useSector(tenant) {
  const config = useMemo(() => {
    const type = tenant?.sector || 'generic';
    return getSectorConfig(type);
  }, [tenant]);

  return config;
}
