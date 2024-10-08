import * as A from "fp-ts/Array";
import { flow, identity, pipe } from "fp-ts/lib/function";
import * as Mon from "fp-ts/Monoid";
import * as Num from "fp-ts/number";
import * as O from "fp-ts/Option";
import * as Ord from "fp-ts/Ord";
import * as RA from "fp-ts/ReadonlyArray";
import * as R from "fp-ts/Record";
import * as S from "fp-ts/string";
import * as T from "fp-ts/Task";
import * as TO from "fp-ts/TaskOption";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

export * as M from "fp-ts/Map";
export * as NEA from "fp-ts/NonEmptyArray";
export * as RM from "fp-ts/ReadonlyMap";
export * as RNEA from "fp-ts/ReadonlyNonEmptyArray";
export * as RR from "fp-ts/ReadonlyRecord";
export * as SG from "fp-ts/Semigroup";
export * as EQ from "fp-ts/Eq";
export * as TU from "fp-ts/Tuple";
export * as RTU from "fp-ts/ReadonlyTuple";

const clamp = Ord.clamp(Num.Ord);

export { A, Num, O, Ord, R, RA, S, T, TE, TO, E, clamp };

export const any = (...args: boolean[]) =>
  args.reduce((acc, v) => acc || v, false);
export const all = (...args: boolean[]) =>
  args.reduce((acc, v) => acc && v, true);
// export const all = concatAll(MonoidAll)

export const mapToOption =
  <A, B>(f: (a: A) => O.Option<B>) =>
  (fa: Array<A>): O.Option<Array<B>> => {
    const fb = new Array<B>(fa.length);
    //                   ^?
    for (let i = 0; i < fa.length; i++) {
      const result = f(fa[i]);
      if (O.isNone(result)) return O.none;
      else fb[i] = result.value;
    }
    return O.some(fb);
  };

export const reduceToOption: <A, B>(
  b: O.Option<B>,
  f: (i: number, b: O.Option<B>, a: A) => O.Option<B>
) => (fa: Array<A>) => O.Option<B> = (b, f) => (fa) => {
  const len = fa.length;
  let out = b;
  for (let i = 0; i < len; i++) {
    out = f(i, out, fa[i]);
    if (O.isNone(out)) return O.none;
  }
  return out;
};

export const guardNotNullish = <T>(val: T | null | undefined): val is T => {
  if (val === null || val === undefined) {
    return false;
  }
  return true;
};

export const errorThrower = (message?: string) => () => {
  throw new Error(message);
};

export const someOrError = <T>(message?: string) =>
  O.match<T, T>(errorThrower(message), identity);

export const pipeLog = <T>(t: T): T => {
  return console.log(t), t;
};

export const pipeLogWith =
  <T>(f: (t: T) => void) =>
  (t: T): T => {
    console.log(f(t));
    return t;
  };

export const pipeEffect =
  <T>(f: (t: T) => void) =>
  (t: T): T => {
    f(t);
    return t;
  };

export const upperFirst = flow(
  S.split(""),
  RA.modifyAt(0, S.toUpperCase),
  O.map(Mon.concatAll(S.Monoid))
);

export const objComp = (
  a: Record<string, unknown>,
  b: Record<string, unknown>
) =>
  pipe(
    R.keys(a),
    A.reduce(true, (acc, k) => acc && a[k] === b[k])
  );

// Function to capitalize the first letter of each string in an array
export const capitalizeFirstLetters = (str: string): string =>
  str
    .split(" ")
    .map((x) => x.charAt(0).toUpperCase())
    .join("");

export const clearRecord = (obj: Record<string, unknown>) => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      delete obj[key];
    }
  }
};

export const unwrapSome = <A>(
  taskOptionArray: T.Task<O.Option<A>[]>
): T.Task<A[]> =>
  pipe(
    taskOptionArray,
    T.map(A.compact) // compact function removes None and unwraps Some values
  );

export const headTail = <T>(xs: T[]) =>
  pipe(
    xs,
    A.partitionWithIndex((i) => i === 0 || i === xs.length - 1),
    ({ left: middle, right: [start, end] }) => ({
      start,
      end,
      middle,
    })
  );

type Guard<T> = (obj: unknown) => obj is T;

export const combineGuards =
  <A, B>(guard1: Guard<A>, guard2: Guard<B>): Guard<A | B> =>
  (obj: unknown): obj is A | B =>
    guard1(obj) || guard2(obj);

export function compareProps<T extends Record<string, unknown>>(
  obj1: T,
  obj2: T
): boolean;
export function compareProps<T extends Record<string, unknown>>(
  obj1: T,
  obj2: T,
  props: (keyof T)[]
): boolean;
export function compareProps<T extends Record<string, unknown>>(
  obj1: T,
  obj2: T,
  props?: (keyof T)[]
): boolean {
  const keysToCompare = props || (Object.keys(obj1) as (keyof T)[]);
  return keysToCompare.every((prop) => obj1[prop] === obj2[prop]);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
  leading = false
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>): void {
    const later = () => {
      timer = null;
      if (!leading) fn(...args);
    };
    const callNow = leading && !timer;
    if (timer) clearTimeout(timer);
    timer = setTimeout(later, delay);
    if (callNow) fn(...args);
  };
}

// Helper to run tasks until one succeeds
export const runUntilFirstSuccess = <E, A>(
  tasks: Array<TE.TaskEither<E, A>>
): TE.TaskEither<E, A> =>
  tasks.reduce(
    (acc, task) =>
      pipe(
        acc,
        TE.fold(
          () => task, // If previous failed, run current task
          () => acc // If previous succeeded, skip to result
        )
      ),
    TE.tryCatch(
      () => Promise.reject(),
      () => undefined as any
    ) // Initial failed TaskEither for reduce
  );

export const successSeqTO = <T>(tasks: TO.TaskOption<T>[]): T.Task<T[]> =>
  pipe(
    tasks,
    A.map(
      TO.fold(
        () => T.of([]),
        (a) => T.of([a])
      )
    ),
    A.sequence(T.ApplicativePar),
    T.map(A.flatten)
  );

export const successSeqTE = <E, T>(tasks: TE.TaskEither<E, T>[]): T.Task<T[]> =>
  pipe(
    tasks,
    A.map(
      TE.fold(
        () => T.of([]),
        (a) => T.of([a])
      )
    ),
    A.sequence(T.ApplicativePar),
    T.map(A.flatten)
  );

export const logTaskPerf =
  (label: string) =>
  <A>(task: T.Task<A>): T.Task<A> =>
    pipe(
      T.of(performance.now()),
      T.chain((start) =>
        pipe(
          task,
          T.chain((result) =>
            pipe(
              T.of(performance.now()),
              T.map((end) => {
                const timeTaken = end - start;
                console.log({
                  [label]: result,
                  timeTaken: `${timeTaken} ms`,
                });
                return result;
              })
            )
          )
        )
      )
    );

export function unwrapTaskEither<E, A>(te: TE.TaskEither<E, A>): Promise<A> {
  return te().then(
    E.fold(
      (e) => {
        throw e;
      },
      (a) => a
    )
  );
}
