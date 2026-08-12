import "dotenv/config";

import {
  GoogleGenAI,
  FunctionCallingConfigMode,
} from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY environment variable is not configured"
  );
}

export const ai = new GoogleGenAI({
  apiKey,
});

export { FunctionCallingConfigMode };