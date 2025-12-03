import { useState, useEffect } from 'react'
import { Location } from '@/types/location'
import { subscribeToApprovedLocations } from '@/services/locationService'

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    try {
      const unsubscribe = subscribeToApprovedLocations((fetchedLocations) => {
        setLocations(fetchedLocations)
        setLoading(false)
      })

      return () => {
        unsubscribe()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch locations')
      setLoading(false)
    }
  }, [])

  return { locations, loading, error }
}
