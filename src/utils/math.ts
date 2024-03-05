export const roundp = (v: number, precision: number = 3) => {
  const multiplier = Math.pow(10, precision);
  return Math.round(v * multiplier) / multiplier;
};
