# 快速入門: 地圖瀏覽與探索

**功能**: 001-map-browsing
**日期**: 2025-12-03

## 前置條件

確保已完成以下設置：
- ✅ Firebase 專案已建立
- ✅ Firestore 資料庫已初始化
- ✅ Google Maps JavaScript API 已啟用
- ✅ Google Places API 已啟用

## 環境設置

### 1. 安裝相依套件

```bash
npm install @react-google-maps/api firebase
```

### 2. 環境變數

創建 `.env` 檔案：

```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 3. Firebase 初始化

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### 4. Firestore 安全規則

部署 `firestore.rules`：

```bash
firebase deploy --only firestore:rules
```

### 5. 初始化標籤資料

在 Firebase Console 或使用腳本創建預設標籤：

```typescript
// scripts/seedTags.ts
const defaultTags = [
  { id: 'vegan', name: '全素/蔬食', order: 1 },
  { id: 'organic', name: '有機農產', order: 2 },
  { id: 'eco-friendly', name: '環保商店', order: 3 },
  { id: 'second-hand', name: '二手/交換', order: 4 },
  { id: 'local', name: '在地小農', order: 5 },
  { id: 'zero-waste', name: '零廢棄', order: 6 },
];
```

## 核心流程

### 流程 1: 地圖載入與 GPS 定位

```
1. 頁面載入
2. 載入 Google Maps
3. 請求 GPS 權限
   ├── 成功 → 移動到使用者位置
   └── 失敗 → 顯示手動輸入 + 台灣全島視圖
4. 載入已核准地點
5. 顯示地點標記
```

### 流程 2: 查看地點詳情

```
1. 點擊地圖標記
2. 開啟底部詳情面板
3. 顯示：名稱、地址、描述、照片、標籤、登錄者
4. 關閉面板：向下滑動 / 點擊關閉按鈕 / 點擊外部
```

### 流程 3: 地址搜尋 (P2)

```
1. 點擊搜尋框
2. 輸入地址
3. 顯示 Google Places 建議
4. 選擇地址
5. 地圖移動到該位置
```

### 流程 4: 標籤篩選 (P2)

```
1. 查看標籤列
2. 點擊特定標籤
3. 地圖僅顯示該標籤的地點
4. 再次點擊或點擊「全部」取消篩選
```

## 關鍵元件

### 地圖容器

```tsx
// components/map/MapContainer.tsx
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useLocations } from '@/hooks/useLocations';

const TAIWAN_CENTER = { lat: 23.5, lng: 121 };
const LIBRARIES: Libraries = ['places'];

export function MapContainer() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });
  
  const { position, error: geoError } = useGeolocation();
  const { locations, loading } = useLocations();
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const center = position 
    ? { lat: position.coords.latitude, lng: position.coords.longitude }
    : TAIWAN_CENTER;

  if (!isLoaded) return <LoadingSpinner />;

  return (
    <div className="relative w-full h-screen">
      <GoogleMap
        mapContainerClassName="w-full h-full"
        center={center}
        zoom={position ? 14 : 7}
      >
        {locations.map(loc => (
          <Marker
            key={loc.id}
            position={{ lat: loc.coordinates.lat, lng: loc.coordinates.lng }}
            onClick={() => setSelectedLocation(loc)}
          />
        ))}
      </GoogleMap>
      
      {selectedLocation && (
        <LocationDetail 
          location={selectedLocation} 
          onClose={() => setSelectedLocation(null)} 
        />
      )}
    </div>
  );
}
```

### GPS 定位 Hook

```tsx
// hooks/useGeolocation.ts
export function useGeolocation() {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: '不支援定位' } as any);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => { setPosition(pos); setLoading(false); },
      (err) => { setError(err); setLoading(false); },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  return { position, error, loading };
}
```

### 地點查詢 Hook

```tsx
// hooks/useLocations.ts
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'locations'),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const locs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        coordinates: {
          lat: doc.data().coordinates.latitude,
          lng: doc.data().coordinates.longitude,
        },
      })) as Location[];
      
      setLocations(locs);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { locations, loading };
}
```

## 測試檢查清單

### P1 - GPS 定位
- [ ] GPS 權限請求正常顯示
- [ ] 允許權限後地圖移動到當前位置
- [ ] 拒絕權限後顯示友善提示
- [ ] GPS 超時時顯示錯誤訊息
- [ ] 預設顯示台灣全島視圖

### P1 - 地點詳情
- [ ] 點擊標記開啟詳情面板
- [ ] 顯示名稱、地址、描述
- [ ] 照片輪播正常運作
- [ ] 照片載入失敗顯示佔位圖
- [ ] 荒野夥伴顯示「團名-自然名」格式
- [ ] 向下滑動關閉面板
- [ ] 點擊關閉按鈕關閉面板

### P2 - 地址搜尋
- [ ] 搜尋框顯示正常
- [ ] 輸入時顯示 Google Places 建議
- [ ] 建議限制為台灣地區
- [ ] 選擇地址後地圖移動

### P2 - 標籤篩選
- [ ] 顯示所有標籤
- [ ] 點擊標籤篩選地點
- [ ] 選中標籤高亮顯示
- [ ] 點擊「全部」取消篩選

## 常見問題

### Q: Google Maps API 金鑰如何取得？
A: 前往 [Google Cloud Console](https://console.cloud.google.com/)，啟用 Maps JavaScript API 和 Places API，創建 API 金鑰並限制網域。

### Q: GPS 權限被拒絕後如何重新授權？
A: 使用者需在瀏覽器設定中手動允許位置權限。應用程式提供手動地址輸入作為替代方案。

### Q: 地圖載入緩慢怎麼辦？
A: 確保使用正確的 API 金鑰，檢查網路連線，考慮使用 CDN 載入地圖資源。

## 下一步

完成 Phase 1 後，使用 `/speckit.tasks` 生成詳細任務清單。
