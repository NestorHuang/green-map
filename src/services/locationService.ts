import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  QueryConstraint,
  Firestore,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Location } from '@/types/location'

const LOCATIONS_COLLECTION = 'locations'

export async function getApprovedLocations(customDb?: Firestore): Promise<Location[]> {
  const database = customDb || db
  const q = query(
    collection(database, LOCATIONS_COLLECTION),
    where('status', '==', 'approved')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Location))
}

export function subscribeToApprovedLocations(
  callback: (locations: Location[]) => void,
  customDb?: Firestore
): (() => void) {
  const database = customDb || db
  const q = query(
    collection(database, LOCATIONS_COLLECTION),
    where('status', '==', 'approved')
  )

  return onSnapshot(q, (snapshot) => {
    const locations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Location))
    callback(locations)
  })
}

export async function getLocationById(
  id: string,
  customDb?: Firestore
): Promise<Location | null> {
  const database = customDb || db
  const snapshot = await getDocs(
    query(
      collection(database, LOCATIONS_COLLECTION),
      where('__name__', '==', id)
    )
  )

  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  return {
    id: doc.id,
    ...doc.data(),
  } as Location
}
