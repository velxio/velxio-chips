/**
 * Wokwi API compatibility — a chip written 100% against the documented
 * Wokwi custom chips C API (chip_init, pin_init, struct-config pin_watch /
 * timer_init, attr_init, timer_start in MICROseconds) compiles through
 * sdk/wokwi-api.h -> wokwi-compat.h and runs on the native runtime
 * unchanged. See test_compat/wokwi-style-chip.c.
 */
import { describe, it, expect } from 'vitest';
import { BoardHarness } from '../src/BoardHarness.js';
import { chipWasmExists } from '../src/helpers.js';

const CHIP = 'wokwi-style-chip';
const skip = !chipWasmExists(CHIP);

const PINS = { IN: 'in', OUT: 'out', TICK: 'tick' };

describe.skipIf(skip)('wokwi-compat.h', () => {
  it('chip_init runs (via the chip_setup rename) and OUTPUT_HIGH lands', async () => {
    const b = new BoardHarness();
    await b.addChip(CHIP, PINS);
    expect(b.getNet('out')).toBe(true);   // OUT registered OUTPUT_HIGH
    expect(b.getNet('tick')).toBe(false); // TICK registered OUTPUT_LOW
  });

  it('pin_watch config struct dispatches: OUT = !IN', async () => {
    const b = new BoardHarness();
    await b.addChip(CHIP, PINS);
    b.setNet('in', 1);
    expect(b.getNet('out')).toBe(false);
    b.setNet('in', 0);
    expect(b.getNet('out')).toBe(true);
  });

  it('attr_init/attr_read round-trip gates the watch (gain=0 disables)', async () => {
    const b = new BoardHarness();
    await b.addChip(CHIP, PINS, { attrs: new Map([['gain', 0]]) });
    b.setNet('in', 1);
    expect(b.getNet('out')).toBe(true);   // watch suppressed, OUT untouched
  });

  it('timer_start interprets MICROseconds (us->ns conversion, 1000x bug guard)', async () => {
    const b = new BoardHarness();
    await b.addChip(CHIP, PINS);
    // 500000 us = 500 ms. If the shim failed to convert, 500000 ns = 0.5 ms
    // would have fired hundreds of times by 499 ms.
    b.advanceNanos(499_000_000n);
    expect(b.getNet('tick')).toBe(false);
    b.advanceNanos(2_000_000n);           // cross 500 ms
    expect(b.getNet('tick')).toBe(true);
    b.advanceNanos(500_000_000n);         // repeat fires
    expect(b.getNet('tick')).toBe(false);
  });
});
