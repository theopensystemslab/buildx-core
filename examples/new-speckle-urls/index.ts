import { speckleObjectTE } from "@/data/build-systems/models";

// TEST DATA
const url1 = "https://speckle.xyz/streams/7eed2cc71a/branches/main";
const url2 =
  "https://app.speckle.systems/projects/171f6792e9/models/fb85d3871b";

speckleObjectTE(url1)().then((result) => {
  console.log(result);
});

speckleObjectTE(url2)().then((result) => {
  console.log(result);
});
