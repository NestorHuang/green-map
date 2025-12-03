import React, { useEffect } from 'react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useLocations } from '@/hooks/useLocations'
import { useTags } from '@/hooks/useTags'
import { useMapContext } from '@/contexts/MapContext'
import MapContainer from '@/components/map/MapContainer'
import AddressSearch from '@/components/map/AddressSearch'
import TagFilter from '@/components/map/TagFilter'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import { TAIWAN_CENTER, TAIWAN_ZOOM } from '@/utils/mapHelpers'

export const MapPage: React.FC = () => {
  const { position: gpsPosition, error: gpsError, loading: gpsLoading } = useGeolocation()
  const { locations, loading: locationsLoading, error: locationsError } = useLocations()
  const { tags, loading: tagsLoading } = useTags()
  const { setCenter, setZoom } = useMapContext()

  // Update map center when GPS position is obtained
  useEffect(() => {
    if (gpsPosition && !gpsError) {
      setCenter(gpsPosition)
      setZoom(14)
    } else if (gpsError) {
      // Fallback to Taiwan view
      setCenter(TAIWAN_CENTER)
      setZoom(TAIWAN_ZOOM)
    }
  }, [gpsPosition, gpsError, setCenter, setZoom])

  const isLoading = gpsLoading || locationsLoading || tagsLoading

  if (locationsError) {
    return <ErrorMessage message="無法載入地點資訊，請稍後重試" />
  }

  return (
    <div className="flex flex-col w-screen h-screen bg-white overflow-hidden">
      {/* Header with search */}
      <div className="p-4 space-y-3 bg-white border-b shadow-sm">
        <h1 className="text-2xl font-bold text-green-primary">綠色生活地圖</h1>
        {!isLoading && <AddressSearch />}
      </div>

      {/* GPS status message */}
      {gpsError && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <p className="text-sm text-amber-800">
            📍 {gpsError}
            {!gpsError.includes('未輸入') && '  已切換至台灣全島視圖'}
          </p>
        </div>
      )}

      {/* Tag filter */}
      {!tagsLoading && tags.length > 0 && <TagFilter tags={tags} />}

      {/* Map container */}
      <div className="flex-1 relative">
        {isLoading ? (
          <LoadingSpinner message="初始化地圖..." />
        ) : (
          <MapContainer
            locations={locations}
            loading={locationsLoading}
            error={locationsError}
          />
        )}
      </div>
    </div>
  )
}

export default MapPage
