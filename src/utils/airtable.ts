import Airtable from "airtable";
import { TE } from "./functions";

// Access the environment variable with import.meta.env
const accessToken = import.meta.env.VITE_AIRTABLE_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error("Airtable API key is not defined in environment variables.");
}

Airtable.configure({
  apiKey: accessToken,
});

const airtable = new Airtable();

export default airtable;

// Utility function to fetch an image URL and convert it to a Blob
export const fetchImageAsBlob = (url: string): Promise<Blob> => {
  return fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error("Failed to fetch the image");
    }
    return response.blob();
  });
};

export const tryCatchImageBlob = (imageUrl: string | undefined) =>
  TE.tryCatch(
    () => {
      return typeof imageUrl === "undefined"
        ? Promise.resolve(undefined)
        : fetchImageAsBlob(imageUrl);
    },
    (reason) => {
      return reason instanceof Error ? reason : new Error(String(reason));
    }
  );
