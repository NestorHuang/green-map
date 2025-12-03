# 實作計畫：地點提交與貢獻

**功能分支**: `003-location-contribution`
**規格版本**: 1.0.0
**計畫建立日期**: 2025-12-03

## 技術背景

### 使用的技術

| 技術 | 版本 | 用途 |
|------|------|------|
| React | 19 | 前端框架 |
| Vite | 7 | 建構工具 |
| Firebase Firestore | 12 | 地點資料儲存 |
| Firebase Storage | 12 | 照片儲存 |
| Google Places API | - | 地址自動完成 |
| Google Geocoding API | - | 地址轉經緯度 |
| React Hook Form | 7.x | 表單管理 |
| Zod | 3.x | 表單驗證 |
| @react-google-maps/api | 2.x | Places Autocomplete 整合 |

### 相依的功能

| 功能 | 狀態 | 影響 |
|------|------|------|
| Epic 002 使用者認證 | 前置條件 | 需要已登入且 Email 已驗證 |
| Firebase Storage 配置 | 前置條件 | 照片上傳需要 |
| Google APIs 啟用 | 前置條件 | 地址自動完成與 Geocoding |

### 專案結構

```
src/
├── components/
│   └── location/
│       ├── LocationSubmitForm.tsx    # 地點提交表單
│       ├── AddressAutocomplete.tsx   # 地址自動完成
│       ├── PhotoUploader.tsx         # 照片上傳器
│       ├── TagSelector.tsx           # 標籤選擇器
│       ├── LocationEditForm.tsx      # 地點編輯表單
│       └── SubmissionStatus.tsx      # 提交狀態顯示
├── pages/
│   ├── SubmitLocationPage.tsx        # 提交地點頁面
│   └── EditLocationPage.tsx          # 編輯地點頁面
├── hooks/
│   ├── useLocationSubmit.ts          # 地點提交 Hook
│   ├── useLocationEdit.ts            # 地點編輯 Hook
│   ├── useTags.ts                    # 標籤資料 Hook
│   └── useFormDraft.ts               # 表單草稿 Hook
└── utils/
    ├── geocoding.ts                  # Geocoding 工具
    ├── photoUpload.ts                # 照片上傳工具
    └── formDraft.ts                  # 草稿儲存工具
```

## 憲章合規檢查

### 原則對照

| 原則 | 狀態 | 實作方式 |
|------|------|----------|
| Community-First Development | ✅ 符合 | 荒野夥伴自動以「團名-自然名」格式顯示 |
| Security by Default | ✅ 符合 | Firestore Rules 限制只有已驗證使用者可提交、只能編輯自己的地點 |
| Mobile-First Design | ✅ 符合 | 表單設計優先考慮行動裝置、拍照上傳友善 |
| Data Integrity & Trust | ✅ 符合 | 所有提交需管理員審核、pending 狀態初始化 |
| User Story-Driven Development | ✅ 符合 | 依優先順序實作 P1 → P2 |

### 安全規則需求

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 地點集合
    match /locations/{locationId} {
      // 所有人可讀取已核准的地點
      allow read: if resource.data.status == 'approved';
      
      // 已驗證使用者可建立地點
      allow create: if request.auth != null 
        && request.auth.token.email_verified == true
        && validLocationCreate(request.resource.data);
      
      // 只能更新自己提交且狀態為 pending 的地點
      allow update: if request.auth != null 
        && request.auth.uid == resource.data.submittedBy
        && resource.data.status == 'pending'
        && validLocationUpdate(request.resource.data);
    }
    
    function validLocationCreate(data) {
      return data.status == 'pending'
        && data.submittedBy == request.auth.uid
        && data.name.size() >= 3 
        && data.name.size() <= 100
        && data.description.size() >= 10 
        && data.description.size() <= 1000
        && data.tagIds.size() >= 1 
        && data.tagIds.size() <= 5
        && data.photoURLs.size() >= 1 
        && data.photoURLs.size() <= 5;
    }
    
    function validLocationUpdate(data) {
      return data.status == 'pending'
        && data.submittedBy == resource.data.submittedBy;
    }
  }
}
```

## 複雜度追蹤

| 決策 | 複雜度等級 | 理由 |
|------|------------|------|
| localStorage 草稿儲存 | 低 | 簡單有效，無需後端支援 |
| 照片平行上傳 | 中 | 改善使用者體驗，但需處理部分失敗 |
| 地址 Geocoding | 低 | Google API 直接整合 |

## 風險與緩解

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| 照片上傳失敗 | 使用者無法提交 | 允許部分成功、提供重試機制 |
| Geocoding API 限流 | 無法取得座標 | 顯示錯誤訊息、建議稍後再試 |
| 網路中斷 | 資料遺失 | localStorage 草稿自動儲存 |
| 大量提交濫用 | 系統負擔 | 每日 10 個地點限制 |
