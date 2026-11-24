import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function testGemini() {
  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL,
      contents: "Reply with exactly: CivicSignal AI Gemini Connected!"
    });

    console.log("Gemini API Test Successful!");
    console.log(response.text);

  } catch (error) {
    console.error("Gemini API Test Failed:", error.message);
  }
}

testGemini();