import spec from '../../../pet-spec.json';
import type { AgentStatus, PetSpec, Settings, StateActivity } from '../../shared/contracts';
import { exceedsDragThreshold } from '../../main/drag';
import { PetStateMachine } from './state-machine';
import { normalizeLang, t, type Lang } from '../../shared/i18n';
import './index.css';

const petSpec = spec as PetSpec;

const container = document.getElementById('pet-container') as HTMLDivElement;
const motion = document.getElementById('sprite-motion') as HTMLDivElement;
const spriteA = document.getElementById('pet-sprite-a') as HTMLImageElement;
const spriteB = document.getElementById('pet-sprite-b') as HTMLImageElement;
const feedbackBubble = document.getElementById('feedback-bubble') as HTMLDivElement;

// Chromium 会默认把 img 当作可拖拽内容；桌宠只允许窗口拖拽。
container.addEventListener('dragstart', (event) => event.preventDefault());

// Webpack 在构建时递归收集当前 spec 对应的素材，不硬编码角色或动作名。
const assetMap = new Map<string, string>();
const assetContext = require.context('../../assets/pet', true, /\.png$/i);
for (const key of assetContext.keys()) {
  assetMap.set(key.replace(/^\.\//, ''), assetContext(key));
}
const expectedAssetNames = [...new Set([
  petSpec.character.coreAsset,
  ...petSpec.states.flatMap((state) => state.frames),
])];

const stateMachine = new PetStateMachine(petSpec.states, performance.now());
container.dataset.state = stateMachine.currentStateId();
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let blinkTimer: ReturnType<typeof setTimeout> | null = null;
let animationFrame: number | null = null;
let currentLang: Lang = normalizeLang(petSpec.app.language);

// 双帧插值渲染：cur 为当前关键帧，prev 为上一帧，切换时 120ms 交叉淡化，
// 配合 motion 层的位移插值形成 30fps+ 连续观感（Clawd on Desk 式关键帧+程序动画）。
let curImg: HTMLImageElement = spriteA;
let prevImg: HTMLImageElement = spriteB;

// 设置呼吸动画
const breathing = petSpec.motion.breathing;
if (breathing.enabled) {
  document.documentElement.style.setProperty('--breath-period', `${breathing.periodMs}ms`);
  document.documentElement.style.setProperty('--breath-scale-x', `${1 + breathing.scaleX}`);
  document.documentElement.style.setProperty('--breath-scale-y', `${1 + breathing.scaleY}`);
}

// 挤压回弹
function playSquash(): void {
  if (!petSpec.motion.squashStretch.enabled) return;
  const squash = petSpec.motion.squashStretch;
  document.documentElement.style.setProperty('--squash-duration', `${squash.durationMs}ms`);
  document.documentElement.style.setProperty('--squash-intensity', `${squash.intensity}`);
  curImg.classList.remove('squash');
  void curImg.offsetWidth; // 触发重绘
  curImg.classList.add('squash');
}

let bubbleTimer: ReturnType<typeof setTimeout> | null = null;

// 显示反馈气泡
function showFeedback(text: string): void {
  feedbackBubble.textContent = text;
  feedbackBubble.classList.add('show');
  if (bubbleTimer) clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => {
    feedbackBubble.classList.remove('show');
  }, 2200);
}

function showFrame(url: string): void {
  prevImg.src = curImg.src;
  curImg.src = url;
  prevImg.style.opacity = '1';
  curImg.style.opacity = '0';
  void curImg.offsetWidth; // 触发重绘，让过渡生效
  curImg.style.opacity = '1';
  prevImg.style.opacity = '0';
}

// 切换状态
function setState(stateId: string, durationMs?: number): void {
  if (!stateMachine.start(stateId, performance.now(), durationMs)) return;
  const snapshot = stateMachine.tick(performance.now());
  container.dataset.state = snapshot.stateId;
  const frameUrl = assetMap.get(snapshot.frame);
  if (frameUrl) showFrame(frameUrl);
}

// 动画循环：每帧 tick，关键帧切换走交叉淡化，帧内进度驱动程序化位移插值。
function animate(timestamp: number): void {
  const snapshot = stateMachine.tick(timestamp);
  container.dataset.state = snapshot.stateId;
  if (snapshot.stateChanged) {
    const frameUrl = assetMap.get(snapshot.frame);
    if (frameUrl) showFrame(frameUrl);
  }
  // 帧内插值：轻微左右重心摆动 + 上下浮动，形成 30fps 连续观感
  const p = snapshot.frameProgress;
  const sway = Math.sin(p * Math.PI * 2) * 1.4;
  const bob = -Math.abs(Math.sin(p * Math.PI)) * 1.1;
  motion.style.transform = `translate(${sway.toFixed(2)}px, ${bob.toFixed(2)}px)`;
  animationFrame = requestAnimationFrame(animate);
}

// 调度空闲事件（眨眼、随机动作）
function scheduleIdleEvents(): void {
  if (blinkTimer) clearTimeout(blinkTimer);
  if (idleTimer) clearTimeout(idleTimer);

  // 随机眨眼
  const blinkDelay = 2000 + Math.random() * 4000;
  blinkTimer = setTimeout(() => {
    if (stateMachine.currentStateId() === 'idle') {
      setState('blink');
    }
    scheduleIdleEvents();
  }, blinkDelay);

  // 随机空闲动作（低概率打盹由 ambient:random 驱动）
  const idleMin = petSpec.motion.idleIntervalMs.min;
  const idleMax = petSpec.motion.idleIntervalMs.max;
  const idleDelay = idleMin + Math.random() * (idleMax - idleMin);
  idleTimer = setTimeout(() => {
    scheduleIdleEvents();
  }, idleDelay);
}

// 点击事件
let suppressNextClick = false;
container.addEventListener('click', () => {
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }
  playSquash();
  setState('happy');
  scheduleIdleEvents();
});

// 拖拽
let isDragging = false;
let pointerStart = { x: 0, y: 0 };
let activePointerId: number | undefined;
let dragUpdatePending = false;
let dragBegin: Promise<void> | undefined;

container.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || activePointerId !== undefined) return;
  activePointerId = event.pointerId;
  pointerStart = { x: event.clientX, y: event.clientY };
  container.setPointerCapture(event.pointerId);
});

container.addEventListener('pointermove', (event) => {
  if (event.pointerId !== activePointerId) return;
  if (!isDragging && exceedsDragThreshold(pointerStart, { x: event.clientX, y: event.clientY })) {
    isDragging = true;
    dragBegin = window.petAPI?.window.beginDrag() ?? Promise.resolve();
  }
  if (!isDragging) return;
  if (dragUpdatePending) return;
  dragUpdatePending = true;
  requestAnimationFrame(() => {
    void (dragBegin ?? Promise.resolve())
      .then(() => window.petAPI?.window.updateDrag())
      .catch(() => {})
      .finally(() => { dragUpdatePending = false; });
  });
});

function finishPointer(event: PointerEvent): void {
  if (event.pointerId !== activePointerId) return;
  if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
  activePointerId = undefined;
  const dragged = isDragging;
  isDragging = false;
  dragUpdatePending = false;
  if (dragged) {
    suppressNextClick = true;
    void (dragBegin ?? Promise.resolve())
      .then(() => window.petAPI?.window.endDrag())
      .catch(() => {});
  }
  dragBegin = undefined;
}

container.addEventListener('pointerup', finishPointer);
container.addEventListener('pointercancel', finishPointer);

// 右键菜单
container.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.petAPI?.window.showContextMenu().catch(() => {});
});

// 监听状态活动
window.petAPI?.events.onStateActivity((activity: StateActivity) => {
  if (activity.stateId) {
    setState(activity.stateId, activity.durationMs);
    scheduleIdleEvents();
  }
  if (activity.feedback) {
    showFeedback(activity.feedback);
  }
});

// 监听编程助手状态
const agentEventKey: Record<string, string> = {
  thinking: 'agent.thinking',
  typing: 'agent.typing',
  building: 'agent.building',
  error: 'agent.error',
  done: 'agent.done',
  notify: 'agent.notify',
  sleep: 'agent.sleep',
  idle: 'agent.idle',
};
window.petAPI?.events.onAgentStatus((status: AgentStatus) => {
  setState(status.stateId);
  const key = agentEventKey[status.event] ?? 'agent.idle';
  let text = t(key, currentLang);
  if (status.tool && (status.event === 'typing' || status.event === 'building')) {
    text = `${text} [${status.tool}]`;
  }
  showFeedback(text);
});

// 语言变更
window.petAPI?.events.onSettingsChanged((next: Settings) => {
  currentLang = normalizeLang(next.language);
});

// 初始化
async function init(): Promise<void> {
  try {
    const settings = await window.petAPI?.settings.get();
    if (settings) currentLang = normalizeLang(settings.language);

    // 所有运行素材必须真实解码成功后才能报告 ready。
    const loadedAssets = await Promise.all(expectedAssetNames.map((name) => new Promise<HTMLImageElement>((resolve, reject) => {
      const url = assetMap.get(name);
      if (!url) {
        reject(new Error(`Missing runtime asset: ${name}`));
        return;
      }
      const image = new Image();
      image.onload = () => {
        if (image.naturalWidth <= 0 || image.naturalHeight <= 0) reject(new Error(`Runtime asset has invalid dimensions: ${name}`));
        else resolve(image);
      };
      image.onerror = () => reject(new Error(`Runtime asset failed to decode: ${name}`));
      image.src = url;
    })));
    const reference = loadedAssets[0];
    if (!reference) throw new Error('No runtime assets were loaded');
    const invalidSize = loadedAssets.find((image) => image.naturalWidth !== reference.naturalWidth || image.naturalHeight !== reference.naturalHeight);
    if (invalidSize) throw new Error('Runtime assets do not share one decoded frame size');

    // 素材确认可用后再启动 idle 和动画循环。
    const firstFrame = petSpec.states.find((s) => s.id === 'idle')?.frames[0] ?? '';
    const firstUrl = assetMap.get(firstFrame);
    if (firstUrl) {
      spriteA.src = firstUrl;
      spriteA.style.opacity = '1';
      prevImg.style.opacity = '0';
    }
    setState('idle');
    scheduleIdleEvents();
    animationFrame = requestAnimationFrame(animate);

    // 报告就绪
    await window.petAPI?.runtime.ready({
      status: 'ready',
      stateId: 'idle',
      frame: firstFrame,
      assetCount: loadedAssets.length,
      expectedAssetCount: expectedAssetNames.length,
      naturalWidth: reference.naturalWidth,
      naturalHeight: reference.naturalHeight,
      petVisible: true,
      ipcReady: true,
    });
  } catch (error) {
    window.petAPI?.runtime.fail({
      message: error instanceof Error ? error.message : String(error),
    }).catch(() => {});
  }
}

init();
