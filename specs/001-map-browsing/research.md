# 研究報告: 地圖瀏覽與探索

**功能**: 001-map-browsing
**日期**: 2025-12-03
**狀態**: 完成

## 研究任務

本報告解決實作計劃中識別的技術問題和最佳實踐。

---

## 1. React Google Maps 整合方案

### 決策: @react-google-maps/api

### 理由
- 官方維護的 React 整合庫，與 Google Maps JavaScript API 完美整合
- 支援 React 19 Hooks 模式
- 提供 TypeScript 類型定義
- 輕量級，僅包裝必要功能

### 考慮過的替代方案
| 替代方案 | 拒絕原因 |
|---------|---------|
| google-maps-react | 已不再積極維護，不支援最新 React |
| react-google-maps (old) | 已棄用，推薦使用 @react-google-maps/api |
| 直接使用 Google Maps API | 需要手動管理生命週期，增加複雜度 |

### 實作模式
```typescript
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const LIBRARIES: Libraries = ['places'];

export function MapContainer() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  if (loadError) return <ErrorMessage message="地圖載入失敗" />;
  if (!isLoaded) return <LoadingSpinner />;

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={center}
      zoom={14}
      options={mapOptions}
    >
      {locations.map(loc => (
        <Marker key={loc.id} position={loc.coordinates} onClick={() => onMarkerClick(loc)} />
      ))}
    </GoogleMap>
  );
}
```

---

## 2. GPS 定位最佳實踐

### 決策: Geolocation API + 漸進式降級

### 理由
- 瀏覽器原生 API，無需額外相依
- 支援高精度定位（enableHighAccuracy）
- 提供超時和錯誤處理機制

### 漸進式降級策略
```
1. 請求 GPS 權限
   ├── 成功 → 移動到使用者位置
   └── 失敗
       ├── 權限被拒 → 顯示手動地址輸入
       ├── 超時/錯誤 → 顯示錯誤訊息 + 手動輸入
       └── 使用者未輸入 → 顯示台灣全島視圖
```

### 實作模式
```typescript
// hooks/useGeolocation.ts
export function useGeolocation() {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: '瀏覽器不支援定位功能' } as GeolocationPositionError);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(pos);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  }, []);

  return { position, error, loading };
}
```

---

## 3. 詳情面板 UI 模式

### 決策: 底部彈出面板 + 滑動關閉

### 理由
- 符合現代行動 UX 標準（Google Maps, Apple Maps 風格）
- 不遮擋整個地圖，使用者仍可見標記位置
- 支援觸控手勢（向下滑動關閉）
- 桌面版提供關閉按鈕和點擊外部關閉

### 考慮過的替代方案
| 替代方案 | 拒絕原因 |
|---------|---------|
| 全螢幕 Modal | 完全遮擋地圖，失去位置上下文 |
| 側邊面板 | 行動裝置上不友好 |
| 標記內 InfoWindow | 空間有限，無法顯示完整資訊 |

### 實作模式
```typescript
// components/map/LocationDetail.tsx
export function LocationDetail({ location, onClose }: Props) {
  const [startY, setStartY] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endY = e.changedTouches[0].clientY;
    if (endY - startY > 100) { // 向下滑動超過 100px
      onClose();
    }
  };

  return (
    <div
      ref={panelRef}
      className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg 
                 max-h-[70vh] overflow-y-auto z-50 transition-transform"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 拖曳指示器 */}
      <div className="flex justify-center py-2">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>
      
      {/* 關閉按鈕 */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-2 min-w-[44px] min-h-[44px]"
        aria-label="關閉"
      >
        ✕
      </button>
      
      {/* 內容 */}
      <div className="px-4 pb-6">
        <h2 className="text-xl font-bold">{location.name}</h2>
        {/* ... */}
      </div>
    </div>
  );
}
```

---

## 4. Firestore 查詢優化

### 決策: 簡單查詢 + 客戶端篩選

### 理由
- 地點數量初期較少（100-500），客戶端篩選效能足夠
- 避免複合索引維護成本
- Firestore GeoPoint 不支援地理範圍查詢（需 GeoFire）

### 查詢策略
```typescript
// 查詢所有已核准地點（一次載入）
const q = query(
  collection(db, 'locations'),
  where('status', '==', 'approved')
);

// 客戶端篩選標籤
const filteredLocations = locations.filter(loc => 
  selectedTagId ? loc.tagIds.includes(selectedTagId) : true
);
```

### 未來優化（當地點 > 1000 時）
- 使用 GeoHash 進行地理範圍查詢
- 實作 Marker Clustering
- 分頁載入可視區域內的地點

---

## 5. Google Places Autocomplete 整合

### 決策: 限定台灣 + 營業場所類型

### 理由
- 符合規格需求：搜尋範圍限制為台灣
- 營業場所類型更符合綠色生活地點的搜尋意圖
- 減少不相關的搜尋結果

### 實作模式
```typescript
// components/map/AddressSearch.tsx
import { Autocomplete } from '@react-google-maps/api';

export function AddressSearch({ onPlaceSelected }: Props) {
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const onLoad = (ac: google.maps.places.Autocomplete) => {
    setAutocomplete(ac);
  };

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        onPlaceSelected({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
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
      <input
        type="text"
        placeholder="搜尋地址或地點..."
        className="w-full px-4 py-3 rounded-lg shadow-md"
      />
    </Autocomplete>
  );
}
```

---

## 6. 標籤篩選 UI 模式

### 決策: 水平滾動標籤列

### 理由
- 行動優先：水平滾動適合觸控操作
- 節省垂直空間，不遮擋地圖
- 高亮顯示選中標籤，清楚的視覺回饋

### 實作模式
```typescript
// components/map/TagFilter.tsx
export function TagFilter({ tags, selectedTagId, onTagSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
      <button
        onClick={() => onTagSelect(null)}
        className={`px-4 py-2 rounded-full whitespace-nowrap min-h-[44px]
          ${!selectedTagId ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
      >
        全部
      </button>
      {tags.map(tag => (
        <button
          key={tag.id}
          onClick={() => onTagSelect(tag.id)}
          className={`px-4 py-2 rounded-full whitespace-nowrap min-h-[44px]
            ${selectedTagId === tag.id ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}
```

---

## 7. 照片輪播實作

### 決策: 原生 CSS Scroll Snap + 指示器

### 理由
- 無需額外相依（不使用 Swiper 等庫）
- CSS Scroll Snap 支援良好，效能優秀
- 輕量級實作

### 實作模式
```typescript
// components/location/PhotoCarousel.tsx
export function PhotoCarousel({ photos, fallbackImage }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className="relative">
      <div 
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        onScroll={(e) => {
          const index = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth);
          setCurrentIndex(index);
        }}
      >
        {photos.map((photo, i) => (
          <img
            key={i}
            src={photo}
            alt={`照片 ${i + 1}`}
            className="w-full flex-shrink-0 snap-center object-cover h-48"
            onError={(e) => {
              e.currentTarget.src = fallbackImage;
            }}
          />
        ))}
      </div>
      
      {/* 指示器 */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
        {photos.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${i === currentIndex ? 'bg-white' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 8. 預設位置策略

### 決策: 台灣全島視圖

### 理由
- 當 GPS 失敗且使用者未輸入地址時，顯示完整地圖
- 讓使用者自行選擇感興趣的區域
- 縮放層級確保所有地點標記可見

### 預設座標
```typescript
const TAIWAN_CENTER = { lat: 23.5, lng: 121 };
const TAIWAN_ZOOM = 7; // 可見全島

const DEFAULT_CENTER = TAIWAN_CENTER;
const DEFAULT_ZOOM = TAIWAN_ZOOM;
```

---

## 結論

所有技術問題已解決，可進入 Phase 1 設計階段。主要技術選擇：

1. **地圖整合**: @react-google-maps/api
2. **GPS 定位**: 原生 Geolocation API + 漸進式降級
3. **詳情面板**: 底部彈出面板 + 滑動關閉
4. **資料查詢**: Firestore 簡單查詢 + 客戶端篩選
5. **地址搜尋**: Google Places Autocomplete（限台灣）
6. **標籤篩選**: 水平滾動標籤列
7. **照片輪播**: CSS Scroll Snap
