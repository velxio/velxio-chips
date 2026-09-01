/**
 * Shared setup for the programmable-sensor suites.
 *
 * The `attrs` Map handed to ChipInstance is the SAME storage the running
 * WASM re-reads on every vx_attr_read — mutating it mid-test IS the slider.
 * A button is `attrs.set(k, 1)` followed by `attrs.set(k, 0)` a beat later,
 * exactly the pulse the live panel produces.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ChipInstance } from '../src/ChipRuntime.js';
import { PinManager } from '../src/PinManager.js';

const here = dirname(fileURLToPath(import.meta.url));

export function sensorWasmExists(name) {
  return existsSync(resolve(here, '..', 'fixtures', `${name}.wasm`));
}

export function loadSensorWasm(name) {
  return readFileSync(resolve(here, '..', 'fixtures', `${name}.wasm`));
}

/**
 * Boot a sensor chip with a controllable clock.
 * Returns { inst, attrs, pinManager, analog, digital, advance }.
 *  - analog(pin): last vx_pin_dac_write voltage seen on that pin
 *  - digital(pin): last driven level (true/false) on that pin
 *  - advance(ns): move sim time forward and fire due timers
 */
export async function bootSensor(name, wires, { attrs = new Map(), i2cBus = null, spiBus = null } = {}) {
  const pinManager = new PinManager();
  const analogByPin = new Map();
  const digitalByPin = new Map();
  for (const pin of wires.values()) {
    // PinManager dispatches (pin, value) — the pin rides first.
    pinManager.onAnalogChange(pin, (_p, v) => analogByPin.set(pin, v));
    pinManager.onPinChange(pin, (_p, v) => digitalByPin.set(pin, v));
  }
  let now = 0n;
  const inst = await ChipInstance.create({
    wasm: loadSensorWasm(name),
    pinManager,
    i2cBus,
    spiBus,
    wires,
    attrs,
    simNanos: () => now,
  });
  inst.start();   // create() instantiates only; chip_setup runs here
  return {
    inst,
    attrs,
    pinManager,
    analog: pin => analogByPin.get(pin),
    digital: pin => digitalByPin.get(pin),
    advance: ns => {
      now += BigInt(ns);
      inst.tickTimers(now);
    },
  };
}

export const MS = 1_000_000n;
