// Agent activity monitor for Ender Coder.
// Watches coding-agent session artifacts and maps them to pet states,
// mirroring how Clawd on Desk reacts to Claude Code / Codex.
//
// Privacy contract (data-and-privacy.md):
//  - Read-only. Never writes, stores or persists any session content.
//  - Only event *kinds* and tool *names* are extracted; never prompt/response text.
//  - No absolute paths in logs.

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { AgentEvent, AgentMonitors, AgentSource, AgentStatus } from '../shared/contracts';

export interface AgentActivity {
  event: AgentEvent;
  stateId: string;
  durationMs?: number;
}

export type ActivitySink = (activity: AgentActivity, status: AgentStatus) => void;

const POLL_MS = 1500;
const RESCAN_MS = 30_000;
const IDLE_TO_SLEEP_MS = 60_000;
const CLAUDE_DIR = path.join(os.homedir(), '.claude', 'projects');
const CODEX_DIR = path.join(os.homedir(), '.codex', 'sessions');
const HOOKS_FILE = path.join(os.homedir(), '.endercoder-pet', 'agent-events.jsonl');

// event -> pet state
const STATE_BY_EVENT: Record<AgentEvent, { stateId: string; durationMs?: number }> = {
  thinking: { stateId: 'peek' },
  typing: { stateId: 'code' },
  building: { stateId: 'code' },
  error: { stateId: 'bug', durationMs: 3500 },
  done: { stateId: 'happy', durationMs: 2600 },
  notify: { stateId: 'notify', durationMs: 2200 },
  sleep: { stateId: 'sleeping' },
  idle: { stateId: 'idle' },
};

function newestJsonl(dir: string, limit: number): Promise<string[]> {
  return readdir(dir).then(
    async (entries) => {
      const files: Array<{ file: string; mtime: number }> = [];
      for (const entry of entries) {
        const full = path.join(dir, entry);
        if (!entry.endsWith('.jsonl')) continue;
        try {
          const info = await stat(full);
          if (info.isFile()) files.push({ file: full, mtime: info.mtimeMs });
        } catch { /* raced */ }
      }
      files.sort((a, b) => b.mtime - a.mtime);
      return files.slice(0, limit).map((item) => item.file);
    },
    () => [],
  );
}

export function parseClaudeLine(line: string): { event: AgentEvent; tool?: string } | undefined {
  let data: any;
  try { data = JSON.parse(line); } catch { return undefined; }
  const type = data.type;
  if (type === 'assistant') {
    const content = data.message?.content;
    if (!Array.isArray(content)) return undefined;
    const toolUse = content.find((item: any) => item?.type === 'tool_use');
    const text = content.find((item: any) => item?.type === 'text' && typeof item.text === 'string');
    if (toolUse?.name) return { event: 'typing', tool: String(toolUse.name).toLowerCase() };
    if (text) return { event: 'thinking' };
    return undefined;
  }
  if (type === 'user') {
    const content = data.message?.content;
    if (!Array.isArray(content)) return undefined;
    const toolResult = content.find((item: any) => item?.type === 'tool_result');
    if (toolResult?.is_error) return { event: 'error', tool: 'tool' };
    return undefined;
  }
  return undefined;
}

export function parseCodexLine(line: string): { event: AgentEvent; tool?: string } | undefined {
  let data: any;
  try { data = JSON.parse(line); } catch { return undefined; }
  const type = data.type;
  const payload = data.payload;
  if (type === 'response_item' && payload) {
    if (payload.type === 'function_call' && typeof payload.name === 'string') {
      return { event: 'typing', tool: payload.name.toLowerCase() };
    }
    if (payload.type === 'function_call_output') {
      const output = payload.output;
      const looksError = payload.is_error === true || (typeof output === 'string' && /^error:/i.test(output));
      if (looksError) return { event: 'error', tool: 'tool' };
      return { event: 'typing' };
    }
    if (payload.type === 'message' || payload.type === 'reasoning') {
      return { event: 'thinking' };
    }
    if (payload.type === 'agent_message') {
      const content = payload.message?.content;
      const toolCall = Array.isArray(content) ? content.find((item: any) => item?.type === 'tool_call') : undefined;
      if (toolCall) return { event: 'typing', tool: typeof toolCall.name === 'string' ? toolCall.name.toLowerCase() : 'tool' };
      return { event: 'thinking' };
    }
  }
  if (type === 'event_msg' && payload?.type === 'agent_message') {
    const content = payload.message?.content;
    const toolCall = Array.isArray(content) ? content.find((item: any) => item?.type === 'tool_call') : undefined;
    if (toolCall) return { event: 'typing', tool: typeof toolCall.name === 'string' ? toolCall.name.toLowerCase() : 'tool' };
    return { event: 'thinking' };
  }
  return undefined;
}

export function parseHooksLine(line: string): { event: AgentEvent; tool?: string } | undefined {
  let data: any;
  try { data = JSON.parse(line); } catch { return undefined; }
  const event: string = data.event || data.hook_event_name || '';
  const tool: string | undefined = data.tool_name || data.tool;
  switch (event) {
    case 'SessionStart': return { event: 'notify' };
    case 'UserPromptSubmit': return { event: 'thinking' };
    case 'PreToolUse':
    case 'PostToolUse': return { event: 'typing', tool: tool?.toLowerCase() };
    case 'PostToolUseFailure': return { event: 'error', tool: tool?.toLowerCase() };
    case 'Stop': return { event: 'done' };
    case 'SessionEnd': return { event: 'idle' };
    default: return undefined;
  }
}

export class AgentMonitor {
  private timer: ReturnType<typeof setInterval> | undefined;
  private rescanTimer: ReturnType<typeof setInterval> | undefined;
  private offsets = new Map<string, number>();
  private knownClaudeFiles = new Set<string>();
  private knownCodexFiles = new Set<string>();
  private lastActivityAt = 0;
  private sleeping = false;
  private enabled: AgentMonitors;
  private readonly sink: ActivitySink;

  constructor(enabled: AgentMonitors, sink: ActivitySink) {
    this.enabled = enabled;
    this.sink = sink;
    this.lastActivityAt = Date.now();
  }

  updateEnabled(next: AgentMonitors): void {
    this.enabled = { ...next };
  }

  private emit(event: AgentEvent, source: AgentSource, tool?: string): void {
    if (event !== 'sleep') {
      this.lastActivityAt = Date.now();
      if (this.sleeping && event !== 'idle') {
        this.sleeping = false;
        this.emit('idle', source);
        return;
      }
    }
    const mapping = STATE_BY_EVENT[event];
    this.sleeping = event === 'sleep';
    const status: AgentStatus = { source, event, stateId: mapping.stateId, tool, at: Date.now() };
    this.sink({ event, stateId: mapping.stateId, durationMs: mapping.durationMs }, status);
  }

  private async drainFile(file: string, parser: (line: string) => { event: AgentEvent; tool?: string } | undefined, source: AgentSource): Promise<void> {
    let size = 0;
    try { size = (await stat(file)).size; } catch { return; }
    const offset = this.offsets.get(file) ?? 0;
    if (size < offset) { this.offsets.set(file, 0); return; }
    if (size === offset) return;
    let text: string;
    try {
      const buffer = await readFile(file, { encoding: 'utf8' });
      text = buffer;
    } catch { return; }
    const lines = text.slice(offset).split(/\r?\n/);
    this.offsets.set(file, size);
    for (const line of lines) {
      const parsed = parser(line.trim());
      if (parsed) this.emit(parsed.event, source, parsed.tool);
    }
  }

  private async scanClaude(): Promise<void> {
    const files = await newestJsonl(CLAUDE_DIR, 2);
    if (files.length === 0) return;
    for (const file of files) {
      if (!this.knownClaudeFiles.has(file)) {
        this.knownClaudeFiles.add(file);
        this.emit('notify', 'claude-code');
      }
      await this.drainFile(file, parseClaudeLine, 'claude-code');
    }
    if (this.knownClaudeFiles.size > 8) {
      const keep = new Set(files);
      for (const file of [...this.knownClaudeFiles]) if (!keep.has(file)) this.knownClaudeFiles.delete(file);
    }
  }

  private async scanCodex(): Promise<void> {
    const files = await newestJsonl(CODEX_DIR, 2);
    for (const file of files) {
      await this.drainFile(file, parseCodexLine, 'codex');
      this.knownCodexFiles.add(file);
    }
    if (this.knownCodexFiles.size > 8) {
      const keep = new Set(files);
      for (const file of [...this.knownCodexFiles]) if (!keep.has(file)) this.knownCodexFiles.delete(file);
    }
  }

  private async scanHooks(): Promise<void> {
    await this.drainFile(HOOKS_FILE, parseHooksLine, 'hooks');
  }

  private tick(): void {
    const tasks: Promise<void>[] = [];
    if (this.enabled.claudeCode) tasks.push(this.scanClaude());
    if (this.enabled.codex) tasks.push(this.scanCodex());
    if (this.enabled.claudeCode) tasks.push(this.scanHooks());
    void Promise.allSettled(tasks);
    if (this.sleeping) return;
    if (Date.now() - this.lastActivityAt >= IDLE_TO_SLEEP_MS) {
      this.emit('sleep', 'claude-code');
    }
  }

  start(): void {
    this.stop();
    this.tick();
    this.timer = setInterval(() => this.tick(), POLL_MS);
    this.rescanTimer = setInterval(() => {
      this.knownClaudeFiles.clear();
      this.knownCodexFiles.clear();
    }, RESCAN_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.rescanTimer) clearInterval(this.rescanTimer);
    this.timer = undefined;
    this.rescanTimer = undefined;
  }
}
