let waveFunctions = {
  'ltr':
    (x, y, nx, ny) => x / nx,
  'rtl':
    (x, y, nx, ny) => 1 - x / nx,
  'ttb':
    (x, y, nx, ny) => y / ny,
  'btt':
    (x, y, nx, ny) => 1 - y / ny,
  'cascade down':
    (x, y, nx, ny) => (x + y * (nx + 1)) / ((nx + 1) * ny),
  'cascade up':
    (x, y, nx, ny) => 1 - (x + y * (nx + 1)) / ((nx + 1) * ny),
  'diagonal rtl':
    (x, y, nx, ny) => (nx - x + ny - y) / (nx + ny),
  'diagonal skew':
    (x, y, nx, ny) => (x / nx * ny + y) / (ny * 2),
  'center-circle':
    (x, y, nx, ny) => (Math.pow(x - nx / 2, 2) + Math.pow(y - ny / 2, 2)) / (Math.pow(nx/2, 2) + Math.pow(ny/2, 2)),
  'diamond':
    (x, y, nx, ny) => Math.abs((x - nx / 2) / nx) + Math.abs((y - ny / 2) / ny),
  'none':
    (x, y, nx, ny) => 0
};
