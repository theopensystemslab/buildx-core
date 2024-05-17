import { BuildModule } from "@/build-systems/remote/modules";
import { A } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { Column, ColumnLayout, Row } from "./types";
import { createRow, positionColumns, positionRows } from "./init";
import { sign } from "@/utils/math";

export const vanillaPadRow = (
  row: Row,
  n: number,
  vanillaModule: BuildModule
) =>
  pipe(
    row.positionedModules.map((x) => x.module),
    A.concat(A.replicate(n, vanillaModule)),
    createRow
  );

export const modifyRowAt = (
  row: Row,
  moduleIndex: number,
  newModule: BuildModule
): Row =>
  createRow(
    pipe(
      row.positionedModules,
      A.mapWithIndex((i, { module }) =>
        i === moduleIndex ? newModule : module
      )
    )
  );

export const modifyColumnAt = (
  column: Column,
  rowIndex: number,
  moduleIndex: number,
  newModule: BuildModule,
  vanillaModule: BuildModule
): Column => {
  const initialGridUnits = column.positionedRows[rowIndex].gridUnits;

  // so you wanna split the positioned rows up
  return pipe(
    column.positionedRows,
    A.mapWithIndex((i, row) => {
      if (i === rowIndex) {
        return modifyRowAt(row, moduleIndex, newModule);
      } else {
        return row;
      }
    }),
    (rows): Row[] => {
      const delta = rows[rowIndex].gridUnits - initialGridUnits;

      switch (sign(delta)) {
        // this row now bigger
        case 1:
          return pipe(
            rows,
            A.mapWithIndex((i, row) =>
              i === rowIndex ? row : vanillaPadRow(row, delta, vanillaModule)
            )
            // A.sequence(T.ApplicativeSeq)
          );
        // this row now smaller
        case -1:
          return pipe(
            rows,
            A.mapWithIndex((i, row) =>
              i === rowIndex ? vanillaPadRow(row, -delta, vanillaModule) : row
            )
          );
        default:
          return rows;
      }
    },
    (rows) => {
      const positionedRows = positionRows(rows);
      return { positionedRows, columnDepth: positionedRows[0].rowDepth };
    }
  );
};

export const modifyLayoutAt = (
  layout: ColumnLayout,
  columnIndex: number,
  rowIndex: number,
  moduleIndex: number,
  newModule: BuildModule,
  vanillaModule: BuildModule
): ColumnLayout =>
  pipe(
    layout,
    A.mapWithIndex((index, positionedColumn) =>
      index === columnIndex
        ? modifyColumnAt(
            positionedColumn,
            rowIndex,
            moduleIndex,
            newModule,
            vanillaModule
          )
        : positionedColumn
    ),
    positionColumns
  );
