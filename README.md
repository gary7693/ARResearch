# ARReserach — WebAR 影像偵測與互動

使用 **React + TypeScript + Vite + MindAR (image tracking) + three.js** 的 WebAR 範例。
鏡頭偵測到目標圖片後，會在圖片上方顯示一個會旋轉的 3D 立方體，點擊立方體可隨機換色。

## 技術堆疊

- **Vite** — 開發伺服器與打包
- **React 18 + TypeScript** — UI 與狀態
- **mind-ar** — 瀏覽器端影像追蹤（image target tracking）
- **three.js** — 3D 渲染

## 快速開始

```bash
npm install
npm run dev
```

開啟瀏覽器到 `http://localhost:5173`，點「啟動 AR」並允許使用相機。

### 準備目標圖片

程式會載入 `public/targets/targets.mind`。請依 [public/targets/README.md](public/targets/README.md)
的說明，用 [官方編譯工具](https://hiukim.github.io/mind-ar-js-doc/tools/compile) 產生
`targets.mind` 後放入該資料夾，並把同一張圖片印出或顯示在另一個螢幕上供鏡頭掃描。

## 在手機上測試（已內建 HTTPS）

相機 API 需要 **安全環境（HTTPS 或 localhost）**。本專案已透過
[`@vitejs/plugin-basic-ssl`](https://www.npmjs.com/package/@vitejs/plugin-basic-ssl)
讓 dev server 直接走 HTTPS（自簽憑證），並以 `host: true` 監聽區網 IP。

步驟：

1. 電腦執行 `npm run dev`，終端機會印出兩個網址，例如：
   - `Local:   https://localhost:5173/`
   - `Network: https://192.168.1.x:5173/` ← 手機用這個
2. 手機與電腦連同一個 Wi-Fi，瀏覽器開 `https://192.168.1.x:5173/`。
3. 因為是自簽憑證，手機會出現「連線不安全」警告 →
   點 **進階／繼續前往**（Android Chrome）或 **顯示詳細資訊 → 仍要瀏覽**（iOS Safari）。
4. 接受後即為安全環境，按「啟動 AR」允許相機即可掃描。

> 若公司／家用防火牆擋住區網連線，或想要受信任的憑證，可改用 `ngrok http https://localhost:5173`
> 之類的通道工具，取得對外的 HTTPS 網址。

## 專案結構

```
.
├── index.html
├── vite.config.ts
├── public/targets/            # 放置 targets.mind
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── components/
    │   └── ARImageTracker.tsx # MindAR + three.js 核心邏輯
    └── types/
        └── mind-ar.d.ts       # MindAR 的 TypeScript 型別補充
```

## 延伸方向

- 將立方體換成 `GLTFLoader` 載入的 3D 模型。
- 多目標：編譯多張圖片後，為每張 `addAnchor(n)` 掛載不同內容。
- 加入影片／音效、按鈕熱區、與後端互動等。
