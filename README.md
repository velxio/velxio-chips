# velxio-chips

Open-source custom chip collection for [Velxio](https://github.com/davidmonterocrespo24/velxio).

Every chip in this repo is a self-contained C file that compiles to a single
WebAssembly module and runs inside Velxio's `ChipRuntime`. Drop the `.wasm`
into a Custom Chip on the canvas, wire its pins, and it behaves like real
silicon — pin events, timers, UART, I2C, SPI, framebuffer, the works.

The collection has two wings:

- **Programmable sensors** — six chips whose readings you drive from live
  sliders and buttons *while the simulation runs*, one per pattern: analog,
  I2C register map, momentary button, logarithmic slider, SPI slave, and a
  push-style UART sensor. Free on every Velxio plan; each one runs in the
  gallery with a single click. See [`chips/sensors/`](chips/sensors/).
- A 5-CPU **retro Intel/Zilog family** (4004, 4040, 8080, 8086, Z80) plus
  the bus / peripheral chips that pair with them (EPROM, SRAM, latch, PIC,
  PIT, USART, PPI, …), and two bundled "mini-computer" demos that drop on
  the canvas as one chip and run real 8080 code out of an embedded ROM.

All implementations are **clean-room from manufacturer datasheets** — no
third-party emulator code. The 8080 is validated against Microcosm's
1980 CPUDIAG ROM ("CPU IS OPERATIONAL"); the Z80 is validated against
Frank Cringle's ZEXDOC (1994).

## Layout

```
.
├── sdk/                       SDK headers (velxio-chip.h is the API;
│                              wokwi-api.h / wokwi-compat.h are the
│                              source-compatibility layer)
├── chips/                     Every shippable chip, one .c + .chip.json
│   ├── sensors/               Programmable sensors (live sliders/buttons)
│   │   ├── co2-sensor.c       Analog: ppm slider → 0-5 V on OUT
│   │   ├── i2c-env-sensor.c   Temp + humidity registers at 0x44
│   │   ├── motion-sensor.c    PIR-style: Simulate-motion button + hold
│   │   ├── light-sensor-log.c Log-scale lux slider, 1 V per decade
│   │   ├── spi-thermometer.c  MAX6675-style thermocouple word
│   │   └── uart-air-sensor.c  PM2.5 frames at 9600 baud, push-style
│   ├── cpu/                   Retro CPU chips
│   │   ├── 4004.c             Intel 4004 (1971)
│   │   ├── 4040.c             Intel 4040 (1974)
│   │   ├── 8080.c             Intel 8080A (1975)
│   │   ├── 8086.c             Intel 8086 (1978)
│   │   └── z80.c              Zilog Z80 (1976)
│   ├── bus/                   Bus / peripheral chips
│   │   ├── rom-32k.c          27C256 EPROM
│   │   ├── ram-64k.c          HM62256 SRAM
│   │   ├── rom-1m.c           1 MB ROM for 8086 boot vector
│   │   ├── latch-8282.c       8282 address latch
│   │   ├── 4001-rom.c         4001 ROM (256 B + I/O)
│   │   ├── 4002-ram.c         4002 RAM (320 bits + I/O)
│   │   ├── 8255-ppi.c         8255 Programmable Peripheral Interface
│   │   ├── 8251-usart.c       8251 USART
│   │   ├── 8259-pic.c         8259 Programmable Interrupt Controller
│   │   └── 8253-pit.c         8253 Programmable Interval Timer
│   └── bundled/               Single-chip mini-computer demos
│       ├── i8080-repl.c       8080 + RAM + ROM + UART → banner streamer
│       ├── i8080-counter.c    8080 + RAM + ROM + LEDs + buttons
│       └── roms/              8080 assembly sources of the embedded ROMs
├── harness/                   JS testkit: ChipRuntime, PinManager, buses,
│                              BoardHarness, helpers, ISA tables
├── tests/                     Per-family vitest suites
│   ├── sensors/  4004/  4040/  8080/  8086/  z80/  buses/  compat/
├── scripts/
│   ├── compile-chip.sh        single chip → wasm
│   ├── compile-all.sh         every chip → fixtures/*.wasm
│   └── asm8080.py             two-pass Intel 8080 assembler (Python)
├── datasheets/                Manufacturer manuals + reference cards
└── vitest.config.js
```

## Compile

You need [wasi-sdk](https://github.com/WebAssembly/wasi-sdk) 22 or newer.

```bash
export WASI_SDK=/opt/wasi-sdk
npm run compile:all
```

This emits `fixtures/<name>.wasm` for every chip under `chips/`, plus the
test-only alternate-header chip in `tests/compat/`. The compile flags mirror what the Velxio backend uses,
so the same `.wasm` binary runs unchanged inside the app.

## Test

```bash
npm install
npm run compile:all
npm test
```

Tests are written in vitest and use `BoardHarness` — a tiny multi-chip
breadboard model — to wire CPUs to RAM/ROM chips by *named net* and step
the simulated clock in nanoseconds. Most tests skip cleanly when the
matching `.wasm` is missing, so you can `npm test` incrementally as you
compile chips.

## Programmable sensors

Every chip under `chips/sensors/` declares a `controls` section in its
`chip.json` — that is what puts sliders and buttons on screen during the
simulation. The chip re-reads the attribute with `vx_attr_read` wherever
the value is used, so a drag lands on the very next tick, transaction, or
frame with no recompile and no restart.

The six of them are chosen to cover one pattern each; the table in
[`chips/sensors/README.md`](chips/sensors/README.md) maps every chip to the
gallery example it runs as and the pattern it teaches. Full tutorials live
in the Velxio docs:
[Programmable sensors](https://velxio.dev/docs/custom-chips/programmable-sensors/).

Their test suites (`tests/sensors/`) drive them the way the app does: the
`attrs` Map handed to `ChipInstance` is the same storage the running WASM
re-reads, so mutating it mid-test IS the slider, and a `set(1)`/`set(0)`
pair is the button. The suites pin down the parts that once actually broke:
the motion hold surviving a second press, and protocol sensors latching
whole words so a mid-transfer drag can never tear a reading.

## Bundled demos

The two chips under `chips/bundled/` are designed to drop straight onto
Velxio's canvas as a Custom Chip:

- **i8080-repl** — Intel 8080 + RAM + ROM + memory-mapped UART, wired
  through `vx_uart_attach` so the Serial Monitor sees what the 8080 prints.
  The embedded ROM prints a banner then runs an "uptime ticks: 0xNN" loop
  every ~50 ms with a real `DCR/JNZ` busy-wait — proof the 8080 core is
  executing real instructions.

- **i8080-counter** — Intel 8080 + RAM + ROM + 8 LED outputs + 2 button
  inputs. The embedded ROM increments a counter on each `BTN_INC` press
  and clears it on `BTN_RST`, driving `LED0..LED7` in binary.

The 8080 emulator code in both bundled chips is the same clean-room
implementation as `chips/cpu/8080.c`, just with the bus-pin protocol
replaced by direct memory access against an internal `RAM[]` buffer +
MMIO peripherals.

## Adding a new chip

1. Write `chips/<category>/<chip>.c` against `sdk/velxio-chip.h`.
   Register pins with `vx_pin_register`, attach an I2C/UART/SPI
   peripheral if needed, and schedule callbacks with `vx_pin_watch` or
   `vx_timer_create`.
2. Add a `<chip>.chip.json` next to it describing the pin list, any
   user-editable attributes, and — for a sensor — the `controls` that put
   sliders and buttons on screen while the simulation runs.
3. `npm run compile:chip chips/<category>/<chip>.c fixtures/<chip>.wasm`
4. Drop a `tests/<chip>/<chip>.test.js` that wires it with `BoardHarness`
   (or `ChipInstance` directly, the way `tests/sensors/` does) and
   asserts on its observable behaviour.

## License

MIT — see [LICENSE](LICENSE). Every chip in this repo is the result of a
clean-room reading of public datasheets and is free to use, modify, and
redistribute.

## Status

| Suite | Tests | Notes |
| --- | --- | --- |
| tests/sensors | 12 | Six programmable sensors: slider, button, log, I2C, SPI, UART |
| tests/buses   | 17 | rom-32k + ram-64k + latch-8282 + 4001/4002 + 8255/8251/8259/8253 |
| tests/4004    | 12 | Full 46-instruction ISA + Busicom-style nibble bus |
| tests/4040    | 7  | All 14 new opcodes + INT vectoring + BBS |
| tests/8080    | 20 | CPUDIAG end-to-end pass |
| tests/8086    | 16 | Bus + reset + ISA + 8259 PIC integration |
| tests/z80     | 22 | Full bus + ISA + INT/NMI + ZEXDOC end-to-end pass |
| tests/compat  | —  | Alternate-header (wokwi-api.h) compile + dispatch |
