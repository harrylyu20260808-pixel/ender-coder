import spec from '../../../pet-spec.json';
import type { AgentStatus, PetSpec, PetStats, Settings, InteractionSpec, AgentSource } from '../../shared/contracts';
import { normalizeLang, t, type Lang } from '../../shared/i18n';
import './index.css';

// 契约要求：dashboard 渲染器同样递归导入运行时素材（避免 Webpack 树摇导致资源缺失）。
const dashboardAssetContext = require.context('../../assets/pet', true, /\.png$/i);
for (const key of dashboardAssetContext.keys()) { dashboardAssetContext(key); }

const petSpec = spec as PetSpec;
let currentLang: Lang = normalizeLang(petSpec.app.language);

function tr(key: string, params?: Record<string, string>): string {
  return t(key, currentLang, params);
}

function applyI18n(): void {
  document.title = tr('dash.title', { name: petSpec.character.displayName });
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = tr(el.dataset.i18n || '');
  });
  const personality = petSpec.character.personality.join('、');
  document.getElementById('pet-personality')!.textContent = currentLang === 'en' ? `Geeky ${petSpec.character.archetype}` : personality;
  document.getElementById('pet-name')!.textContent = petSpec.character.displayName;
  document.getElementById('about-version')!.textContent = petSpec.app.version;
  renderInteractions();
  renderSizeButtons();
  renderLangButtons();
  updateCompanionUnit();
  if (lastAgentStatus) updateAgentStatus(lastAgentStatus);
}

// 设置主题色
const theme = petSpec.experience.theme;
document.documentElement.style.setProperty('--primary', theme.primary);
document.documentElement.style.setProperty('--accent', theme.accent);
document.documentElement.style.setProperty('--background', theme.background);
document.documentElement.style.setProperty('--surface', theme.surface);
document.documentElement.style.setProperty('--text', theme.text);
document.documentElement.style.setProperty('--muted', theme.muted);
document.documentElement.style.setProperty('--radius', `${theme.cornerRadius}px`);

const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
const affectionEl = document.getElementById('affection') as HTMLDivElement;
const moodEl = document.getElementById('mood') as HTMLDivElement;
const todayInteractionsEl = document.getElementById('today-interactions') as HTMLDivElement;
const companionMinutesEl = document.getElementById('companion-minutes') as HTMLDivElement;
const interactionsList = document.getElementById('interactions-list') as HTMLDivElement;
const toggleAlwaysOnTop = document.getElementById('toggle-always-on-top') as HTMLDivElement;
const toggleClickThrough = document.getElementById('toggle-click-through') as HTMLDivElement;
const toggleClaudeCode = document.getElementById('toggle-claude-code') as HTMLDivElement;
const toggleCodex = document.getElementById('toggle-codex') as HTMLDivElement;
const sizeSelector = document.getElementById('size-selector') as HTMLDivElement;
const langSelector = document.getElementById('lang-selector') as HTMLDivElement;
const agentStatusDot = document.getElementById('agent-status-dot') as HTMLSpanElement;
const agentStatusText = document.getElementById('agent-status-text') as HTMLSpanElement;
const agentEvents = document.getElementById('agent-events') as HTMLDivElement;
const installHooksBtn = document.getElementById('install-hooks') as HTMLButtonElement;

let currentSettings: Settings | null = null;
let lastAgentStatus: AgentStatus | null = null;

const sourceLabel: Record<AgentSource, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
  hooks: 'Hooks',
};
const eventLabelKey: Record<string, string> = {
  thinking: 'agent.thinking',
  typing: 'agent.typing',
  building: 'agent.building',
  error: 'agent.error',
  done: 'agent.done',
  notify: 'agent.notify',
  sleep: 'agent.sleep',
  idle: 'agent.idle',
};

function renderInteractions(): void {
  if (!currentSettings) return;
  void (async () => {
    const interactions = await window.petAPI?.interactions.list();
    if (!interactions) return;
    interactionsList.replaceChildren();
    for (const interaction of interactions) {
      const btn = document.createElement('button');
      btn.className = 'interaction-btn';
      const emoji = document.createElement('span');
      emoji.textContent = interaction.emoji;
      const label = document.createElement('span');
      label.textContent = currentLang === 'en' ? tr(`interaction.${interaction.id}`, {}) : interaction.label;
      btn.append(emoji, label);
      btn.addEventListener('click', async () => {
        try {
          await window.petAPI?.interactions.trigger(interaction.id);
        } catch (error) {
          console.error('Failed to trigger interaction:', error);
        }
      });
      interactionsList.appendChild(btn);
    }
  })().catch(() => {});
}

function renderSizeButtons(): void {
  const sizeBtns = sizeSelector.querySelectorAll('.size-btn');
  sizeBtns.forEach((btn) => {
    const el = btn as HTMLElement;
    el.textContent = tr(el.dataset.i18n || '');
  });
}

function renderLangButtons(): void {
  const btns = langSelector.querySelectorAll('.lang-btn');
  btns.forEach((btn) => {
    const lang = (btn as HTMLElement).dataset.lang || '';
    if (lang === currentLang) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function updateCompanionUnit(): void {
  const small = companionMinutesEl.querySelector('small');
  if (small) small.textContent = tr('dash.minutes');
}

async function loadSettings(): Promise<void> {
  try {
    const settings = await window.petAPI?.settings.get();
    if (!settings) return;
    currentSettings = settings;
    currentLang = normalizeLang(settings.language);
    applyI18n();

    if (settings.alwaysOnTop) toggleAlwaysOnTop.classList.add('active');
    else toggleAlwaysOnTop.classList.remove('active');
    if (settings.clickThrough) toggleClickThrough.classList.add('active');
    else toggleClickThrough.classList.remove('active');
    if (settings.agentMonitors.claudeCode) toggleClaudeCode.classList.add('active');
    else toggleClaudeCode.classList.remove('active');
    if (settings.agentMonitors.codex) toggleCodex.classList.add('active');
    else toggleCodex.classList.remove('active');

    const sizeBtns = sizeSelector.querySelectorAll('.size-btn');
    sizeBtns.forEach((btn) => {
      const scale = parseFloat((btn as HTMLElement).dataset.scale || '1');
      if (Math.abs(scale - settings.petScale) < 0.01) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function loadStats(): Promise<void> {
  try {
    const stats = await window.petAPI?.interactions.stats();
    if (!stats) return;
    updateStats(stats);
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

function updateStats(stats: PetStats): void {
  affectionEl.textContent = String(stats.affection);
  moodEl.textContent = String(stats.mood);
  todayInteractionsEl.textContent = String(stats.todayInteractions);
  const small = document.createElement('small');
  small.textContent = tr('dash.minutes');
  companionMinutesEl.replaceChildren(String(stats.companionMinutes), small);
}

function updateAgentStatus(status: AgentStatus): void {
  lastAgentStatus = status;
  agentStatusDot.classList.add('active');
  const label = eventLabelKey[status.event] ?? 'agent.idle';
  let text = tr(label);
  if (status.event === 'sleep') {
    agentStatusDot.classList.remove('active');
  }
  if (status.tool && (status.event === 'typing' || status.event === 'building')) {
    text = `${text} [${status.tool}]`;
  }
  agentStatusText.textContent = `${text} · ${sourceLabel[status.source]}`;

  const item = document.createElement('div');
  item.className = 'event-item';
  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = new Date(status.at).toLocaleTimeString(currentLang === 'zh-CN' ? 'zh-CN' : 'en-US', { hour12: false });
  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = sourceLabel[status.source];
  const body = document.createElement('span');
  body.textContent = text;
  body.style.flex = '1';
  body.style.overflow = 'hidden';
  body.style.textOverflow = 'ellipsis';
  body.style.whiteSpace = 'nowrap';
  item.append(time, tag, body);
  agentEvents.prepend(item);
  while (agentEvents.children.length > 8) agentEvents.removeChild(agentEvents.lastChild!);
}

// 页签切换
document.getElementById('tabs')!.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest('.tab-btn') as HTMLElement | null;
  if (!target) return;
  const tab = target.dataset.tab || '';
  document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
  target.classList.add('active');
  document.querySelectorAll('.tab-pane').forEach((pane) => pane.classList.remove('active'));
  document.getElementById(`pane-${tab}`)?.classList.add('active');
  const labels: Record<string, string> = {
    stats: 'dash.stats',
    agents: 'dash.agents',
    settings: 'dash.settings',
    about: 'dash.about',
  };
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    const el = btn as HTMLElement;
    const key = labels[el.dataset.tab || ''] || '';
    el.textContent = key === 'dash.stats' ? '📊' : key === 'dash.agents' ? '🤖' : key === 'dash.settings' ? '⚙️' : 'ℹ️';
    el.title = tr(key);
  });
});

closeBtn.addEventListener('click', () => {
  void window.petAPI?.window.hideDashboard();
});

async function updateSettings(patch: Partial<Settings>): Promise<void> {
  if (!currentSettings) return;
  try {
    const next = await window.petAPI?.settings.update(patch);
    if (next) currentSettings = next;
  } catch (error) {
    console.error('Failed to update setting:', error);
  }
}

toggleAlwaysOnTop.addEventListener('click', () => {
  if (!currentSettings) return;
  const newVal = !currentSettings.alwaysOnTop;
  if (newVal) toggleAlwaysOnTop.classList.add('active');
  else toggleAlwaysOnTop.classList.remove('active');
  void updateSettings({ alwaysOnTop: newVal });
});

toggleClickThrough.addEventListener('click', () => {
  if (!currentSettings) return;
  const newVal = !currentSettings.clickThrough;
  if (newVal) toggleClickThrough.classList.add('active');
  else toggleClickThrough.classList.remove('active');
  void updateSettings({ clickThrough: newVal });
});

toggleClaudeCode.addEventListener('click', () => {
  if (!currentSettings) return;
  const newVal = !currentSettings.agentMonitors.claudeCode;
  if (newVal) toggleClaudeCode.classList.add('active');
  else toggleClaudeCode.classList.remove('active');
  void updateSettings({ agentMonitors: { ...currentSettings.agentMonitors, claudeCode: newVal } });
});

toggleCodex.addEventListener('click', () => {
  if (!currentSettings) return;
  const newVal = !currentSettings.agentMonitors.codex;
  if (newVal) toggleCodex.classList.add('active');
  else toggleCodex.classList.remove('active');
  void updateSettings({ agentMonitors: { ...currentSettings.agentMonitors, codex: newVal } });
});

sizeSelector.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (!target.classList.contains('size-btn')) return;
  const scale = parseFloat(target.dataset.scale || '1');
  sizeSelector.querySelectorAll('.size-btn').forEach((btn) => btn.classList.remove('active'));
  target.classList.add('active');
  void updateSettings({ petScale: scale });
});

langSelector.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (!target.classList.contains('lang-btn')) return;
  const lang = (target.dataset.lang || 'zh-CN') as 'zh-CN' | 'en';
  void updateSettings({ language: lang }).then(() => {
    currentLang = normalizeLang(lang);
    applyI18n();
  });
});

installHooksBtn.addEventListener('click', async () => {
  installHooksBtn.disabled = true;
  installHooksBtn.textContent = '…';
  try {
    const result = await (window as unknown as { petAPI?: { installClaudeHooks?: () => Promise<{ ok: boolean; message: string }> } }).petAPI?.installClaudeHooks?.();
    installHooksBtn.textContent = result?.ok ? tr('dash.hooks-installed') : (result?.message || tr('dash.hooks-failed'));
    if (!result?.ok) installHooksBtn.disabled = false;
  } catch (error) {
    installHooksBtn.textContent = tr('dash.hooks-failed');
    installHooksBtn.disabled = false;
  }
});

window.petAPI?.events.onStats((stats: PetStats) => {
  updateStats(stats);
});

window.petAPI?.events.onAgentStatus((status: AgentStatus) => {
  updateAgentStatus(status);
});

window.petAPI?.events.onSettingsChanged((next: Settings) => {
  currentSettings = next;
  currentLang = normalizeLang(next.language);
  applyI18n();
  if (next.agentMonitors.claudeCode) toggleClaudeCode.classList.add('active');
  else toggleClaudeCode.classList.remove('active');
  if (next.agentMonitors.codex) toggleCodex.classList.add('active');
  else toggleCodex.classList.remove('active');
});

async function init(): Promise<void> {
  await loadSettings();
  await loadStats();
}

void init();
