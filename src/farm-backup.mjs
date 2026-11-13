import {boundaryError} from '../shared/farm-boundary.mjs';
export function validateBackup(payload) {
  if (payload?.version !== 1 || !Array.isArray(payload.farms) || !Array.isArray(payload.removedFarms)) throw new Error('This backup format is not supported.');
  const ids = new Set();
  for (const farm of [...payload.farms, ...payload.removedFarms]) {
    if (!farm || typeof farm.id !== 'string' || !farm.id || ids.has(farm.id) || typeof farm.name !== 'string' || !farm.name.trim() || typeof farm.crop !== 'string' || typeof farm.location !== 'string' || !Number.isFinite(farm.size) || farm.size <= 0) throw new Error('The backup contains invalid farm records.');
    ids.add(farm.id);
    if (farm.point && (!Number.isFinite(farm.point.lat) || !Number.isFinite(farm.point.lon) || Math.abs(farm.point.lat) > 90 || Math.abs(farm.point.lon) > 180)) throw new Error('The backup contains an invalid map pin.');
    if (farm.boundary && (boundaryError(farm.boundary) || farm.boundary.some(p => Math.abs(p[0])>90 || Math.abs(p[1])>180))) throw new Error('The backup contains an invalid outline.');
  }
  return payload;
}

export function mergeBackup(local, remote) {
  validateBackup(local); validateBackup(remote);
  const localIds = new Set([...local.farms, ...local.removedFarms].map(farm => farm.id));
  return {version:1, farms:[...local.farms, ...remote.farms.filter(farm => !localIds.has(farm.id))], removedFarms:[...local.removedFarms, ...remote.removedFarms.filter(farm => !localIds.has(farm.id))]};
}
