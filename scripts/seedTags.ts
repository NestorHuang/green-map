import { initializeApp } from 'firebase/app'
import { getFirestore, collection, writeBatch, doc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const DEFAULT_TAGS = [
  { id: 'vegan', name: '全素/蔬食', order: 1 },
  { id: 'organic', name: '有機農產', order: 2 },
  { id: 'eco-friendly', name: '環保商店', order: 3 },
  { id: 'second-hand', name: '二手/交換', order: 4 },
  { id: 'local', name: '在地小農', order: 5 },
  { id: 'zero-waste', name: '零廢棄', order: 6 },
]

async function seedTags() {
  try {
    const batch = writeBatch(db)
    const tagsRef = collection(db, 'tags')

    for (const tag of DEFAULT_TAGS) {
      const docRef = doc(tagsRef, tag.id)
      batch.set(docRef, {
        id: tag.id,
        name: tag.name,
        order: tag.order,
      })
    }

    await batch.commit()
    console.log('✅ Tags seeded successfully')
  } catch (error) {
    console.error('❌ Error seeding tags:', error)
    process.exit(1)
  }
}

seedTags()
