#!/usr/bin/env bash
# Compile a single Intel-CPU custom chip from C → WASM.
#
# The velxio backend uses these exact flags, so the emitted .wasm runs
# unchanged inside the app. Output goes wherever you point it; the test
# suites look in <repo>/fixtures/ via harness/helpers.js.
#
# Usage: bash scripts/compile-chip.sh <input.c> <output.wasm>

set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <input.c> <output.wasm>"
  echo "  e.g. $0 chips/cpu/8080.c fixtures/8080.wasm"
  exit 64
fi

INPUT="$1"
OUTPUT="$2"

if [ -z "${WASI_SDK:-}" ]; then
  for candidate in /opt/wasi-sdk /usr/local/wasi-sdk "$HOME/wasi-sdk"; do
    if [ -d "$candidate" ]; then WASI_SDK="$candidate"; break; fi
  done
fi

if [ -z "${WASI_SDK:-}" ] || [ ! -x "$WASI_SDK/bin/clang" ]; then
  echo "ERROR: wasi-sdk not found. Set WASI_SDK env var."
  echo "See test/test_custom_chips/scripts/setup-wasi-sdk.md for installation."
  exit 1
fi

# SDK header ships in sdk/ at the repo root.
HERE="$(cd "$(dirname "$0")" && pwd)"
SDK_INCLUDE="$HERE/../sdk"

if [ ! -f "$SDK_INCLUDE/velxio-chip.h" ]; then
  echo "ERROR: SDK header not found at $SDK_INCLUDE/velxio-chip.h"
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"

"$WASI_SDK/bin/clang" \
  --target=wasm32-unknown-wasip1 \
  -O2 \
  -nostartfiles \
  -Wl,--import-memory \
  -Wl,--export-table \
  -Wl,--no-entry \
  -Wl,--export=chip_setup \
  -Wl,--allow-undefined \
  -I"$SDK_INCLUDE" \
  "$INPUT" \
  -o "$OUTPUT"

echo "✓ $OUTPUT ($(wc -c < "$OUTPUT") bytes)"
