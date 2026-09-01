/*
 * Motion sensor — a PIR-style trigger with a LIVE button.
 *
 * chip.json declares a `type: "button"` control named `trigger`. Pressing
 * it drives the `trigger` attribute to 1 for an instant; this chip polls it
 * on a fast timer, and on the rising edge holds OUT high for `hold_s`
 * seconds (the second control, a slider) — the way a real PIR stretches a
 * blip of motion into a readable pulse.
 *
 * The pattern to copy for any event-shaped sensor: poll the attribute on a
 * short timer and act on the EDGE, since a button is momentary and a slow
 * poll would miss it. The hold is a TICK COUNTDOWN rather than a deadline
 * against vx_sim_now_nanos(), so the chip behaves identically on engines
 * whose absolute clock advances differently.
 */
#include "velxio-chip.h"

typedef struct {
  vx_pin   out;
  vx_attr  trigger;
  vx_attr  hold_s;
  vx_timer timer;
  int      last_trigger;   /* previous poll, for edge detection */
  uint32_t ticks_left;     /* countdown at 20 ms per tick; 0 = idle */
} chip_state_t;

static chip_state_t S;

#define TICKS_PER_SECOND 50   /* the timer below fires every 20 ms */

static void on_tick(void *user_data) {
  (void)user_data;
  int trig = vx_attr_read(S.trigger) > 0.5 ? 1 : 0;

  if (trig && !S.last_trigger) {           /* rising edge: motion! */
    double hold = vx_attr_read(S.hold_s);
    if (hold < 1.0) hold = 1.0;
    if (hold > 10.0) hold = 10.0;
    if (S.ticks_left == 0) vx_pin_write(S.out, VX_HIGH);
    S.ticks_left = (uint32_t)(hold * TICKS_PER_SECOND);
  }
  S.last_trigger = trig;

  if (S.ticks_left > 0 && --S.ticks_left == 0) {
    vx_pin_write(S.out, VX_LOW);
  }
}

void chip_setup(void) {
  S.out     = vx_pin_register("OUT", VX_OUTPUT_LOW);
  S.trigger = vx_attr_register("trigger", 0);
  S.hold_s  = vx_attr_register("hold_s", 2);
  S.timer   = vx_timer_create(on_tick, 0);
  vx_timer_start(S.timer, 20000000ULL, true);   /* poll every 20 ms */
  vx_log("motion sensor ready — press Simulate motion");
}
