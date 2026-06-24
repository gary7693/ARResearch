import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';

type TrackingStatus = 'idle' | 'starting' | 'scanning' | 'found' | 'error';

// 用 BASE_URL 組路徑，部署到 GitHub Pages 子路徑（/ARResearch/）時才抓得到
const TARGET_SRC = `${import.meta.env.BASE_URL}targets/targets.mind`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 依是否選定特定相機，組出 getUserMedia 的約束條件。 */
function buildConstraints(deviceId?: string): MediaStreamConstraints {
  return {
    audio: false,
    video: deviceId
      ? { deviceId: { exact: deviceId } }
      : { facingMode: 'environment' },
  };
}

/**
 * 判斷是否為「偶發性」相機錯誤，這類重試常常就會成功：
 * - AbortError「Timeout starting video source」：裝置啟動逾時（Windows 常見）
 * - NotReadableError：裝置暫時忙碌／剛被釋放
 */
function isTransientCameraError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === 'AbortError' ||
    err.name === 'TimeoutError' ||
    err.name === 'NotReadableError' ||
    /timeout|starting video source/i.test(err.message)
  );
}

/** 取得相機串流，遇到偶發錯誤會自動重試。 */
async function acquireCamera(
  deviceId?: string,
  retries = 2,
  delayMs = 800,
): Promise<MediaStream> {
  const constraints = buildConstraints(deviceId);
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastErr = err;
      if (!isTransientCameraError(err) || attempt === retries) break;
      console.warn(`[AR] 相機啟動逾時，重試中 (${attempt + 1}/${retries})`, err);
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

/**
 * MindAR 在相機取得失敗時，內部只呼叫 reject() 而不帶任何原因，
 * 導致外層收到的錯誤是 undefined。這裡先自行取得相機（含重試），把真正的
 * DOMException 轉成可讀訊息，再交給 MindAR 啟動。
 */
async function preflightCamera(deviceId?: string): Promise<void> {
  if (!window.isSecureContext) {
    throw new Error(
      '需要安全環境（HTTPS 或 localhost）才能使用相機。請改用 https:// 或 http://localhost。',
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('此瀏覽器不支援相機 API（navigator.mediaDevices.getUserMedia 不存在）。');
  }

  let stream: MediaStream | undefined;
  try {
    stream = await acquireCamera(deviceId);
  } catch (err) {
    throw new Error(describeCameraError(err));
  } finally {
    // 立即釋放探測用的串流，讓 MindAR 能重新取得相機
    stream?.getTracks().forEach((t) => t.stop());
  }
  // 給 Windows 一點時間完全釋放裝置，避免 MindAR 立即重抓再次逾時
  await sleep(300);
}

/** 列出可用的相機（videoinput）。權限授予後才會有 label。 */
async function listCameras(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'videoinput');
}

function describeCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return '相機權限被拒。請在瀏覽器網址列的相機圖示允許存取，並確認 Windows 設定 → 隱私權 → 相機 已開啟。';
    case 'AbortError':
    case 'TimeoutError':
      return '相機啟動逾時（已自動重試）。裝置可能正被其他程式占用，或瀏覽器選到了筆電的紅外線／Windows Hello 相機（無法輸出一般影像）。請關閉其他使用相機的程式，或在系統設定停用紅外線相機後重試。';
    case 'NotReadableError':
    case 'TrackStartError':
      return '無法讀取相機，通常是相機正被其他程式占用（Zoom／Teams／OBS／相機 App）。請關閉那些程式後再試。';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return '找不到可用的相機裝置，請確認相機已連接且未被停用。';
    case 'OverconstrainedError':
      return '相機不支援要求的設定（facingMode）。在桌機上多為正常，請再試一次或改用其他相機。';
    default:
      return err instanceof Error && err.message
        ? `相機啟動失敗：${err.message}`
        : '相機啟動失敗（未知原因）。';
  }
}

export default function ARImageTracker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mindarRef = useRef<MindARThree | null>(null);
  const objectRef = useRef<THREE.Mesh | null>(null);

  const [status, setStatus] = useState<TrackingStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [tapCount, setTapCount] = useState(0);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // 重新列出相機；授權後 label 才會有值
  const refreshCameras = useCallback(async () => {
    try {
      const list = await listCameras();
      setCameras(list);
      setSelectedDeviceId((prev) =>
        prev && list.some((d) => d.deviceId === prev)
          ? prev
          : (list[0]?.deviceId ?? ''),
      );
    } catch (err) {
      console.warn('[AR] 列舉相機失敗', err);
    }
  }, []);

  // 載入時先列舉一次（此時可能還沒 label），並監聽裝置變動
  useEffect(() => {
    refreshCameras();
    const md = navigator.mediaDevices;
    md?.addEventListener?.('devicechange', refreshCameras);
    return () => md?.removeEventListener?.('devicechange', refreshCameras);
  }, [refreshCameras]);

  const stop = useCallback(() => {
    const mindar = mindarRef.current;
    if (!mindar) return;
    mindar.renderer.setAnimationLoop(null);
    mindar.stop();
    mindarRef.current = null;
    objectRef.current = null;
    setStatus('idle');
    setTapCount(0);
  }, []);

  const start = useCallback(async () => {
    if (!containerRef.current || mindarRef.current) return;
    setStatus('starting');
    setErrorMsg('');

    try {
      // 先自行取得相機，遇到問題能顯示真正原因（MindAR 會吞掉錯誤）
      await preflightCamera(selectedDeviceId || undefined);
      // 授權後 label 才會出現，重新整理一次清單
      await refreshCameras();

      const mindar = new MindARThree({
        container: containerRef.current,
        imageTargetSrc: TARGET_SRC,
        uiScanning: false,
        uiLoading: false,
        // 預設 shouldFaceUser 為 false，會採用 environmentDeviceId 指定的相機
        environmentDeviceId: selectedDeviceId || null,
      });
      mindarRef.current = mindar;

      const { renderer, scene, camera } = mindar;

      // 光源
      scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.4));
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
      dirLight.position.set(1, 1, 1);
      scene.add(dirLight);

      // 目標 0 對應的錨點：偵測到圖片時會顯示其 group 內的物件
      const anchor = mindar.addAnchor(0);

      const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
      const material = new THREE.MeshStandardMaterial({
        color: 0x7df9ff,
        metalness: 0.3,
        roughness: 0.4,
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(0, 0, 0.3);
      anchor.group.add(cube);
      objectRef.current = cube;

      anchor.onTargetFound = () => setStatus('found');
      anchor.onTargetLost = () => setStatus('scanning');

      // 點擊互動：用 raycaster 判斷是否點到 3D 物件
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const handleTap = (event: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObject(cube, true);
        if (hits.length > 0) {
          material.color.setHSL(Math.random(), 0.7, 0.6);
          setTapCount((c) => c + 1);
        }
      };
      renderer.domElement.addEventListener('pointerdown', handleTap);

      await mindar.start();
      setStatus('scanning');

      renderer.setAnimationLoop(() => {
        // 持續旋轉，營造互動感
        if (objectRef.current) {
          objectRef.current.rotation.y += 0.02;
          objectRef.current.rotation.x += 0.005;
        }
        renderer.render(scene, camera);
      });
    } catch (err) {
      console.error('[AR] 啟動失敗', err);
      // 即使失敗，權限提示通常已被回應，label 此時可用 → 重新整理讓使用者改選相機
      void refreshCameras();
      // MindAR 內部可能 reject(undefined)；做最後的友善轉譯
      const message =
        err instanceof Error && err.message
          ? err.message
          : err == null
            ? '相機或追蹤啟動失敗（MindAR 未提供原因，通常是相機被占用或權限問題）。'
            : String(err);
      setErrorMsg(message);
      setStatus('error');
      // 清理可能已建立的串流
      try {
        mindarRef.current?.stop();
      } catch {
        /* ignore */
      }
      mindarRef.current = null;
    }
  }, [selectedDeviceId, refreshCameras]);

  // 元件卸載時確保釋放相機資源
  useEffect(() => stop, [stop]);

  const statusText: Record<TrackingStatus, string> = {
    idle: '尚未啟動',
    starting: '啟動相機中…',
    scanning: '請將鏡頭對準目標圖片',
    found: '✅ 已偵測到目標！點擊立方體換色',
    error: `錯誤：${errorMsg}`,
  };

  const running = status !== 'idle' && status !== 'error';

  return (
    <>
      <div ref={containerRef} className="ar-container" />

      <div className="ar-overlay">
        <div className="ar-overlay__top">
          <span
            className={`ar-badge ar-status${status === 'error' ? ' ar-status--error' : ''}`}
          >
            {statusText[status]}
          </span>
          {tapCount > 0 && <span className="ar-badge">點擊次數：{tapCount}</span>}

          {cameras.length > 0 && (
            <select
              className="ar-select"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              disabled={running}
              title="選擇相機"
            >
              {cameras.map((cam, i) => (
                <option key={cam.deviceId || i} value={cam.deviceId}>
                  {cam.label || `相機 ${i + 1}${cam.deviceId ? ` (${cam.deviceId.slice(0, 6)}…)` : ''}`}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="ar-overlay__bottom">
          {!running ? (
            <button className="ar-btn" onClick={start}>
              啟動 AR
            </button>
          ) : (
            <button className="ar-btn" onClick={stop}>
              停止
            </button>
          )}
        </div>
      </div>
    </>
  );
}
