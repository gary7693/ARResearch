// MindAR 官方未提供 TypeScript 型別，這裡補上專案需要的最小型別定義。
declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  import type * as THREE from 'three';

  export interface MindARThreeOptions {
    /** 掛載 AR 畫面的 DOM 容器 */
    container: HTMLElement;
    /** 編譯後的目標檔（.mind） */
    imageTargetSrc: string;
    /** 同時最多追蹤的目標數量 */
    maxTrack?: number;
    /** 偵測信心門檻相關 */
    filterMinCF?: number;
    filterBeta?: number;
    /** 缺少目標時是否顯示提示掃描 UI */
    uiScanning?: string | boolean;
    uiLoading?: string | boolean;
    uiError?: string | boolean;
    /** 指定前鏡頭裝置 ID（shouldFaceUser 為 true 時使用） */
    userDeviceId?: string | null;
    /** 指定後鏡頭裝置 ID（預設 shouldFaceUser 為 false 時使用） */
    environmentDeviceId?: string | null;
  }

  export interface MindARAnchor {
    /** 目標被偵測到時掛載 3D 物件的群組 */
    group: THREE.Group;
    /** 目標索引 */
    targetIndex: number;
    /** 偵測到目標時觸發 */
    onTargetFound?: () => void;
    /** 目標離開畫面時觸發 */
    onTargetLost?: () => void;
  }

  export class MindARThree {
    constructor(options: MindARThreeOptions);
    readonly renderer: THREE.WebGLRenderer;
    readonly scene: THREE.Scene;
    readonly camera: THREE.PerspectiveCamera;
    addAnchor(targetIndex: number): MindARAnchor;
    start(): Promise<void>;
    stop(): void;
  }
}
