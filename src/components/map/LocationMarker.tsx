import React, { useCallback } from 'react'
import { Marker } from '@react-google-maps/api'
import { Location } from '@/types/location'

interface LocationMarkerProps {
  location: Location
  onClick: (location: Location) => void
}

export const LocationMarker: React.FC<LocationMarkerProps> = ({ location, onClick }) => {
  const handleClick = useCallback(() => {
    onClick(location)
  }, [location, onClick])

  const { coordinates } = location
  const position = {
    lat: coordinates.latitude || coordinates.lat,
    lng: coordinates.longitude || coordinates.lng,
  }

  return (
    <Marker
      position={position}
      onClick={handleClick}
      title={location.name}
      options={{
        animation: 2, // BOUNCE
      }}
    />
  )
}

export default LocationMarker
