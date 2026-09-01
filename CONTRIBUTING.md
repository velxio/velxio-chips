# Contributing to velxio-chips

Thanks for your interest in extending the open-source chip collection.
Every chip in here is one C file + one JSON manifest + a vitest suite —
the bar for adding a new one is low.

## Ground rules

- **Clean-room only.** Implementations must come from public datasheets,
  user manuals, or your own measurements on real silicon. Do not vendor
  code from GPL/LGPL emulators like MAME, 86Box, or YACE. Quoting the
  datasheet for opcodes is fine — they are not copyrightable. Copying
  someone else's instruction-decoder source is not.

- **No external dependencies in the chip C.** Only the standard headers
  (`stdint.h`, `stdbool.h`, `string.h`, …) plus the `vx_*` API from
  `sdk/velxio-chip.h`. The chip runs in a tiny WASM sandbox with no
  filesystem and no syscalls — keep memory small (under 64 KB if you can).

- **Tests are the spec.** Every new chip needs at least one vitest
  test that exercises its bus protocol or pin behaviour. Bonus points
  for end-to-end runs of public-domain firmware (the way `tests/8080`
  runs CPUDIAG and `tests/z80` runs ZEXDOC).

## Workflow

1. Fork the repo, branch off `main`.
2. Write `chips/<category>/<chip>.c` and `chips/<category>/<chip>.chip.json`.
   `<category>` is one of `cpu`, `bus`, or `bundled`.
3. Drop a `tests/<chip>/<chip>.test.js` describing the pin contract,
   using `BoardHarness` from `harness/`.
4. `npm install && npm run compile:all && npm test`.
5. Open a PR with a one-paragraph description of what the chip does and
   what datasheet you worked from.

## Style

- 2-space indent, K&R braces. Match the style of the existing chips —
  `chips/cpu/8080.c` is the canonical reference.
- Top-of-file comment that names the device, the datasheet you used,
  and the pin layout it implements.
- Pin names match the datasheet wherever possible — e.g. `A0..A15` for
  the address bus, `D0..D7` for data, `RD`/`WR`/`CS` (active-low signals
  are still named without the bar character in JSON).
- Public-domain ROM images can ship in `autosearch/roms/` if they are
  under 16 KB; for larger ones, point to a download URL in the test file.
