import { GeoPoint, Timestamp } from 'firebase/firestore'

export interface SubmitterInfo {
  userId: string
  displayName: string
  isWildernessPartner: boolean
  groupName?: string
  natureName?: string
}

export type LocationStatus = 'pending' | 'approved' | 'rejected'

export interface Location {
  id: string
  name: string
  address: string
  coordinates: GeoPoint
  description?: string
  photos: string[]
  tagIds: string[]
  status: LocationStatus
  submitter: SubmitterInfo
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface LocationWithLatLng extends Omit<Location, 'coordinates'> {
  coordinates: {
    lat: number
    lng: number
  }
}
