/*
 * Motion sensor — the button pattern. The regression this guards was found
 * live: a hold timed against absolute sim-now latched OUT high forever on
 * engines whose clock does not advance that way, and the second press
 * became invisible. The tick countdown must survive BOTH presses.
 */
import { describe, it, expect } from 'vitest';
import { bootSensor, sensorWasmExists, MS } from './harness.js';

const WIRES = new Map([['OUT', 2]]);

async function press({ attrs, advance }) {
  attrs.set('trigger', 1);
  advance(40n * MS);   // two polls: edge seen
  attrs.set('trigger', 0);
  advance(40n * MS);   // trigger release observed
}

describe.skipIf(!sensorWasmExists('motion-sensor'))('motion-sensor', () => {
  it('stretches a button blip into the hold time, twice in a row', async () => {
    const s = await bootSensor('motion-sensor', WIRES);
    expect(s.digital(2)).toBeFalsy();           // VX_OUTPUT_LOW at boot

    await press(s);
    expect(s.digital(2)).toBe(true);            // holding
    s.advance(2100n * MS);                      // default hold_s = 2
    expect(s.digital(2)).toBe(false);           // cleared

    await press(s);                             // the press that used to vanish
    expect(s.digital(2)).toBe(true);
    s.advance(2100n * MS);
    expect(s.digital(2)).toBe(false);
  });

  it('the hold slider changes the pulse width', async () => {
    const s = await bootSensor('motion-sensor', WIRES);
    s.attrs.set('hold_s', 5);
    await press(s);
    s.advance(3000n * MS);
    expect(s.digital(2)).toBe(true);            // 3 s < 5 s: still holding
    s.advance(2200n * MS);
    expect(s.digital(2)).toBe(false);
  });
});
