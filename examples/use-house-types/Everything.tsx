import { housePriorityDataTE } from "@/index";
import { E, logTaskPerf } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import React from "react";
import { suspend } from "suspend-react";

const Everything = () => {
  const e = suspend(pipe(housePriorityDataTE, logTaskPerf("foo")), []);

  return pipe(
    e,
    E.match(
      () => null,
      (data) => (
        <div style={{ whiteSpace: "pre" }}>{JSON.stringify(data, null, 2)}</div>
      )
    )
  );
};

export default Everything;
