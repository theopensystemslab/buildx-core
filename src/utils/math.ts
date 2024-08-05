import { A } from "./functions";

const { abs, floor, min, max, PI, random, sin, sign, atan2 } = Math;

export const roundp = (v: number, precision: number = 3) => {
  const multiplier = Math.pow(10, precision);
  return Math.round(v * multiplier) / multiplier;
};

export const hamming = (a: string, b: string) => {
  if (a.length !== b.length) throw new Error("Hamming of different lengths");

  return A.zipWith(a.split(""), b.split(""), (a, b) =>
    abs(a.codePointAt(0)! - b.codePointAt(0)!)
  ).reduce((acc, v) => acc + v, 0);
};

export { abs, atan2, floor, min, max, PI, random, sin, sign };
