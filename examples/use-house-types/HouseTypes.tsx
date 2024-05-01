import { cachedHouseTypesTE } from "@/index";
import { E } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import React from "react";
import { suspend } from "suspend-react";

const HouseTypes = () => {
  return pipe(
    cachedHouseTypesTE,
    suspend,
    E.match(
      () => null,
      (houseTypes) => (
        <div style={{ whiteSpace: "pre" }}>
          {JSON.stringify({ houseTypes }, null, 2)}
        </div>
      )
    )
  );
};

export default HouseTypes;
