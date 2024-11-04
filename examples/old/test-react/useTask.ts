import { T } from "@/utils/functions";
import { useEffect, useState } from "react";

type Status<A> =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; data: A }
  | { status: "error"; error: unknown };

const useTask = <A>(task: T.Task<A>): Status<A> => {
  const [status, setStatus] = useState<Status<A>>({ status: "idle" });

  useEffect(() => {
    const promise = task();

    setStatus({ status: "pending" });

    promise
      .then((data) => {
        setStatus({ status: "success", data });
      })
      .catch((error) => {
        setStatus({ status: "error", error });
      });

    return () => {
      // Cleanup function (if needed)
    };
  }, [task]);

  return status;
};

export default useTask;
