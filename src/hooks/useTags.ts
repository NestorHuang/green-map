import { useState, useEffect } from 'react'
import { Tag } from '@/types/tag'
import { subscribeToTags } from '@/services/tagService'

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    try {
      const unsubscribe = subscribeToTags((fetchedTags) => {
        setTags(fetchedTags)
        setLoading(false)
      })

      return () => {
        unsubscribe()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags')
      setLoading(false)
    }
  }, [])

  return { tags, loading, error }
}
