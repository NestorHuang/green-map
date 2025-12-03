import React from 'react'
import { SubmitterInfo } from '@/types/location'
import { getSubmitterDisplay } from '@/utils/formatters'

interface SubmitterInfoProps {
  submitter: SubmitterInfo
}

export const SubmitterInfoComponent: React.FC<SubmitterInfoProps> = ({ submitter }) => {
  const displayName = getSubmitterDisplay(submitter)

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
      <span className="text-lg">👤</span>
      <span>
        {submitter.isWildernessPartner && (
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md mr-2 text-xs font-semibold">
            荒野夥伴
          </span>
        )}
        {displayName}
      </span>
    </div>
  )
}

export default SubmitterInfoComponent
