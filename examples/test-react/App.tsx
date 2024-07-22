import { cachedModelsTE, localHousesTE } from "@/index";
import { pipe } from "fp-ts/lib/function";
import React, { Suspense, useEffect } from "react";
import useTaskEither from "./useTaskEither";

function MyComponent() {
  const result = useTaskEither(localHousesTE);

  useEffect(() => {
    // pipe(
    //   cachedModulesTE,
    //   TE.map(
    //     flow(
    //       A.head,
    //       O.map(({ speckleBranchUrl }) => {
    //         getCachedModelTE(speckleBranchUrl)().then((x) => {
    //           console.log({ x });
    //         });
    //       })
    //     )
    //   )
    // )();

    pipe(cachedModelsTE)().then((x) => {
      console.log({ x });
    });
  }, []);

  return <div>{JSON.stringify(result, null, 2)}</div>;
}

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MyComponent />
    </Suspense>
  );
}

export default App;
