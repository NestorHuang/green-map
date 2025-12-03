import React, { useState, useCallback } from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { Location } from '@/types/location'
import { useMapContext } from '@/contexts/MapContext'
import { MAP_CONTAINER_STYLE, DEFAULT_MAP_OPTIONS, TAIWAN_CENTER, TAIWAN_ZOOM } from '@/utils/mapHelpers'
import LocationMarker from './LocationMarker'
import LocationDetail from './LocationDetail'
import ErrorMessage from '@/components/common/ErrorMessage'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface MapContainerProps {
  locations: Location[]
  loading: boolean
  error?: string | null
}

const LIBRARIES = ['places'] as const

export const MapContainer: React.FC<MapContainerProps> = ({ locations, loading, error }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  })

  const {
    center,
    setCenter,
    zoom,
    setZoom,
    selectedLocation,
    setSelectedLocation,
    selectedTagId,
  } = useMapContext()

  const [mapError, setMapError] = useState<string | null>(error || null)

  const handleMarkerClick = useCallback(
    (location: Location) => {
      setSelectedLocation(location)
      setCenter({
        lat: location.coordinates.latitude || location.coordinates.lat,
        lng: location.coordinates.longitude || location.coordinates.lng,
      })
    },
    [setSelectedLocation, setCenter]
  )

  const handleCloseDetail = useCallback(() => {
    setSelectedLocation(null)
  }, [setSelectedLocation])

  const handleMapClick = useCallback(() => {
    setSelectedLocation(null)
  }, [setSelectedLocation])

  // Filter locations by selected tag
  const filteredLocations = selectedTagId
    ? locations.filter((loc) => loc.tagIds.includes(selectedTagId))
    : locations

  // Show empty state when no locations after filtering
  if (filteredLocations.length === 0 && locations.length > 0 && selectedTagId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center p-4">
          <p className="text-gray-600 text-lg mb-2">沒有符合篩選條件的地點</p>
          <p className="text-gray-500 text-sm">請嘗試其他標籤或移除篩選條件</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return <ErrorMessage message="地圖載入失敗，請稍後重試" />
  }

  if (!isLoaded) {
    return <LoadingSpinner message="載入地圖中..." />
  }

  if (mapError) {
    return <ErrorMessage message={mapError} onRetry={() => setMapError(null)} />
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={zoom}
        options={DEFAULT_MAP_OPTIONS}
        onClick={handleMapClick}
        onCenterChanged={(map) => {
          if (map) {
            setCenter({
              lat: map.getCenter()!.lat(),
              lng: map.getCenter()!.lng(),
            })
          }
        }}
        onZoomChanged={(map) => {
          if (map) {
            setZoom(map.getZoom()!)
          }
        }}
      >
        {/* Render markers for filtered locations */}
        {filteredLocations.map((location) => (
          <LocationMarker
            key={location.id}
            location={location}
            onClick={handleMarkerClick}
          />
        ))}

        {/* Location detail panel */}
        <LocationDetail location={selectedLocation} onClose={handleCloseDetail} />
      </GoogleMap>

      {/* Empty state when no locations at all */}
      {locations.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none">
          <div className="text-center">
            <p className="text-gray-600 text-lg">目前區域尚無綠色生活地點</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapContainer
