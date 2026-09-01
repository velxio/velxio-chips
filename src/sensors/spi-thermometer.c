/*
 * SPI thermometer — a MAX6675-style thermocouple reader with a LIVE slider.
 *
 * Protocol: pull CS low, clock out 16 bits, raise CS. Bits 14..3 carry the
 * temperature in 0.25 C steps; bit 2 low means "thermocouple attached".
 *
 * WHERE the attribute is sampled is the lesson here: on the FALLING EDGE of
 * CS, the instant the master opens the transaction. Latching the whole
 * 16-bit word at once means a slider moved mid-transfer can never tear the
 * value — the same rule the I2C sensor applies in on_connect.
 */
#include "velxio-chip.h"

typedef struct {
  vx_pin  sck, miso, mosi, cs;
  vx_attr temp_c;
  vx_spi  spi;
  uint8_t buf[2];
} chip_state_t;

static chip_state_t S;

static void latch_and_start(void) {
  double t = vx_attr_read(S.temp_c);          /* live slider value */
  if (t < 0.0) t = 0.0;
  if (t > 500.0) t = 500.0;
  uint16_t raw = (uint16_t)(t * 4.0 + 0.5);   /* 0.25 C per LSB */
  uint16_t word = (uint16_t)(raw << 3);       /* bits 14..3; bit 2 = attached */
  S.buf[0] = (uint8_t)(word >> 8);
  S.buf[1] = (uint8_t)(word & 0xFF);
  vx_spi_start(S.spi, S.buf, 2);
}

static void on_cs_change(void *ud, vx_pin pin, int value) {
  (void)ud; (void)pin;
  if (value == VX_LOW) latch_and_start();
  else vx_spi_stop(S.spi);
}

static void on_spi_done(void *ud, uint8_t *buffer, uint32_t count) {
  (void)ud; (void)buffer; (void)count;   /* master clocks, we just serve */
}

void chip_setup(void) {
  S.sck    = vx_pin_register("SCK",  VX_INPUT);
  S.miso   = vx_pin_register("MISO", VX_OUTPUT_LOW);
  S.mosi   = vx_pin_register("MOSI", VX_INPUT);   /* unused by MAX6675 */
  S.cs     = vx_pin_register("CS",   VX_INPUT_PULLUP);
  S.temp_c = vx_attr_register("temp_c", 25);

  vx_spi_config cfg = {
    .sck       = S.sck,
    .mosi      = S.mosi,
    .miso      = S.miso,
    .cs        = S.cs,
    .mode      = 0,
    .on_done   = on_spi_done,
    .user_data = 0,
  };
  S.spi = vx_spi_attach(&cfg);
  vx_pin_watch(S.cs, VX_EDGE_BOTH, on_cs_change, 0);
  vx_log("spi thermometer ready");
}
