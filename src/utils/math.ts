const { floor, max, PI, random, sin } = Math;

export const roundp = (v: number, precision: number = 3) => {
  const multiplier = Math.pow(10, precision);
  return Math.round(v * multiplier) / multiplier;
};

export { floor, max, PI, random, sin };
