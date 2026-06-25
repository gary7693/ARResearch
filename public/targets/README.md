# 目標圖片（Image Targets）

把編譯後的 `targets.mind` 放在這個資料夾，程式會從 `/targets/targets.mind` 載入。

## 如何產生 targets.mind

1. 開啟官方編譯工具：https://hiukim.github.io/mind-ar-js-doc/tools/compile
2. 上傳一張或多張目標圖片（特徵越豐富、對比越強越好；避免重複圖樣）。
3. 點 **Start**，完成後下載 `targets.mind`，放到這個資料夾並命名為 `targets.mind`。

## 多目標追蹤

程式已支援多目標：在編譯工具一次上傳**多張**圖片，**上傳的順序**就是各圖的 index（從 0 起），
對應 `src/components/ARImageTracker.tsx` 裡 `TARGETS` 陣列的設定：

| index | 上傳的第幾張圖 | 顯示的 3D 物件 |
| ----- | -------------- | -------------- |
| 0     | 第 1 張        | 立方體（青）   |
| 1     | 第 2 張        | 甜甜圈（橘）   |
| 2     | 第 3 張        | 球體（紫）     |

- 多張圖可**同時**被偵測（`maxTrack` 已設為目標數量）。
- 要增減目標或換內容：編輯 `TARGETS` 陣列，並重新編譯包含對應張數的 `targets.mind`。
- 只編譯 1 張也沒關係：index 1、2 的錨點不會被觸發，不會報錯。
