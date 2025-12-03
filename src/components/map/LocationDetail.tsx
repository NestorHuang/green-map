import React, { useState, useRef, useEffect } from 'react'
import { Location } from '@/types/location'
import PhotoCarousel from '@/components/location/PhotoCarousel'
import SubmitterInfo from '@/components/location/SubmitterInfo'
import { useAuth } from '@/hooks/useAuth'

interface LocationDetailProps {
  location: Location | null
  onClose: () => void
}

export const LocationDetail: React.FC<LocationDetailProps> = ({ location, onClose }) => {
  const [isClosing, setIsClosing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { isLoggedIn } = useAuth()
  let startY = 0

  if (!location) return null

  const handleTouchStart = (e: React.TouchEvent) => {
    startY = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY
    const diff = currentY - startY

    if (diff > 50 && panelRef.current) {
      setIsClosing(true)
      setTimeout(onClose, 300)
    }
  }

  const handleClickOutside = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className={`fixed inset-0 bg-black/50 transition-opacity duration-300 z-40 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClickOutside}
    >
      <div
        ref={panelRef}
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-xl max-h-[80vh] overflow-y-auto transition-transform duration-300 ${
          isClosing ? 'translate-y-full' : 'translate-y-0'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">{location.name}</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="關閉"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Photo carousel */}
          <PhotoCarousel photos={location.photos} locationName={location.name} />

          {/* Address */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-700">地址</h3>
            <p className="text-gray-600">{location.address}</p>
          </div>

          {/* Description */}
          {location.description && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">描述</h3>
              <p className="text-gray-600">{location.description}</p>
            </div>
          )}

          {/* Tags */}
          {location.tagIds && location.tagIds.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">標籤</h3>
              <div className="flex flex-wrap gap-2">
                {location.tagIds.map((tagId) => (
                  <span
                    key={tagId}
                    className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {tagId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Submitter info */}
          <SubmitterInfo submitter={location.submitter} />

          {/* Report button - only for logged-in users */}
          {isLoggedIn && (
            <button className="w-full mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold">
              回報此地點資訊有誤
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default LocationDetail
