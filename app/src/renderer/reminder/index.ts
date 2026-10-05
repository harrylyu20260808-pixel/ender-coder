import spec from '../../../pet-spec.json';
import type { PetSpec, Reminder, Settings } from '../../shared/contracts';
import { normalizeLang, t, type Lang } from '../../shared/i18n';
import './index.css';

const petSpec = spec as PetSpec;

// 设置主题色
const theme = petSpec.experience.theme;
document.documentElement.style.setProperty('--primary', theme.primary);
document.documentElement.style.setProperty('--accent', theme.accent);
document.documentElement.style.setProperty('--background', theme.background);
document.documentElement.style.setProperty('--surface', theme.surface);
document.documentElement.style.setProperty('--text', theme.text);
document.documentElement.style.setProperty('--muted', theme.muted);
document.documentElement.style.setProperty('--radius', `${theme.cornerRadius}px`);

const titleEl = document.getElementById('reminder-title') as HTMLDivElement;
const contentLabel = document.getElementById('reminder-content-label') as HTMLLabelElement;
const timeLabel = document.getElementById('reminder-time-label') as HTMLLabelElement;
const textInput = document.getElementById('reminder-text') as HTMLInputElement;
const timeInput = document.getElementById('reminder-time') as HTMLInputElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;

let currentLang: Lang = normalizeLang(petSpec.app.language);

function applyI18n(): void {
  titleEl.textContent = t('reminder.title', currentLang);
  contentLabel.textContent = t('reminder.content', currentLang);
  timeLabel.textContent = t('reminder.time', currentLang);
  textInput.placeholder = t('reminder.placeholder', currentLang);
  cancelBtn.textContent = t('reminder.cancel', currentLang);
  saveBtn.textContent = t('reminder.save', currentLang);
  document.title = t('reminder.title', currentLang).replace(/^[^\u4e00-\u9fffA-Za-z]+/, '');
}

// 设置默认时间为1小时后
function setDefaultTime(): void {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  timeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

setDefaultTime();

// 保存提醒
saveBtn.addEventListener('click', async () => {
  const text = textInput.value.trim();
  const time = timeInput.value;

  if (!text || !time) {
    return;
  }

  try {
    await window.petAPI?.reminders.save({
      text,
      dueAt: new Date(time).toISOString(),
    });
    textInput.value = '';
    setDefaultTime();
    await window.petAPI?.window.hideReminder();
  } catch (error) {
    console.error('Failed to save reminder:', error);
  }
});

// 取消
cancelBtn.addEventListener('click', async () => {
  textInput.value = '';
  setDefaultTime();
  await window.petAPI?.window.hideReminder();
});

// 监听提醒触发
window.petAPI?.events.onReminder((reminder: Reminder) => {
  // 显示提醒
  textInput.value = reminder.text;
  timeInput.value = new Date(reminder.dueAt).toLocaleString();
});

// 监听打开提醒编辑器
window.petAPI?.events.onReminderCompose(() => {
  setDefaultTime();
  textInput.focus();
});

// 语言跟随设置
window.petAPI?.events.onSettingsChanged((next: Settings) => {
  currentLang = normalizeLang(next.language);
  applyI18n();
});

// 初始化语言
void window.petAPI?.settings.get().then((settings) => {
  if (settings) {
    currentLang = normalizeLang(settings.language);
    applyI18n();
  }
});
