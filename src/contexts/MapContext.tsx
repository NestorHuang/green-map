import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Location } from '@/types/location'

interface MapContextType {
  center: { lat: number; lng: number }
  setCenter: (center: { lat: number; lng: number }) => void
  zoom: number
  setZoom: (zoom: number) => void
  selectedLocation: Location | null
  setSelectedLocation: (location: Location | null) => void
  selectedTagId: string | null
  setSelectedTagId: (tagId: string | null) => void
}

const MapContext = createContext<MapContextType | undefined>(undefined)

export function MapProvider({ children }: { children: ReactNode }) {
  const [center, setCenter] = useState({ lat: 23.973, lng: 120.96 })
  const [zoom, setZoom] = useState(8)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)

  return (
    <MapContext.Provider
      value={{
        center,
        setCenter,
        zoom,
        setZoom,
        selectedLocation,
        setSelectedLocation,
        selectedTagId,
        setSelectedTagId,
      }}
    >
      {children}
    </MapContext.Provider>
  )
}

export function useMapContext() {
  const context = useContext(MapContext)
  if (!context) {
    throw new Error('useMapContext must be used within MapProvider')
  }
  return context
}
