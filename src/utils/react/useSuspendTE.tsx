import { useRef } from "react";
import { TE } from "../functions";

type ResourceState<A> =
  | { status: "pending"; promise: Promise<void> }
  | { status: "success"; data: A }
  | { status: "error"; error: unknown };

const useSuspendTE = <E, A>(task: TE.TaskEither<E, A>): A => {
  const resourceRef = useRef<ResourceState<A> | null>(null);

  if (resourceRef.current === null) {
    let status: "pending" | "success" | "error" = "pending";
    let result: A;
    let error: unknown;

    const promise = task()
      .then((either) => {
        if (either._tag === "Right") {
          status = "success";
          result = either.right;
        } else {
          status = "error";
          error = either.left;
        }
      })
      .catch((err) => {
        status = "error";
        error = err;
      });

    resourceRef.current = {
      status: "pending",
      promise: promise.then(() => {
        if (status === "success") {
          resourceRef.current = { status: "success", data: result };
        } else if (status === "error") {
          resourceRef.current = { status: "error", error };
        }
      }),
    };
  }

  const resource = resourceRef.current;

  if (resource.status === "pending") {
    console.log(`pending`);
    throw resource.promise;
  } else if (resource.status === "error") {
    console.log(`error`);
    throw resource.error;
  } else {
    console.log(`success`);
    return resource.data;
  }
};

export default useSuspendTE;
