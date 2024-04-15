import { BuildElement } from "@/build-systems/remote/elements";
import { A } from "@/utils/functions";
import { GUI } from "dat.gui";
import { flow } from "fp-ts/lib/function";

const elementsToCategories = A.reduce([], (b: string[], a: BuildElement) =>
  b.includes(a.category) ? b : [...b, a.category]
);

const categoriesToOptions = A.reduce(
  {},
  (b: Record<string, boolean>, a: string) => ({
    ...b,
    [a]: true,
  })
);

const initCategories = flow(elementsToCategories, categoriesToOptions);

const gui = ({ elements }: { elements: BuildElement[] }) => {
  // Your data structure of type Record<string, boolean>
  const options: Record<string, boolean> = initCategories(elements);

  // Create a new dat.GUI instance
  const gui = new GUI();

  // Create a folder
  const folder = gui.addFolder("Options Folder");

  // Loop through each entry in the options object and add a checkbox to the folder
  Object.entries(options).forEach(([key]) => {
    // Adds a checkbox for each option inside the folder
    folder.add(options, key);
  });

  // Optionally, you can open the folder by default to show its contents
  folder.open();
};

export default gui;
