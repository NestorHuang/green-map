# 技術研究：地點提交與貢獻

**功能分支**: `003-location-contribution`
**研究日期**: 2025-12-03

## 1. Google Places Autocomplete 整合

### 決策

使用 `@react-google-maps/api` 的 `Autocomplete` 元件實作地址自動完成。

### 理由

- 與 Epic 001 共用同一個 Google Maps 函式庫
- 提供原生整合，無需額外 API 呼叫
- 支援台灣地址的繁體中文輸入

### 實作細節

```typescript
import { Autocomplete } from '@react-google-maps/api';

const AddressAutocomplete = ({ onAddressSelect }) => {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setAutocomplete(autocomplete);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      onAddressSelect({
        address: place.formatted_address,
        lat: place.geometry?.location?.lat(),
        lng: place.geometry?.location?.lng(),
      });
    }
  };

  return (
    <Autocomplete
      onLoad={onLoad}
      onPlaceChanged={onPlaceChanged}
      options={{
        componentRestrictions: { country: 'tw' },
        types: ['establishment'],
      }}
    >
      <input type="text" placeholder="輸入地址或地點名稱" />
    </Autocomplete>
  );
};
```

### 考慮的替代方案

| 方案 | 優點 | 缺點 |
|------|------|------|
| 原生 Google Maps API | 更多控制 | 更複雜的整合 |
| 其他地址服務 | 可能更便宜 | 台灣地址支援差 |
| 純 Geocoding (無自動完成) | 更簡單 | 使用者體驗差 |

---

## 2. 照片上傳策略

### 決策

使用前端直接上傳到 Firebase Storage，支援多檔案平行上傳，並處理部分失敗情況。

### 理由

- 前端直接上傳減少伺服器負擔
- 平行上傳改善使用者體驗
- 部分失敗處理確保資料完整性

### 實作細節

```typescript
interface UploadResult {
  file: File;
  url?: string;
  error?: string;
}

const uploadPhotos = async (
  files: File[],
  locationId: string,
  onProgress: (progress: number) => void
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  let completed = 0;

  await Promise.all(
    files.map(async (file) => {
      try {
        const fileName = `${Date.now()}-${file.name}`;
        const storageRef = ref(storage, `locations/${locationId}/${fileName}`);
        
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        results.push({ file, url });
      } catch (error) {
        results.push({ 
          file, 
          error: error instanceof Error ? error.message : '上傳失敗' 
        });
      } finally {
        completed++;
        onProgress((completed / files.length) * 100);
      }
    })
  );

  return results;
};
```

### 考慮的替代方案

| 方案 | 優點 | 缺點 |
|------|------|------|
| 循序上傳 | 實作簡單 | 速度慢 |
| Cloud Function 處理 | 可做圖片壓縮 | 增加複雜度、延遲 |
| 第三方服務 (Cloudinary) | 功能豐富 | 額外成本 |

---

## 3. 表單草稿儲存機制

### 決策

使用 `localStorage` 儲存表單草稿，在頁面離開時自動儲存，重新開啟時自動恢復。

### 理由

- 簡單有效，無需後端支援
- 使用者可能因各種原因中斷填寫
- 照片不納入草稿（避免儲存空間問題）

### 實作細節

```typescript
const DRAFT_KEY = 'location-submit-draft';

interface LocationDraft {
  name: string;
  address: string;
  coordinates: { lat: number; lng: number } | null;
  description: string;
  tagIds: string[];
  savedAt: number;
}

const useFormDraft = () => {
  const saveDraft = (data: Omit<LocationDraft, 'savedAt'>) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...data,
      savedAt: Date.now(),
    }));
  };

  const loadDraft = (): LocationDraft | null => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return null;
    
    const draft = JSON.parse(saved) as LocationDraft;
    // 草稿超過 7 天則過期
    if (Date.now() - draft.savedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  return { saveDraft, loadDraft, clearDraft };
};
```

### 考慮的替代方案

| 方案 | 優點 | 缺點 |
|------|------|------|
| IndexedDB | 可儲存更多資料 | 過度複雜 |
| Firestore 草稿集合 | 跨裝置同步 | 增加成本與複雜度 |
| Session Storage | 更安全 | 關閉瀏覽器即遺失 |

---

## 4. 每日提交限制實作

### 決策

使用 Firestore 查詢計算當日提交數量，在前端和安全規則中雙重驗證。

### 理由

- 防止濫用
- 保護系統資源
- 給予管理員合理的審核量

### 實作細節

```typescript
const checkDailyLimit = async (userId: string): Promise<boolean> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const q = query(
    collection(db, 'locations'),
    where('submittedBy', '==', userId),
    where('createdAt', '>=', Timestamp.fromDate(today))
  );
  
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count < 10;
};
```

```javascript
// Firestore Security Rules
function canSubmitToday() {
  let today = request.time.date();
  let todayCount = getCount(
    /databases/$(database)/documents/locations
    .where('submittedBy', '==', request.auth.uid)
    .where('createdAt', '>=', today)
  );
  return todayCount < 10;
}
```

---

## 5. 標籤選擇器設計

### 決策

使用多選 Chip 元件，支援 1-5 個標籤選擇。

### 理由

- 直覺的視覺呈現
- 觸控友善（行動裝置）
- 明確顯示選擇狀態

### 實作細節

```typescript
interface Tag {
  id: string;
  name: string;
}

const TagSelector = ({ 
  tags, 
  selectedIds, 
  onChange,
  min = 1,
  max = 5,
}: Props) => {
  const toggle = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter(id => id !== tagId));
    } else if (selectedIds.length < max) {
      onChange([...selectedIds, tagId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <button
          key={tag.id}
          type="button"
          onClick={() => toggle(tag.id)}
          className={`
            px-4 py-2 rounded-full border text-sm
            ${selectedIds.includes(tag.id)
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-700 border-gray-300'
            }
          `}
        >
          {tag.name}
        </button>
      ))}
      <p className="w-full text-sm text-gray-500">
        已選擇 {selectedIds.length}/{max} 個標籤（至少 {min} 個）
      </p>
    </div>
  );
};
```

---

## 6. 提交者資訊處理

### 決策

在提交時自動填入提交者資訊，荒野夥伴使用「團名-自然名」格式。

### 理由

- 符合憲章 Community-First Development 原則
- 自動處理減少使用者輸入
- 確保格式一致性

### 實作細節

```typescript
const buildSubmitterInfo = async (user: User): Promise<SubmitterInfo> => {
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data() as UserDocument;

  const isWildernessPartner = userData.isWildernessPartner;
  const formattedName = isWildernessPartner && userData.wildernessInfo
    ? `${userData.wildernessInfo.chapter}-${userData.wildernessInfo.natureName}`
    : userData.displayName;

  return {
    userId: user.uid,
    displayName: userData.displayName,
    isWildernessPartner,
    formattedName,
  };
};
```

---

## 7. 編輯權限控制

### 決策

只允許編輯狀態為 `pending` 的自己提交的地點。

### 理由

- 符合規格要求
- 防止修改已審核的資料
- 透過 Firestore Security Rules 強制執行

### 實作細節

```typescript
const canEditLocation = (location: Location, userId: string): boolean => {
  return location.submittedBy === userId && location.status === 'pending';
};

// 在元件中使用
const EditLocationPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: location } = useLocation(id);

  if (!location || !canEditLocation(location, user.uid)) {
    return <Navigate to="/profile/submissions" />;
  }

  return <LocationEditForm location={location} />;
};
```

---

## 8. 檔案驗證策略

### 決策

前端驗證檔案類型、大小，顯示即時錯誤回饋。

### 理由

- 即時回饋改善使用者體驗
- 減少無效的上傳請求
- Storage Rules 作為最終防線

### 實作細節

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const validateFile = (file: File): ValidationResult => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: '僅支援 JPEG 和 PNG 格式' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: '檔案大小不可超過 5MB' };
  }
  return { valid: true };
};
```
