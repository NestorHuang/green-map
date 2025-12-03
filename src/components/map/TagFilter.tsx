import React from 'react'
import { Tag } from '@/types/tag'
import { useMapContext } from '@/contexts/MapContext'

interface TagFilterProps {
  tags: Tag[]
}

export const TagFilter: React.FC<TagFilterProps> = ({ tags }) => {
  const { selectedTagId, setSelectedTagId } = useMapContext()

  const handleTagClick = (tagId: string) => {
    if (selectedTagId === tagId) {
      setSelectedTagId(null)
    } else {
      setSelectedTagId(tagId)
    }
  }

  const handleShowAll = () => {
    setSelectedTagId(null)
  }

  return (
    <div className="w-full bg-white border-b">
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {/* Show All button */}
          <button
            onClick={handleShowAll}
            className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
              selectedTagId === null
                ? 'bg-green-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            全部
          </button>

          {/* Tag buttons */}
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.id)}
              className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
                selectedTagId === tag.id
                  ? 'bg-green-primary text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TagFilter
