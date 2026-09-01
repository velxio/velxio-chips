/*
 * SPI thermometer — MAX6675 wire format. The whole 16-bit word is latched
 * on the FALLING EDGE of CS, which is what makes a mid-transfer slider
 * drag harmless.
 */
import { describe, it, expect } from 'vitest';
import { SPIBus } from '../../harness/SPIBus.js';
import { bootSensor, sensorWasmExists } from './harness.js';

const CS = 10;
const WIRES = new Map([['SCK', 13], ['MISO', 12], ['MOSI', 11], ['CS', CS]]);

/** A real SPI master idles CS high; the chip's edge watch needs to see the
 *  line there before a falling edge exists at all. */
function idleHigh(s) {
  s.pinManager.triggerPinChange(CS, true);
}

function readWord(s, spiBus) {
  s.pinManager.triggerPinChange(CS, false);     // falling edge: latch + arm
  const [hi, lo] = spiBus.transferBytes([0x00, 0x00]);
  s.pinManager.triggerPinChange(CS, true);
  return (hi << 8) | lo;
}

describe.skipIf(!sensorWasmExists('spi-thermometer'))('spi-thermometer', () => {
  it('encodes the slider temperature at 0.25 C per LSB in bits 14..3', async () => {
    const spiBus = new SPIBus();
    const s = await bootSensor('spi-thermometer', WIRES, { spiBus });
    idleHigh(s);

    let word = readWord(s, spiBus);
    expect((word >> 3) * 0.25).toBeCloseTo(25.0, 2);   // default
    expect(word & 0x04).toBe(0);                       // thermocouple attached

    s.attrs.set('temp_c', 358.75);
    word = readWord(s, spiBus);
    expect((word >> 3) * 0.25).toBeCloseTo(358.75, 2);
  });

  it('a drag between CS edges does not tear the word', async () => {
    const spiBus = new SPIBus();
    const s = await bootSensor('spi-thermometer', WIRES, { spiBus });
    idleHigh(s);
    s.attrs.set('temp_c', 100);

    s.pinManager.triggerPinChange(CS, false);          // latched at 100 C
    const [hi] = spiBus.transferBytes([0x00]);
    s.attrs.set('temp_c', 500);                        // mid-transfer drag
    const [lo] = spiBus.transferBytes([0x00]);
    s.pinManager.triggerPinChange(CS, true);

    expect((((hi << 8) | lo) >> 3) * 0.25).toBeCloseTo(100.0, 2);
  });
});
