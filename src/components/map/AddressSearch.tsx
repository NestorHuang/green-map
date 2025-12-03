import React, { useRef, useEffect, useState } from 'react'
import { useMapContext } from '@/contexts/MapContext'

interface PlacePrediction {
  main_text: string
  secondary_text: string
  place_id: string
}

export const AddressSearch: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placeServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [showPredictions, setShowPredictions] = useState(false)
  const [value, setValue] = useState('')
  const { setCenter, setZoom } = useMapContext()

  useEffect(() => {
    if (window.google && window.google.maps) {
      autocompleteRef.current = new google.maps.places.AutocompleteService()
    }
  }, [])

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setValue(inputValue)

    if (inputValue.length < 2) {
      setPredictions([])
      setShowPredictions(false)
      return
    }

    if (!autocompleteRef.current) return

    try {
      const response = await autocompleteRef.current.getPlacePredictions({
        input: inputValue,
        componentRestrictions: { country: 'tw' },
        types: ['establishment'],
      })

      setPredictions(response.predictions || [])
      setShowPredictions(true)
    } catch (error) {
      console.error('Autocomplete error:', error)
      setPredictions([])
    }
  }

  const handlePredictionSelect = async (placeId: string) => {
    if (!window.google || !window.google.maps) return

    // Create a temporary map element to get PlacesService
    const tempDiv = document.createElement('div')
    const tempMap = new google.maps.Map(tempDiv)
    const placeService = new google.maps.places.PlacesService(tempMap)

    placeService.getDetails(
      {
        placeId,
        fields: ['geometry', 'formatted_address', 'name'],
      },
      (place) => {
        if (place && place.geometry && place.geometry.location) {
          setCenter({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          })
          setZoom(15)

          // Clear input and predictions
          setValue('')
          setPredictions([])
          setShowPredictions(false)
        }
      }
    )
  }

  return (
    <div className="relative w-full">
      <div className="flex items-center bg-white rounded-lg shadow-md">
        <input
          ref={inputRef}
          type="text"
          placeholder="搜尋地址..."
          value={value}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setShowPredictions(true)}
          className="flex-1 px-4 py-3 text-gray-700 placeholder-gray-400 focus:outline-none"
          aria-label="地址搜尋"
        />
        <button className="px-4 py-3 text-gray-400 hover:text-gray-600">
          🔍
        </button>
      </div>

      {/* Predictions dropdown */}
      {showPredictions && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handlePredictionSelect(prediction.place_id)}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors border-b last:border-b-0"
            >
              <div className="font-semibold text-gray-900">{prediction.main_text}</div>
              <div className="text-sm text-gray-600">{prediction.secondary_text}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default AddressSearch
