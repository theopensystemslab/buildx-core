import Airtable from "airtable";

// Access the environment variable with import.meta.env
const apiKey = import.meta.env.VITE_AIRTABLE_API_KEY;

if (!apiKey) {
  throw new Error("Airtable API key is not defined in environment variables.");
}

Airtable.configure({ apiKey });

const airtable = new Airtable();

export default airtable;
