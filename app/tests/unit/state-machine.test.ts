import test from 'node:test';
import assert from 'node:assert/strict';
import type { PetState } from '../../src/shared/contracts';
import { PetStateMachine } from '../../src/renderer/pet/state-machine';

function state(id: string, overrides: Partial<PetState> = {}): PetState {
  return {
    id,
    triggers: [],
    frames: [`${id}-1.png`, `${id}-2.png`],
    frameDurationMs: 100,
    loop: false,
    priority: 20,
    interrupt: 'restart',
    cooldownMs: 0,
    direction: 'neutral',
    anchor: { x: 0.5, y: 0.95 },
    mirrorSafe: true,
    ...overrides,
  };
}

const idle = state('idle', { loop: true, priority: 10, interrupt: 'resume' });

test('timed looping activity returns to idle', () => {
  const machine = new PetStateMachine([idle, state('play', { loop: true })], 0);
  assert.equal(machine.start('play', 10, 250), true);
  assert.equal(machine.tick(259).stateId, 'play');
  assert.equal(machine.tick(260).stateId, 'idle');
  assert.equal(machine.tick(10_000).stateId, 'idle');
});

test('only idle loops indefinitely by default', () => {
  const machine = new PetStateMachine([idle, state('looping', { loop: true })], 0);
  machine.start('looping', 0);
  assert.equal(machine.tick(199).stateId, 'looping');
  assert.equal(machine.tick(200).stateId, 'idle');
});

test('priority, restart and resume rules are enforced', () => {
  const high = state('high', { priority: 80 });
  const restart = state('restart', { priority: 80, interrupt: 'restart' });
  const resume = state('resume', { priority: 80, interrupt: 'resume' });
  const low = state('low', { priority: 30 });
  const machine = new PetStateMachine([idle, high, restart, resume, low], 0);
  machine.start('high', 0, 500);
  assert.equal(machine.start('low', 10), false);
  assert.equal(machine.start('restart', 20, 500), true);
  assert.equal(machine.start('restart', 30, 500), true);
  assert.equal(machine.start('resume', 40, 500), true);
  assert.equal(machine.start('resume', 50, 500), false);
});

test('cooldown starts when an activity completes', () => {
  const action = state('action', { cooldownMs: 300 });
  const machine = new PetStateMachine([idle, action], 0);
  machine.start('action', 0, 100);
  machine.tick(100);
  assert.equal(machine.start('action', 399), false);
  assert.equal(machine.start('action', 400), true);
});

test('tick reports frameProgress inside a looped frame', () => {
  const looped = state('looped', { loop: true });
  const machine = new PetStateMachine([idle, looped], 0);
  machine.start('looped', 0);
  const early = machine.tick(25);
  assert.equal(early.stateId, 'looped');
  assert.ok(early.frameProgress >= 0 && early.frameProgress < 1);
  const later = machine.tick(75);
  assert.ok(later.frameProgress > early.frameProgress);
  const wrapped = machine.tick(225);
  assert.ok(wrapped.frameProgress < later.frameProgress, 'looped frameProgress should wrap');
});

// ---- Agent activity parsers (Clawd-style monitors) ----

import { parseClaudeLine, parseCodexLine, parseHooksLine } from '../../src/main/agent-monitor';

test('parseClaudeLine maps assistant tool_use to typing', () => {
  const result = parseClaudeLine(JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', name: 'Bash', input: {} }] },
  }));
  assert.deepEqual(result, { event: 'typing', tool: 'bash' });
});

test('parseClaudeLine maps assistant text to thinking', () => {
  const result = parseClaudeLine(JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'text', text: 'Let me think…' }] },
  }));
  assert.deepEqual(result, { event: 'thinking' });
});

test('parseClaudeLine maps user tool_result error to error', () => {
  const result = parseClaudeLine(JSON.stringify({
    type: 'user',
    message: { content: [{ type: 'tool_result', tool_use_id: 'x', is_error: true }] },
  }));
  assert.deepEqual(result, { event: 'error', tool: 'tool' });
});

test('parseClaudeLine ignores malformed and unrelated lines', () => {
  assert.equal(parseClaudeLine('not-json'), undefined);
  assert.equal(parseClaudeLine(JSON.stringify({ type: 'system' })), undefined);
  assert.equal(parseClaudeLine(JSON.stringify({ type: 'assistant', message: { content: [] } })), undefined);
});

test('parseCodexLine maps function_call to typing and errors to error', () => {
  assert.deepEqual(parseCodexLine(JSON.stringify({
    type: 'response_item',
    payload: { type: 'function_call', name: 'Read' },
  })), { event: 'typing', tool: 'read' });
  assert.deepEqual(parseCodexLine(JSON.stringify({
    type: 'response_item',
    payload: { type: 'function_call_output', output: 'Error: denied', is_error: true },
  })), { event: 'error', tool: 'tool' });
  assert.deepEqual(parseCodexLine(JSON.stringify({
    type: 'response_item',
    payload: { type: 'message' },
  })), { event: 'thinking' });
  assert.equal(parseCodexLine('junk'), undefined);
});

test('parseHooksLine maps Claude Code hook events', () => {
  assert.deepEqual(parseHooksLine(JSON.stringify({ event: 'SessionStart' })), { event: 'notify' });
  assert.deepEqual(parseHooksLine(JSON.stringify({ event: 'PreToolUse', tool_name: 'Bash' })), { event: 'typing', tool: 'bash' });
  assert.deepEqual(parseHooksLine(JSON.stringify({ event: 'PostToolUseFailure', tool_name: 'Read' })), { event: 'error', tool: 'read' });
  assert.deepEqual(parseHooksLine(JSON.stringify({ event: 'Stop' })), { event: 'done' });
  assert.deepEqual(parseHooksLine(JSON.stringify({ event: 'SessionEnd' })), { event: 'idle' });
  assert.equal(parseHooksLine(JSON.stringify({ event: 'Bogus' })), undefined);
  assert.equal(parseHooksLine(''), undefined);
});
