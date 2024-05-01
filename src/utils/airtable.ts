import Airtable from "airtable";

// Access the environment variable with import.meta.env
const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY;

if (!apiKey) {
  throw new Error("Airtable API key is not defined in environment variables.");
}

Airtable.configure({ apiKey });

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
