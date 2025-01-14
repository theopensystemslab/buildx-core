import { A, O } from "@/utils/functions";
import { roundp } from "@/utils/math";
import { transpose } from "fp-ts-std/Array";
import { pipe } from "fp-ts/lib/function";
import { produce } from "immer";
import {
  Column,
  ColumnLayout,
  PositionedBuildModule,
  PositionedColumn,
  PositionedRow,
  Row,
} from "./types";
import { BuildModule } from "@/data/build-systems";

export const createPositionedModules = (
  module: BuildModule,
  acc?: PositionedBuildModule[]
): PositionedBuildModule[] => {
  if (acc && acc.length > 0) {
    const prev = acc[acc.length - 1];
    return [
      ...acc,
      {
        module,
        moduleIndex: prev.moduleIndex + 1,
        z: roundp(prev.z + prev.module.length / 2 + module.length / 2),
      },
    ];
  } else {
    return [
      {
        module,
        moduleIndex: 0,
        z: roundp(module.length / 2),
      },
    ];
  }
};

export const createRow = (modules: BuildModule[]): Row => {
  const {
    structuredDna: { levelType },
  } = modules[0];

  let positionedModules: PositionedBuildModule[] = [],
    gridUnits = 0,
    rowDepth = 0;

  for (let i = 0; i < modules.length; i++) {
    gridUnits += modules[i].structuredDna.gridUnits;
    rowDepth += modules[i].length;
    positionedModules = createPositionedModules(modules[i], positionedModules);
  }

  return {
    positionedModules,
    gridUnits,
    rowDepth,
    levelType,
    rowHeight: positionedModules[0].module.height,
    rowWidth: positionedModules[0].module.width,
  };
};

export const dnasToModules =
  ({
    systemId,
    buildModules,
  }: {
    systemId: string;
    buildModules: BuildModule[];
  }) =>
  (dnas: string[]) => {
    const result = pipe(
      dnas,
      A.filterMap((dna) =>
        pipe(
          buildModules,
          A.findFirst((x) => x.systemId === systemId && dna === x.dna)
        )
      )
    );

    if (result.length !== dnas.length) throw new Error("length mismatch");

    return result;
  };

export const modulesToRows = (modules: BuildModule[]): BuildModule[][] => {
  const jumpIndices = pipe(
    modules,
    A.filterMapWithIndex((i, m) =>
      m.structuredDna.positionType === "END" ? O.some(i) : O.none
    ),
    A.filterWithIndex((i) => i % 2 === 0)
  );

  return pipe(
    modules,
    A.reduceWithIndex(
      [],
      (moduleIndex, modules: BuildModule[][], module: BuildModule) => {
        return jumpIndices.includes(moduleIndex)
          ? [...modules, [{ ...module, moduleIndex }]]
          : produce(
              (draft) =>
                void draft[draft.length - 1].push({ ...module, moduleIndex })
            )(modules);
      }
    )
  );
};

export const analyzeColumn =
  <A extends unknown>(toLength: (a: A) => number) =>
  (as: A[][]) => {
    return pipe(
      as,
      A.reduceWithIndex(
        { legit: true, target: -1, rows: [] },
        (
          index,
          {
            rows,
            legit,
            target,
          }: {
            rows: { units: number; index: number }[];
            legit: boolean;
            target: number;
          },
          row: A[]
        ) => {
          const units = row.reduce((acc, a) => acc + toLength(a), 0);
          return {
            rows: [...rows, { units, index }],
            legit: legit && (target === -1 || target === units),
            target: target === -1 ? units : Math.max(target, units),
          };
        }
      )
    );
  };

export const columnify =
  <A extends unknown>(toLength: (a: A) => number) =>
  (input: A[][]) => {
    let slices = new Array<[number, number]>(input.length).fill([0, 1]);
    const lengths = input.map((v) => v.length);

    let acc: A[][][] = [];

    const slicesRemaining = () =>
      !pipe(
        A.zip(slices)(lengths),
        A.reduce(true, (acc, [length, [start]]) => acc && start > length - 1)
      );

    while (slicesRemaining()) {
      pipe(
        slices,
        A.mapWithIndex((rowIndex, [start, end]) =>
          input[rowIndex].slice(start, end)
        ),
        (column) =>
          pipe(column, analyzeColumn(toLength), ({ rows, legit, target }) => {
            if (legit) {
              acc = [...acc, column];
              slices = slices.map(([, end]) => [end, end + 1]);
            } else {
              slices = slices.map(([start, end], i) =>
                rows[i].units === target ? [start, end] : [start, end + 1]
              );
            }
          })
      );
    }

    return pipe(acc, transpose);
  };

export const modulesToColumns = (modules: BuildModule[]): BuildModule[][][] => {
  return pipe(
    modules,
    modulesToRows,
    A.map((row) =>
      pipe(
        row,
        // group by grid type
        A.reduce(
          { prev: null, acc: [] },
          (
            { prev, acc }: { prev: BuildModule | null; acc: BuildModule[][] },
            module
          ) => ({
            acc:
              module.structuredDna.positionType ===
                prev?.structuredDna.positionType &&
              module.structuredDna.gridType === prev?.structuredDna.gridType
                ? produce(acc, (draft) => {
                    draft[draft.length - 1].push(module);
                  })
                : produce(acc, (draft) => {
                    draft[draft.length] = [module];
                  }),
            prev: module,
          })
        ),
        ({ acc }) => acc
      )
    ),
    transpose
  );
};

export const modulesToMatrix = (modules: BuildModule[]): BuildModule[][][] => {
  const columns = modulesToColumns(modules);

  return pipe(
    columns,
    A.map((column) =>
      pipe(
        column,
        columnify((a) => a.structuredDna.gridUnits),
        transpose
      )
    ),
    A.flatten
  );
};

export const positionRows = A.reduceWithIndex(
  [],
  (rowIndex, acc: PositionedRow[], row: Row) => {
    const levelLetter = row.levelType[0];

    const y =
      levelLetter === "F"
        ? 0
        : roundp(
            acc[rowIndex - 1].y +
              acc[rowIndex - 1].positionedModules[0].module.height
          );

    return [...acc, { ...row, rowIndex: rowIndex, y }];
  }
);

export const createRowLayout = (rowsMatrix: BuildModule[][]): PositionedRow[] =>
  pipe(rowsMatrix, A.map(createRow), positionRows);

export const createColumn = (rows: BuildModule[][]): Column =>
  pipe(rows, createRowLayout, (positionedRows) => ({
    positionedRows,
    columnDepth: positionedRows[0].rowDepth,
  }));

export const positionColumns = A.reduceWithIndex(
  [],
  (
    columnIndex: number,
    acc: PositionedColumn[],
    { positionedRows }: Column
  ) => {
    const columnDepth = positionedRows[0].rowDepth;
    if (columnIndex === 0) {
      return [
        {
          positionedRows,
          columnIndex,
          columnDepth,
          z: 0,
        },
      ];
    } else {
      const last = acc[columnIndex - 1];

      return [
        ...acc,
        {
          positionedRows,
          columnIndex,
          columnDepth,
          z: roundp(last.z + last.columnDepth),
        },
      ];
    }
  }
);

export const createColumnLayout = (matrix: BuildModule[][][]): ColumnLayout =>
  pipe(matrix, A.map(createColumn), positionColumns);

export const columnLayoutToLevelTypes = (columnLayout: ColumnLayout) =>
  pipe(
    columnLayout,
    A.head,
    O.map(({ positionedRows }) =>
      pipe(
        positionedRows,
        A.map(({ levelType }) => levelType)
      )
    ),
    O.getOrElse((): string[] => [])
  );

export const columnLayoutToDnas = (
  columnLayout: Omit<PositionedColumn, "length" | "z" | "columnIndex">[]
) =>
  pipe(
    columnLayout,
    A.map(({ positionedRows }) =>
      pipe(
        positionedRows,
        A.map(({ positionedModules }) =>
          pipe(
            positionedModules,
            A.map(({ module }) => module.dna)
          )
        )
      )
    ),
    transpose,
    A.flatten,
    A.flatten
  ) as string[];
