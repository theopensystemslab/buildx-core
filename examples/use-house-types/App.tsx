import React, { Suspense } from "react";
import Everything from "./Everything";

const App = () => {
  return (
    <div>
      <div>hello</div>
      <Suspense fallback={<div>fallback</div>}>
        <Everything />
      </Suspense>
    </div>
  );
};

export default App;
