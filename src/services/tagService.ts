import {
  collection,
  query,
  orderBy,
  getDocs,
  onSnapshot,
  Firestore,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Tag } from '@/types/tag'

const TAGS_COLLECTION = 'tags'

export async function getTags(customDb?: Firestore): Promise<Tag[]> {
  const database = customDb || db
  const q = query(collection(database, TAGS_COLLECTION), orderBy('order', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Tag))
}

export function subscribeToTags(
  callback: (tags: Tag[]) => void,
  customDb?: Firestore
): (() => void) {
  const database = customDb || db
  const q = query(collection(database, TAGS_COLLECTION), orderBy('order', 'asc'))

  return onSnapshot(q, (snapshot) => {
    const tags = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Tag))
    callback(tags)
  })
}

export async function getTagById(id: string, customDb?: Firestore): Promise<Tag | null> {
  const tags = await getTags(customDb)
  return tags.find((tag) => tag.id === id) || null
}
