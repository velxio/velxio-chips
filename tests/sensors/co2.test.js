/*
 * CO2 sensor — the analog recipe: attribute → 50 ms timer → DAC.
 * Mutating the attrs Map mid-run is the live slider.
 */
import { describe, it, expect } from 'vitest';
import { bootSensor, sensorWasmExists, MS } from './harness.js';

const WIRES = new Map([['OUT', 14]]); // A0

describe.skipIf(!sensorWasmExists('co2-sensor'))('co2-sensor', () => {
  it('drives OUT from the ppm attribute, live', async () => {
    const { attrs, analog, advance } = await bootSensor('co2-sensor', WIRES);
    // chip_setup drives the initial level before the first tick
    expect(analog(14)).toBeCloseTo(((1000 - 400) / 4600) * 5.0, 3);

    attrs.set('ppm', 3000);           // the slider
    advance(60n * MS);                // one 50 ms tick later
    expect(analog(14)).toBeCloseTo(((3000 - 400) / 4600) * 5.0, 3);
  });

  it('clamps outside 400..5000 instead of extrapolating', async () => {
    const { attrs, analog, advance } = await bootSensor('co2-sensor', WIRES);
    attrs.set('ppm', 99999);
    advance(60n * MS);
    expect(analog(14)).toBeCloseTo(5.0, 3);
    attrs.set('ppm', -5);
    advance(60n * MS);
    expect(analog(14)).toBeCloseTo(0.0, 3);
  });
});
