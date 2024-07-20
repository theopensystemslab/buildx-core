import { T } from "@/utils/functions";
import React, { Suspense } from "react";
import useTask from "./useTask";

const myTask = T.of("Hello, World!");

function MyComponent() {
  const result = useTask(myTask);
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
