/*
 * Light sensor — one volt per decade. The slider is logarithmic in the UI;
 * the ENCODING on the pin is what this suite pins down.
 */
import { describe, it, expect } from 'vitest';
import { bootSensor, sensorWasmExists, MS } from './harness.js';

const WIRES = new Map([['OUT', 14]]);

describe.skipIf(!sensorWasmExists('light-sensor-log'))('light-sensor-log', () => {
  it('encodes log10(lux) at 1 V per decade', async () => {
    const { attrs, analog, advance } = await bootSensor('light-sensor-log', WIRES);
    expect(analog(14)).toBeCloseTo(Math.log10(200), 3); // default 200 lx

    for (const [lux, volts] of [[1, 0], [100, 2], [100000, 5]]) {
      attrs.set('lux', lux);
      advance(60n * MS);
      expect(analog(14)).toBeCloseTo(volts, 3);
    }
  });
});
