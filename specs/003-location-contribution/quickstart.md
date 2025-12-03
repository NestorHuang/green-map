# 快速開始指南：地點提交與貢獻

**功能分支**: `003-location-contribution`
**建立日期**: 2025-12-03

## 環境設定

### 1. 相依套件

```bash
# 已在 Epic 001/002 安裝的套件
# react-hook-form, @hookform/resolvers, zod
# @react-google-maps/api

# 無需額外安裝
```

### 2. Google APIs 確認

確保以下 API 已啟用：
- Google Places API
- Google Geocoding API
- Google Maps JavaScript API

### 3. 預設標籤資料

在 Firebase Console 或使用以下指令碼初始化標籤：

```typescript
// scripts/init-tags.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const tags = [
  { id: 'vegan', name: '全素/蔬食' },
  { id: 'organic', name: '有機' },
  { id: 'local-produce', name: '在地食材' },
  { id: 'zero-waste', name: '零廢棄' },
  { id: 'eco-friendly', name: '環保用品' },
  { id: 'secondhand', name: '二手商店' },
  { id: 'repair', name: '維修服務' },
  { id: 'bulk-buying', name: '裸買商店' },
  { id: 'sustainable-fashion', name: '永續時尚' },
  { id: 'green-space', name: '綠色空間' },
];

initializeApp({ credential: cert('./service-account.json') });
const db = getFirestore();

async function initTags() {
  const batch = db.batch();
  for (const tag of tags) {
    batch.set(db.doc(`tags/${tag.id}`), {
      name: tag.name,
      createdAt: new Date(),
      createdBy: 'system',
    });
  }
  await batch.commit();
  console.log('Tags initialized');
}

initTags();
```

## 核心程式碼範例

### 地址自動完成元件

```typescript
// src/components/location/AddressAutocomplete.tsx
import { useState, useCallback } from 'react';
import { Autocomplete } from '@react-google-maps/api';

interface AddressResult {
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (result: AddressResult) => void;
  error?: string;
}

export const AddressAutocomplete = ({ 
  value, 
  onChange, 
  onAddressSelect, 
  error 
}: Props) => {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const onLoad = useCallback((ac: google.maps.places.Autocomplete) => {
    setAutocomplete(ac);
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (!autocomplete) return;
    
    const place = autocomplete.getPlace();
    if (!place.geometry?.location) return;

    onAddressSelect({
      address: place.formatted_address || '',
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    });
  }, [autocomplete, onAddressSelect]);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">地址</label>
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{
          componentRestrictions: { country: 'tw' },
          types: ['establishment'],
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="輸入地址或地點名稱"
          className={`
            w-full p-3 border rounded-md
            ${error ? 'border-red-500' : 'border-gray-300'}
          `}
        />
      </Autocomplete>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};
```

### 照片上傳元件

```typescript
// src/components/location/PhotoUploader.tsx
import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

interface PhotoFile {
  file: File;
  preview: string;
  url?: string;
  error?: string;
  uploading?: boolean;
}

interface Props {
  locationId: string;
  photos: PhotoFile[];
  onChange: (photos: PhotoFile[]) => void;
  maxPhotos?: number;
  maxSize?: number; // MB
}

export const PhotoUploader = ({ 
  locationId, 
  photos, 
  onChange, 
  maxPhotos = 5,
  maxSize = 5,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = maxPhotos - photos.length;
    const newFiles = files.slice(0, remainingSlots);

    const newPhotos: PhotoFile[] = newFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      error: validateFile(file, maxSize),
    }));

    onChange([...photos, ...newPhotos]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const validateFile = (file: File, maxSizeMB: number): string | undefined => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      return '僅支援 JPEG 和 PNG 格式';
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `檔案大小不可超過 ${maxSizeMB}MB`;
    }
    return undefined;
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    onChange(newPhotos);
  };

  const uploadPhoto = async (index: number) => {
    const photo = photos[index];
    if (photo.error || photo.url) return;

    const newPhotos = [...photos];
    newPhotos[index] = { ...photo, uploading: true };
    onChange(newPhotos);

    try {
      const fileName = `${Date.now()}-${photo.file.name}`;
      const storageRef = ref(storage, `locations/${locationId}/${fileName}`);
      await uploadBytes(storageRef, photo.file);
      const url = await getDownloadURL(storageRef);

      newPhotos[index] = { ...photo, url, uploading: false };
    } catch (error) {
      newPhotos[index] = { 
        ...photo, 
        error: '上傳失敗，請重試', 
        uploading: false 
      };
    }
    onChange(newPhotos);
  };

  const uploadAllPhotos = async () => {
    await Promise.all(photos.map((_, i) => uploadPhoto(i)));
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        照片 ({photos.length}/{maxPhotos})
      </label>
      
      <div className="grid grid-cols-3 gap-2 mb-2">
        {photos.map((photo, index) => (
          <div key={index} className="relative aspect-square">
            <img 
              src={photo.preview} 
              alt="" 
              className="w-full h-full object-cover rounded-md"
            />
            {photo.uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white">上傳中...</span>
              </div>
            )}
            {photo.error && (
              <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1">
                {photo.error}
              </div>
            )}
            {photo.url && (
              <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                ✓
              </div>
            )}
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-5 h-5"
            >
              ×
            </button>
          </div>
        ))}
        
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center"
          >
            <span className="text-gray-400 text-2xl">+</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-sm text-gray-500">
        至少 1 張，最多 {maxPhotos} 張照片，每張不超過 {maxSize}MB
      </p>
    </div>
  );
};
```

### 標籤選擇器

```typescript
// src/components/location/TagSelector.tsx
import { useTags } from '@/hooks/useTags';

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  min?: number;
  max?: number;
  error?: string;
}

export const TagSelector = ({ 
  selectedIds, 
  onChange, 
  min = 1, 
  max = 5,
  error,
}: Props) => {
  const { tags, loading } = useTags();

  const toggle = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter(id => id !== tagId));
    } else if (selectedIds.length < max) {
      onChange([...selectedIds, tagId]);
    }
  };

  if (loading) return <div>載入標籤中...</div>;

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        綠活標籤（選擇 {min}-{max} 個）
      </label>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            className={`
              px-4 py-2 rounded-full border text-sm transition-colors
              ${selectedIds.includes(tag.id)
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
              }
            `}
          >
            {tag.name}
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-500 mt-1">
        已選擇 {selectedIds.length}/{max} 個標籤
      </p>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};
```

### 表單草稿 Hook

```typescript
// src/hooks/useFormDraft.ts
import { useEffect, useCallback } from 'react';

const DRAFT_KEY = 'location-submit-draft';
const DRAFT_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

interface LocationDraft {
  name: string;
  address: string;
  coordinates: { lat: number; lng: number } | null;
  description: string;
  tagIds: string[];
  savedAt: number;
}

export const useFormDraft = () => {
  const saveDraft = useCallback((data: Omit<LocationDraft, 'savedAt'>) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...data,
      savedAt: Date.now(),
    }));
  }, []);

  const loadDraft = useCallback((): LocationDraft | null => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return null;
    
    try {
      const draft = JSON.parse(saved) as LocationDraft;
      // 檢查是否過期
      if (Date.now() - draft.savedAt > DRAFT_EXPIRY) {
        localStorage.removeItem(DRAFT_KEY);
        return null;
      }
      return draft;
    } catch {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  const hasDraft = useCallback(() => {
    return loadDraft() !== null;
  }, [loadDraft]);

  return { saveDraft, loadDraft, clearDraft, hasDraft };
};
```

### 地點提交 Hook

```typescript
// src/hooks/useLocationSubmit.ts
import { useState } from 'react';
import { collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { CreateLocationRequest, SubmitterInfo } from '@/types';

export const useLocationSubmit = () => {
  const { user, isWildernessPartner } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildSubmitterInfo = async (): Promise<SubmitterInfo> => {
    // 從 AuthContext 或 Firestore 取得使用者資訊
    const userDoc = await getDoc(doc(db, 'users', user!.uid));
    const userData = userDoc.data()!;
    
    const formattedName = isWildernessPartner && userData.wildernessInfo
      ? `${userData.wildernessInfo.chapter}-${userData.wildernessInfo.natureName}`
      : userData.displayName;

    return {
      userId: user!.uid,
      displayName: userData.displayName,
      isWildernessPartner,
      formattedName,
    };
  };

  const submit = async (data: CreateLocationRequest): Promise<string> => {
    if (!user) throw new Error('未登入');
    if (!user.emailVerified) throw new Error('請先驗證 Email');

    setSubmitting(true);
    setError(null);

    try {
      const submitterInfo = await buildSubmitterInfo();

      const docRef = await addDoc(collection(db, 'locations'), {
        ...data,
        coordinates: new GeoPoint(data.coordinates.lat, data.coordinates.lng),
        status: 'pending',
        submittedBy: user.uid,
        submitterInfo,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : '提交失敗';
      setError(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting, error };
};
```

## 開發流程

### 1. 部署 Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

### 2. 部署 Storage Security Rules

```bash
firebase deploy --only storage
```

### 3. 初始化標籤資料

```bash
npx ts-node scripts/init-tags.ts
```

## 測試清單

### P1 功能測試

- [ ] 地點提交流程
  - [ ] 填寫地點名稱、描述
  - [ ] 地址自動完成並取得座標
  - [ ] 上傳 1-5 張照片
  - [ ] 選擇 1-5 個標籤
  - [ ] 提交成功，狀態為 pending
  - [ ] 荒野夥伴顯示「團名-自然名」

- [ ] 編輯待審核地點
  - [ ] 可編輯自己的 pending 地點
  - [ ] 無法編輯已核准/已拒絕的地點
  - [ ] 無法編輯他人的地點

- [ ] 表單草稿
  - [ ] 離開頁面自動儲存
  - [ ] 重新開啟自動恢復
  - [ ] 提交成功後清除草稿

### P2 功能測試

- [ ] 提交狀態通知
  - [ ] 核准時顯示通知
  - [ ] 拒絕時顯示原因
