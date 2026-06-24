# 目標圖片（Image Targets）

把編譯後的 `targets.mind` 放在這個資料夾，程式會從 `/targets/targets.mind` 載入。

## 如何產生 targets.mind

1. 開啟官方編譯工具：https://hiukim.github.io/mind-ar-js-doc/tools/compile
2. 上傳一張或多張目標圖片（特徵越豐富、對比越強越好；避免重複圖樣）。
3. 點 **Start**，完成後下載 `targets.mind`，放到這個資料夾並命名為 `targets.mind`。

> 若編譯了多張圖片，第 N 張圖片對應 `mindar.addAnchor(N)`（從 0 開始）。
> 目前程式只掛載了 `addAnchor(0)`，也就是第一張圖。
