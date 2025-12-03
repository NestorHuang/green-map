# 技術研究：地點資訊錯誤回報

**功能分支**: `004-error-reporting`
**研究日期**: 2025-12-03

## 1. 冷卻機制實作

### 決策

使用混合模式：Firestore `/users/{uid}.lastReportedAt` 為權威來源，localStorage 作為快取提升 UX。

### 理由

- Firestore 確保跨裝置一致性，無法繞過
- localStorage 避免每次都查詢 Firestore，改善回應速度
- 15 分鐘冷卻有效減緩惡意大量提交

### 實作細節

```typescript
// src/hooks/useReportCooldown.ts
const COOLDOWN_DURATION = 15 * 60 * 1000; // 15 分鐘
const STORAGE_KEY = 'lastReportedAt';

export const useReportCooldown = () => {
  const { user } = useAuth();
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [checking, setChecking] = useState(true);

  // 檢查冷卻狀態
  const checkCooldown = async (): Promise<boolean> => {
    // 先檢查 localStorage 快取
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const lastReported = parseInt(cached);
      const elapsed = Date.now() - lastReported;
      if (elapsed < COOLDOWN_DURATION) {
        setRemainingTime(COOLDOWN_DURATION - elapsed);
        return false;
      }
    }

    // 快取不存在或已過期，查詢 Firestore
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const lastReportedAt = userDoc.data()?.lastReportedAt?.toMillis();
      
      if (lastReportedAt) {
        const elapsed = Date.now() - lastReportedAt;
        if (elapsed < COOLDOWN_DURATION) {
          // 同步到 localStorage
          localStorage.setItem(STORAGE_KEY, lastReportedAt.toString());
          setRemainingTime(COOLDOWN_DURATION - elapsed);
          return false;
        }
      }
    }

    setRemainingTime(0);
    return true;
  };

  // 更新冷卻時間
  const updateCooldown = async () => {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, now.toString());
    
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), {
        lastReportedAt: serverTimestamp(),
      });
    }
    
    setRemainingTime(COOLDOWN_DURATION);
  };

  return { remainingTime, checking, checkCooldown, updateCooldown };
};
```

### 考慮的替代方案

| 方案 | 優點 | 缺點 |
|------|------|------|
| 僅 localStorage | 實作簡單 | 可被繞過、無法跨裝置 |
| 僅 Firestore | 最安全 | 每次檢查需查詢 DB |
| Rate Limiting (Cloud Function) | 更精確 | 增加複雜度與成本 |

---

## 2. 重複回報檢測

### 決策

檢測相同使用者 + 相同地點 + 未處理狀態（pending）的回報。

### 理由

- 平衡資料品質與使用者體驗
- 允許不同使用者回報相同問題有助於驗證
- 若先前回報已處理但問題再次發生，使用者可再次回報

### 實作細節

```typescript
const checkDuplicateReport = async (
  userId: string,
  locationId: string
): Promise<boolean> => {
  const q = query(
    collection(db, 'error_reports'),
    where('reportedBy', '==', userId),
    where('locationId', '==', locationId),
    where('status', '==', 'pending'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};
```

---

## 3. 錯誤類型設計

### 決策

提供預設錯誤類型選項，「其他」類型必填詳細說明。

### 理由

- 預設選項減少使用者輸入負擔
- 結構化類型便於管理員快速分類處理
- 「其他」選項確保靈活性

### 實作細節

```typescript
export const ERROR_TYPES = [
  { value: 'closed', label: '已歇業' },
  { value: 'address_error', label: '地址錯誤' },
  { value: 'phone_error', label: '電話錯誤' },
  { value: 'description_mismatch', label: '描述不符' },
  { value: 'photo_mismatch', label: '照片不符' },
  { value: 'other', label: '其他' },
] as const;

export type ErrorType = typeof ERROR_TYPES[number]['value'];
```

---

## 4. 模態視窗設計

### 決策

使用底部彈出式模態視窗，適配行動裝置操作。

### 理由

- 底部彈出符合行動裝置使用習慣
- 不離開當前頁面，保持地點上下文
- 表單簡潔，快速完成回報

### 實作細節

```typescript
// src/components/error-report/ErrorReportModal.tsx
export const ErrorReportModal = ({ 
  isOpen, 
  onClose, 
  location 
}: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* 模態視窗 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-auto">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        
        <h2 className="text-lg font-bold mb-4">
          回報「{location.name}」資訊有誤
        </h2>
        
        <ErrorReportForm 
          locationId={location.id} 
          locationName={location.name}
          onSuccess={onClose}
        />
      </div>
    </div>
  );
};
```

---

## 5. 回報狀態管理

### 決策

使用三種狀態：`pending`（待處理）、`resolved`（已處理）、`ignored`（已忽略）。

### 理由

- 清晰區分未處理與已處理
- 區分「問題已解決」與「回報被忽略」
- 提供使用者明確的回饋

### 實作細節

```typescript
export type ReportStatus = 'pending' | 'resolved' | 'ignored';

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: '待處理',
  resolved: '已處理',
  ignored: '已忽略',
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  ignored: 'bg-gray-100 text-gray-800',
};
```

---

## 6. 回報列表查詢

### 決策

使用 Firestore 查詢按時間倒序排列，支援狀態篩選。

### 理由

- 最新回報優先顯示
- 篩選功能幫助使用者快速找到特定狀態的回報

### 實作細節

```typescript
// src/hooks/useMyReports.ts
export const useMyReports = (statusFilter?: ReportStatus) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let q = query(
      collection(db, 'error_reports'),
      where('reportedBy', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    if (statusFilter) {
      q = query(q, where('status', '==', statusFilter));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ErrorReport[];
      setReports(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, statusFilter]);

  return { reports, loading };
};
```

---

## 7. 剩餘時間顯示

### 決策

顯示精確到分鐘的剩餘冷卻時間，使用 `setInterval` 每分鐘更新。

### 理由

- 提供清晰的使用者回饋
- 避免過於頻繁的更新消耗資源
- 分鐘級別對使用者來說足夠精確

### 實作細節

```typescript
// src/components/error-report/ReportCooldownTimer.tsx
export const ReportCooldownTimer = ({ 
  remainingMs 
}: { remainingMs: number }) => {
  const [remaining, setRemaining] = useState(remainingMs);

  useEffect(() => {
    setRemaining(remainingMs);
    
    const interval = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 60000;
        return next > 0 ? next : 0;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [remainingMs]);

  if (remaining <= 0) return null;

  const minutes = Math.ceil(remaining / 60000);

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
      <p className="text-yellow-800">
        請稍後再試，您可以在 <strong>{minutes} 分鐘</strong>後提交下一個回報
      </p>
    </div>
  );
};
```

---

## 8. 冗餘儲存地點名稱

### 決策

在回報文件中冗餘儲存 `locationName`，避免地點刪除後資料遺失。

### 理由

- 地點可能在回報處理前被刪除
- 保留完整的回報上下文
- 避免額外的 Join 查詢

### 實作細節

```typescript
const submitReport = async (data: CreateReportData) => {
  await addDoc(collection(db, 'error_reports'), {
    locationId: data.locationId,
    locationName: data.locationName, // 冗餘儲存
    errorType: data.errorType,
    description: data.description || null,
    reportedBy: user.uid,
    reporterInfo: {
      displayName: userData.displayName,
    },
    status: 'pending',
    createdAt: serverTimestamp(),
  });
};
```
