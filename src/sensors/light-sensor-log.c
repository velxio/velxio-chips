/*
 * Light sensor — a lux slider on a LOGARITHMIC scale.
 *
 * Real illuminance spans five decades: moonlight is ~0.2 lx, a living room
 * ~200, direct sun ~100 000. A linear slider wastes 99% of its travel on
 * "extremely bright", so chip.json declares `scale: "log"` and the slider
 * moves a decade at a time.
 *
 * OUT encodes log10(lux): 1 lx -> 0 V, 100 000 lx -> 5 V (1 V per decade).
 * The sketch inverts it with pow(10, ...) and gets the full range back at
 * uniform resolution — the same trick real light sensors play with their
 * log-response photodiodes.
 */
#include "velxio-chip.h"
#include <math.h>

#define LUX_MIN 1.0
#define LUX_MAX 100000.0

typedef struct {
  vx_pin   out;
  vx_attr  lux;
  vx_timer timer;
} chip_state_t;

static chip_state_t S;

static void on_tick(void *user_data) {
  (void)user_data;
  double lux = vx_attr_read(S.lux);          /* live slider value */
  if (lux < LUX_MIN) lux = LUX_MIN;
  if (lux > LUX_MAX) lux = LUX_MAX;
  double volts = log10(lux) / 5.0 * 5.0;     /* 1 V per decade */
  vx_pin_dac_write(S.out, volts);
}

void chip_setup(void) {
  S.out   = vx_pin_register("OUT", VX_ANALOG);
  S.lux   = vx_attr_register("lux", 200);
  S.timer = vx_timer_create(on_tick, 0);
  vx_timer_start(S.timer, 50000000ULL, true);  /* 50 ms */
  on_tick(0);
  vx_log("light sensor ready");
}
