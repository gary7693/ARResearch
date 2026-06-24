import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages 的 project 站台在 /ARResearch/ 子路徑；dev 維持根路徑
  base: command === 'build' ? '/ARResearch/' : '/',
  // basicSsl 產生自簽憑證，讓 dev server 走 HTTPS；手機相機（getUserMedia）需要安全環境
  plugins: [react(), basicSsl()],
  server: {
    // host:true 同時監聽區網 IP，手機可用 https://<電腦IP>:5173 連入
    host: true,
    port: 5173,
  },
  optimizeDeps: {
    // mind-ar 以 UMD/prod bundle 形式發佈，交給 Vite 預先打包避免相依問題
    include: ['mind-ar'],
  },
}));
