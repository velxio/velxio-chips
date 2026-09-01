/*
 * UART air sensor — push-style: one "PM2.5=<n>" frame per second at 9600,
 * no request needed. The attribute is sampled when the frame is BUILT.
 */
import { describe, it, expect } from 'vitest';
import { bootSensor, sensorWasmExists, MS } from './harness.js';

const WIRES = new Map([['TX', 8], ['RX', 9]]);

function collector(inst) {
  let text = '';
  inst.onUartTx(b => { text += String.fromCharCode(b); });
  return () => text;
}

describe.skipIf(!sensorWasmExists('uart-air-sensor'))('uart-air-sensor', () => {
  it('emits one frame per second and tracks the slider on the next one', async () => {
    const s = await bootSensor('uart-air-sensor', WIRES);
    const text = collector(s.inst);

    s.advance(1100n * MS);
    expect(text()).toContain('PM2.5=12\r\n');   // default

    s.attrs.set('pm25', 180);                    // the slider
    s.advance(1000n * MS);
    expect(text()).toContain('PM2.5=180\r\n');

    // three windows, three frames — a push sensor, not a request/reply one
    const frames = text().split('\r\n').filter(Boolean);
    expect(frames.length).toBeGreaterThanOrEqual(2);
  });

  it('clamps at the manifest bounds', async () => {
    const s = await bootSensor('uart-air-sensor', WIRES);
    const text = collector(s.inst);
    s.attrs.set('pm25', 99999);
    s.advance(1100n * MS);
    expect(text()).toContain('PM2.5=500\r\n');
  });
});
