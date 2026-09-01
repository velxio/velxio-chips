#!/usr/bin/env bash
# Compile every chip source under chips/  into  fixtures/<name>.wasm,
# plus the test-only alternate-header chip (tests/compat/) — which is NOT
# under chips/ on purpose, and which this sweep once missed entirely: its
# suite skip-if-no-wasm'd itself in CI for months and the silence read as
# green.
#
# Usage:  bash scripts/compile-all.sh

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

mkdir -p "$ROOT/fixtures"

found=0
compiled=0

shopt -s nullglob
for c_source in "$ROOT"/chips/cpu/*.c "$ROOT"/chips/bus/*.c "$ROOT"/chips/bundled/*.c "$ROOT"/chips/sensors/*.c "$ROOT"/tests/compat/*.c; do
  found=$((found+1))
  base="$(basename "$c_source" .c)"
  out="$ROOT/fixtures/$base.wasm"
  echo "▸ compiling $base"
  if bash "$HERE/compile-chip.sh" "$c_source" "$out"; then
    compiled=$((compiled+1))
  else
    echo "  ✗ failed to compile $base"
  fi
done

if [ "$found" -eq 0 ]; then
  echo "No chip sources found under chips/."
  exit 0
fi

echo
echo "Compiled $compiled / $found chip(s) to fixtures/"
