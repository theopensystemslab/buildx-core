import { E, TE } from "@/utils/functions";
import { pipe } from "fp-ts/lib/function";
import { useEffect, useState } from "react";

type Status<E, A> =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; data: A }
  | { status: "error"; error: E };

const useTaskEither = <E, A>(te: TE.TaskEither<E, A>): Status<E, A> => {
  const [status, setStatus] = useState<Status<E, A>>({ status: "idle" });

  useEffect(() => {
    const promise = te();

    setStatus({ status: "pending" });

    promise
      .then((data) => {
        pipe(
          data,
          E.fold(
            (error) => {
              console.log("Error:", error);
              setStatus({ status: "error", error });
            },
            (data) => {
              setStatus({ status: "success", data });
            }
          )
        );
      })
      .catch((error) => {
        console.log("Error:", error);
        setStatus({ status: "error", error });
      });

    return () => {
      // Cleanup function (if needed)
    };
  }, [te]);

  return status;
};

export default useTaskEither;
