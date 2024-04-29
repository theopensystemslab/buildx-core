import React, { Suspense } from "react";
import HouseTypes from "./HouseTypes";

const App = () => {
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
