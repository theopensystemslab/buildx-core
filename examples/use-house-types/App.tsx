import React, { Suspense } from "react";
import HouseTypes from "./HouseTypes";
import { useBuildElements } from "@/data/build-systems/cache";
import { useHouses } from "@/data/user/houses";

const App = () => {
  const buildElements = useBuildElements();
  const houses = useHouses();

  console.log({ buildElements, houses });

  return (
    <div>
      <div>hello</div>
      <Suspense fallback={<div>fallback</div>}>
        <HouseTypes />
      </Suspense>
    </div>
  );
};

export default App;
