import React, { useState } from 'react'

interface PhotoCarouselProps {
  photos: string[]
  locationName: string
}

export const PhotoCarousel: React.FC<PhotoCarouselProps> = ({ photos, locationName }) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded-lg">
        <span className="text-gray-500">無照片</span>
      </div>
    )
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))
  }

  const currentPhoto = photos[currentIndex]

  return (
    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
      <img
        src={currentPhoto}
        alt={`${locationName} - ${currentIndex + 1}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          const img = e.currentTarget
          img.src = 'https://via.placeholder.com/400x300?text=Photo+Error'
        }}
      />

      {photos.length > 1 && (
        <>
          {/* Previous button */}
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            aria-label="上一張照片"
          >
            ❮
          </button>

          {/* Next button */}
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            aria-label="下一張照片"
          >
            ❯
          </button>

          {/* Indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
            {photos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
                aria-label={`跳至照片 ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default PhotoCarousel
