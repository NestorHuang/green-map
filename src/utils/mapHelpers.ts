export const TAIWAN_CENTER = {
  lat: 23.973,
  lng: 120.960,
}

export const TAIWAN_ZOOM = 8

export const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
}

export const DEFAULT_MAP_OPTIONS = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  minZoom: 6,
  maxZoom: 18,
}

export function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function calculateZoomLevel(distance: number): number {
  // Calculate appropriate zoom level based on distance in km
  if (distance < 1) return 17
  if (distance < 5) return 14
  if (distance < 20) return 12
  if (distance < 50) return 10
  return 8
}
