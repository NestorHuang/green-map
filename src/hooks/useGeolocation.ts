import { useState, useEffect } from 'react'

export interface GeolocationState {
  position: { lat: number; lng: number } | null
  error: string | null
  loading: boolean
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: true,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        position: null,
        error: '您的瀏覽器不支援地位定位功能',
        loading: false,
      })
      return
    }

    const timeoutId = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        error: prev.error || '位置取得超時，請稍後重試',
        loading: false,
      }))
    }, 10000) // 10 second timeout

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId)
        setState({
          position: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          error: null,
          loading: false,
        })
      },
      (error) => {
        clearTimeout(timeoutId)
        let errorMessage = '無法取得位置資訊'

        if (error.code === 1) {
          errorMessage = '位置權限被拒絕。請在瀏覽器設定中允許位置存取。'
        } else if (error.code === 2) {
          errorMessage = '位置信息不可用。請確保您在室外或訊號良好的地方。'
        } else if (error.code === 3) {
          errorMessage = '位置取得超時'
        }

        setState({
          position: null,
          error: errorMessage,
          loading: false,
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )

    return () => clearTimeout(timeoutId)
  }, [])

  return state
}
