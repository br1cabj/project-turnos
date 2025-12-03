import { useMemo } from 'react';
import { getSectorConfig } from '../config/sectorConfig';

export function useSector(tenant) {
  const config = useMemo(() => {
    // Si no hay tenant cargado, devolvemos el genérico
    const type = tenant?.sector || 'generic';
    return getSectorConfig(type);
  }, [tenant]);

  return config;
}
