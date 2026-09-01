/*
 * UART air-quality sensor — pushes a PM2.5 reading over serial once a
 * second, value on a LIVE slider.
 *
 * Plenty of real sensors work exactly like this (PMS5003, MH-Z19): no
 * request, no register map, just a line of data on TX at a fixed rate. The
 * sketch listens with SoftwareSerial and parses.
 *
 * The attribute is sampled when the line is BUILT, so a slider move lands
 * on the next emission. Number formatting is done by hand — a chip is a
 * tiny WASM module and there is no need to drag printf into it.
 */
#include "velxio-chip.h"

typedef struct {
  vx_uart  uart;
  vx_attr  pm25;
  vx_timer timer;
} chip_state_t;

static chip_state_t S;

static void on_rx(void *ud, uint8_t byte) {
  (void)ud; (void)byte;                     /* talk-only sensor */
}

static void on_tx_done(void *ud) { (void)ud; }

static void emit_reading(void *user_data) {
  (void)user_data;
  double v = vx_attr_read(S.pm25);          /* live slider value */
  if (v < 0.0) v = 0.0;
  if (v > 500.0) v = 500.0;
  uint32_t whole = (uint32_t)v;

  uint8_t line[24];
  uint32_t n = 0;
  const char head[] = "PM2.5=";
  for (const char *p = head; *p; p++) line[n++] = (uint8_t)*p;

  /* unsigned int to decimal, no stdio */
  uint8_t digits[8];
  uint32_t d = 0;
  do { digits[d++] = (uint8_t)('0' + whole % 10); whole /= 10; } while (whole);
  while (d) line[n++] = digits[--d];

  line[n++] = '\r';
  line[n++] = '\n';
  vx_uart_write(S.uart, line, n);
}

void chip_setup(void) {
  S.pm25 = vx_attr_register("pm25", 12);

  vx_uart_config cfg = {
    .rx         = vx_pin_register("RX", VX_INPUT),
    .tx         = vx_pin_register("TX", VX_INPUT_PULLUP),
    .baud_rate  = 9600,
    .on_rx_byte = on_rx,
    .on_tx_done = on_tx_done,
    .user_data  = 0,
  };
  S.uart = vx_uart_attach(&cfg);

  S.timer = vx_timer_create(emit_reading, 0);
  vx_timer_start(S.timer, 1000000000ULL, true);   /* one reading per second */
  vx_log("air sensor ready at 9600 baud");
}
