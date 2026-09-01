/*
 * I2C env sensor — a register map at 0x44, two sliders, and the one rule
 * that matters for protocol sensors: the attributes are latched when the
 * master OPENS a read, whole map at once, so a slider dragged mid-transfer
 * can never hand back a torn 16-bit value.
 */
import { describe, it, expect } from 'vitest';
import { I2CBus } from '../src/I2CBus.js';
import { bootSensor, sensorWasmExists } from './harness.js';

/** Minimal TWIEventHandler counterpart: records what the bus completes. */
class FakeTwi {
  completeStart() {}
  completeStop() {}
  completeConnect(ok) { this.connected = ok; }
  completeWrite(ack) { this.lastAck = ack; }
  completeRead(v) { this.lastRead = v; }
}

function readRegs(bus, twi, pointer, n) {
  bus.connectToSlave(0x44, true);
  bus.writeByte(pointer);
  bus.stop();
  bus.connectToSlave(0x44, false);
  const out = [];
  for (let i = 0; i < n; i++) { bus.readByte(true); out.push(twi.lastRead); }
  bus.stop();
  return out;
}

const le16 = (lo, hi) => ((hi << 8) | lo) << 16 >> 16;   // signed
const ule16 = (lo, hi) => (hi << 8) | lo;

describe.skipIf(!sensorWasmExists('i2c-env-sensor'))('i2c-env-sensor', () => {
  it('serves temperature and humidity in 0.1 units, little-endian', async () => {
    const twi = new FakeTwi();
    const bus = new I2CBus(twi);
    await bootSensor('i2c-env-sensor', new Map(), { i2cBus: bus });

    const [tLo, tHi, hLo, hHi] = readRegs(bus, twi, 0x00, 4);
    expect(le16(tLo, tHi)).toBe(250);   // 25.0 C
    expect(ule16(hLo, hHi)).toBe(500);  // 50.0 %RH
  });

  it('a slider move lands on the NEXT transaction, never torn', async () => {
    const twi = new FakeTwi();
    const bus = new I2CBus(twi);
    const { attrs } = await bootSensor('i2c-env-sensor', new Map(), { i2cBus: bus });

    attrs.set('temperature', -10.5);
    attrs.set('humidity', 87);
    const [tLo, tHi, hLo, hHi] = readRegs(bus, twi, 0x00, 4);
    expect(le16(tLo, tHi)).toBe(-105);
    expect(ule16(hLo, hHi)).toBe(870);

    // Drag mid-read: the map was latched at on_connect, so this read still
    // returns the OLD pair, coherently.
    bus.connectToSlave(0x44, true); bus.writeByte(0x00); bus.stop();
    bus.connectToSlave(0x44, false);
    bus.readByte(true); const lo = twi.lastRead;
    attrs.set('temperature', 40);                 // mid-transfer drag
    bus.readByte(true); const hi = twi.lastRead;
    bus.stop();
    expect(le16(lo, hi)).toBe(-105);
  });

  it('negative temperatures survive the int16 round-trip', async () => {
    const twi = new FakeTwi();
    const bus = new I2CBus(twi);
    const { attrs } = await bootSensor('i2c-env-sensor', new Map(), { i2cBus: bus });
    attrs.set('temperature', -40);
    const [tLo, tHi] = readRegs(bus, twi, 0x00, 2);
    expect(le16(tLo, tHi)).toBe(-400);
  });
});
