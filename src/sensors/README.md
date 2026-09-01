# Programmable sensors

Six sensors whose readings you drive from **live sliders and buttons while
the simulation runs** — the `controls` section of each `chip.json` is what
puts them on screen. Free on every Velxio plan.

| Chip | Pattern it demonstrates | Runs in the gallery as |
| --- | --- | --- |
| `co2-sensor` | Analog: attribute → timer → `vx_pin_dac_write` | [CO2 Sensor (live slider)](https://velxio.dev/example/co2-sensor-live-slider) |
| `i2c-env-sensor` | I2C register map, latched in `on_connect` | [I2C Env Sensor (live sliders)](https://velxio.dev/example/i2c-env-sensor-live-sliders) |
| `motion-sensor` | `type: "button"` control, edge-polled, tick-countdown hold | [Motion Sensor (simulate button)](https://velxio.dev/example/motion-sensor-sim-button) |
| `light-sensor-log` | `scale: "log"` slider, five decades on one control | [Night Light (log lux slider)](https://velxio.dev/example/night-light-log-slider) |
| `spi-thermometer` | SPI slave, whole-word latch on the falling edge of CS | [SPI Thermometer (live slider)](https://velxio.dev/example/spi-thermometer-live-slider) |
| `uart-air-sensor` | Push-style serial sensor, one frame per second | [UART Air Sensor (live slider)](https://velxio.dev/example/uart-air-sensor-live-slider) |

Full walkthroughs: [Programmable sensors](https://velxio.dev/docs/custom-chips/programmable-sensors/)
in the Velxio docs.

## Canonical home

These sources are **canonical here** and mirrored byte-for-byte into the
Velxio app (the new-chip dialog templates and the gallery examples import
the same files). If you change one, change both sides — the files carry no
divergence markers on purpose so a plain `diff` is the sync check.
