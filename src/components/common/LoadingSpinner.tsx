import React from 'react'

interface LoadingSpinnerProps {
  message?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = '載入中...' }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-50">
      <div className="w-12 h-12 border-4 border-gray-300 border-t-green-primary rounded-full animate-spin"></div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  )
}

export default LoadingSpinner
