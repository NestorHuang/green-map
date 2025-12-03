# 快速開始指南：地點資訊錯誤回報

**功能分支**: `004-error-reporting`
**建立日期**: 2025-12-03

## 環境設定

### 1. 相依套件

```bash
# 已在先前 Epic 安裝的套件
# react-hook-form, @hookform/resolvers, zod

# 無需額外安裝
```

### 2. Firestore 索引

確保以下索引已建立：

```bash
firebase deploy --only firestore:indexes
```

## 核心程式碼範例

### 冷卻機制 Hook

```typescript
// src/hooks/useReportCooldown.ts
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const COOLDOWN_DURATION = 15 * 60 * 1000; // 15 分鐘
const STORAGE_KEY = 'lastReportedAt';

export const useReportCooldown = () => {
  const { user } = useAuth();
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [checking, setChecking] = useState(true);

  const checkCooldown = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setChecking(false);
      return true;
    }

    // 先檢查 localStorage 快取
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const lastReported = parseInt(cached);
      const elapsed = Date.now() - lastReported;
      if (elapsed < COOLDOWN_DURATION) {
        setRemainingTime(COOLDOWN_DURATION - elapsed);
        setChecking(false);
        return false;
      }
    }

    // 查詢 Firestore 作為權威來源
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const lastReportedAt = userDoc.data()?.lastReportedAt?.toMillis();
      
      if (lastReportedAt) {
        const elapsed = Date.now() - lastReportedAt;
        if (elapsed < COOLDOWN_DURATION) {
          // 同步到 localStorage
          localStorage.setItem(STORAGE_KEY, lastReportedAt.toString());
          setRemainingTime(COOLDOWN_DURATION - elapsed);
          setChecking(false);
          return false;
        }
      }
    } catch (error) {
      console.error('檢查冷卻狀態失敗:', error);
    }

    setRemainingTime(0);
    setChecking(false);
    return true;
  }, [user]);

  const updateCooldown = useCallback(async () => {
    if (!user) return;

    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, now.toString());
    
    await updateDoc(doc(db, 'users', user.uid), {
      lastReportedAt: serverTimestamp(),
    });
    
    setRemainingTime(COOLDOWN_DURATION);
  }, [user]);

  useEffect(() => {
    checkCooldown();
  }, [checkCooldown]);

  // 每分鐘更新剩餘時間
  useEffect(() => {
    if (remainingTime <= 0) return;

    const interval = setInterval(() => {
      setRemainingTime(prev => Math.max(0, prev - 60000));
    }, 60000);

    return () => clearInterval(interval);
  }, [remainingTime]);

  const canReport = remainingTime <= 0;
  const remainingMinutes = Math.ceil(remainingTime / 60000);

  return { 
    canReport, 
    remainingMinutes, 
    checking, 
    checkCooldown,
    updateCooldown,
  };
};
```

### 錯誤回報 Hook

```typescript
// src/hooks/useErrorReport.ts
import { useState } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useReportCooldown } from './useReportCooldown';
import { CreateErrorReportRequest, ErrorType } from '@/types';

export const useErrorReport = () => {
  const { user } = useAuth();
  const { canReport, updateCooldown } = useReportCooldown();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDuplicate = async (locationId: string): Promise<boolean> => {
    if (!user) return false;

    const q = query(
      collection(db, 'error_reports'),
      where('reportedBy', '==', user.uid),
      where('locationId', '==', locationId),
      where('status', '==', 'pending'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const submit = async (data: CreateErrorReportRequest): Promise<string> => {
    if (!user) throw new Error('未登入');
    if (!canReport) throw new Error('冷卻時間內，請稍後再試');

    setSubmitting(true);
    setError(null);

    try {
      // 檢查重複回報
      const isDuplicate = await checkDuplicate(data.locationId);
      if (isDuplicate) {
        throw new Error('您已回報此地點，請勿重複提交');
      }

      // 取得使用者資訊
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data()!;

      // 建立回報
      const docRef = await addDoc(collection(db, 'error_reports'), {
        locationId: data.locationId,
        locationName: data.locationName,
        errorType: data.errorType,
        description: data.description || null,
        reportedBy: user.uid,
        reporterInfo: {
          displayName: userData.displayName,
        },
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // 更新冷卻時間
      await updateCooldown();

      return docRef.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : '提交失敗';
      setError(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting, error, checkDuplicate };
};
```

### 錯誤回報表單

```typescript
// src/components/error-report/ErrorReportForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useErrorReport } from '@/hooks/useErrorReport';
import { ERROR_TYPE_OPTIONS, ErrorType } from '@/types';

const schema = z.object({
  errorType: z.enum(['closed', 'address_error', 'phone_error', 
                     'description_mismatch', 'photo_mismatch', 'other']),
  description: z.string().optional(),
}).refine((data) => {
  if (data.errorType === 'other') {
    return data.description && data.description.length >= 10;
  }
  return true;
}, {
  message: '請填寫詳細說明（至少 10 個字元）',
  path: ['description'],
});

type FormData = z.infer<typeof schema>;

interface Props {
  locationId: string;
  locationName: string;
  onSuccess: () => void;
}

export const ErrorReportForm = ({ locationId, locationName, onSuccess }: Props) => {
  const { submit, submitting, error: submitError } = useErrorReport();
  
  const { 
    register, 
    handleSubmit, 
    watch,
    formState: { errors } 
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const errorType = watch('errorType');

  const onSubmit = async (data: FormData) => {
    try {
      await submit({
        locationId,
        locationName,
        errorType: data.errorType as ErrorType,
        description: data.description,
      });
      onSuccess();
    } catch (err) {
      // 錯誤已在 hook 中處理
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {submitError && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
          {submitError}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">錯誤類型</label>
        <div className="space-y-2">
          {ERROR_TYPE_OPTIONS.map(option => (
            <label 
              key={option.value} 
              className="flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                value={option.value}
                {...register('errorType')}
                className="text-green-600"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {errors.errorType && (
          <p className="text-red-500 text-sm mt-1">{errors.errorType.message}</p>
        )}
      </div>

      {errorType === 'other' && (
        <div>
          <label className="block text-sm font-medium mb-1">詳細說明</label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full p-3 border rounded-md"
            placeholder="請描述您發現的問題（至少 10 個字元）"
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-green-600 text-white py-3 rounded-md font-medium disabled:opacity-50"
      >
        {submitting ? '提交中...' : '提交回報'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        感謝您的回報，管理員將在 3 個工作天內處理
      </p>
    </form>
  );
};
```

### 我的回報列表

```typescript
// src/components/error-report/MyReportsList.tsx
import { useMyReports } from '@/hooks/useMyReports';
import { REPORT_STATUS_CONFIG, ERROR_TYPE_OPTIONS } from '@/types';

export const MyReportsList = () => {
  const { reports, loading } = useMyReports();

  if (loading) {
    return <div className="p-4 text-center">載入中...</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        您還沒有提交過任何回報
      </div>
    );
  }

  return (
    <div className="divide-y">
      {reports.map(report => {
        const statusConfig = REPORT_STATUS_CONFIG[report.status];
        const errorTypeLabel = ERROR_TYPE_OPTIONS.find(
          o => o.value === report.errorType
        )?.label;

        return (
          <div key={report.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium">{report.locationName}</h3>
              <span className={`text-xs px-2 py-1 rounded ${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-1">
              錯誤類型: {errorTypeLabel}
            </p>
            
            {report.description && (
              <p className="text-sm text-gray-500 mb-2">
                {report.description}
              </p>
            )}

            <p className="text-xs text-gray-400">
              回報於 {report.createdAt.toDate().toLocaleDateString('zh-TW')}
            </p>

            {report.adminNote && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                <span className="font-medium">管理員備註:</span> {report.adminNote}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

### 回報按鈕

```typescript
// src/components/error-report/ErrorReportButton.tsx
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReportCooldown } from '@/hooks/useReportCooldown';
import { ErrorReportModal } from './ErrorReportModal';
import { Location } from '@/types';

interface Props {
  location: Location;
}

export const ErrorReportButton = ({ location }: Props) => {
  const { user } = useAuth();
  const { canReport, remainingMinutes, checking } = useReportCooldown();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 未登入不顯示
  if (!user) return null;

  // 檢查中
  if (checking) return null;

  // 冷卻中
  if (!canReport) {
    return (
      <button
        disabled
        className="text-gray-400 text-sm"
      >
        請稍後再試 ({remainingMinutes} 分鐘)
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-red-600 text-sm hover:underline"
      >
        回報此地點資訊有誤
      </button>

      <ErrorReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        location={location}
      />
    </>
  );
};
```

## 測試清單

### P1 功能測試

- [ ] 回報地點錯誤
  - [ ] 登入使用者可看到「回報」按鈕
  - [ ] 未登入使用者看不到按鈕
  - [ ] 選擇錯誤類型並提交
  - [ ] 「其他」類型需填寫說明
  - [ ] 重複回報時顯示錯誤

- [ ] 冷卻機制
  - [ ] 提交後 15 分鐘內無法再次提交
  - [ ] 顯示剩餘等待時間
  - [ ] 跨裝置冷卻一致

### P2 功能測試

- [ ] 我的回報記錄
  - [ ] 顯示所有回報
  - [ ] 顯示狀態標示
  - [ ] 按時間排序

### P3 功能測試

- [ ] 回報處理通知
  - [ ] 回報被處理時顯示通知
  - [ ] 顯示管理員備註
