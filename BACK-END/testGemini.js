require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from .env");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents:
      "Explain why eval() is dangerous in Python and provide a secure alternative.",
  });

  console.log(response.text);
}

main().catch((error) => {
  console.error("Gemini test failed:");
  console.error(error.message);
  process.exit(1);
});