/*
 * Compatibility fixture: a chip written 100% against the DOCUMENTED Wokwi
 * custom chips C API — chip_init entry point, pin_init, pin_watch with a
 * config struct, attr_init/attr_read, timer_init with a config struct and
 * timer_start in MICROseconds. Compiling and running it unchanged is the
 * test: every symbol resolves through wokwi-compat.h onto the native vx_*
 * API, and the timer cadence proves the us->ns conversion.
 *
 * Behaviour:
 *   OUT  = !IN                      (via pin_watch, combinational)
 *   TICK toggles every 500 ms       (via timer_start(…, 500000, true))
 *   The first attr_read("gain") value gates the watch: gain==0 disables it.
 */
#include "wokwi-api.h"
#include <stdlib.h>

typedef struct {
  pin_t in;
  pin_t out;
  pin_t tick;
  attr_t gain;
  timer_t timer;
  uint32_t tick_state;
} chip_state_t;

static void on_in_change(void *user_data, pin_t pin, uint32_t value) {
  chip_state_t *chip = (chip_state_t *)user_data;
  if (attr_read(chip->gain) == 0) return;   /* live-tunable kill switch */
  pin_write(chip->out, value ? LOW : HIGH);
}

static void on_timer(void *user_data) {
  chip_state_t *chip = (chip_state_t *)user_data;
  chip->tick_state = !chip->tick_state;
  pin_write(chip->tick, chip->tick_state ? HIGH : LOW);
}

void chip_init(void) {
  chip_state_t *chip = malloc(sizeof(chip_state_t));
  chip->tick_state = 0;
  chip->in = pin_init("IN", INPUT);
  chip->out = pin_init("OUT", OUTPUT_HIGH);
  chip->tick = pin_init("TICK", OUTPUT_LOW);
  chip->gain = attr_init("gain", 1);

  const pin_watch_config_t watch_config = {
    .edge = BOTH,
    .pin_change = on_in_change,
    .user_data = chip,
  };
  pin_watch(chip->in, &watch_config);

  const timer_config_t timer_config = {
    .callback = on_timer,
    .user_data = chip,
  };
  chip->timer = timer_init(&timer_config);
  timer_start(chip->timer, 500000, true);   /* 500 ms, in MICROseconds */
}
