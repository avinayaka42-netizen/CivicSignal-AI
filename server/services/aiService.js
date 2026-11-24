import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const ANALYSIS_PROMPT = `
You are an AI assistant for CivicSignal AI, a civic issue reporting platform.

Analyze the citizen's civic issue description and, if provided, the uploaded image.

Return ONLY valid JSON in this format:

{
  "category": "Road Damage",
  "priority": "High",
  "priorityScore": 85,
  "analysis": "A short explanation of the visible or described issue.",
  "recommendedAction": "Suggested action for authorities."
}

Rules:
- category must be one of:
  Road Damage, Garbage, Water Leakage, Drainage, Streetlight, Other.
- priority must be one of:
  Low, Medium, High, Critical.
- priorityScore must be a number between 0 and 100.
- Keep the analysis and recommendation short.
- Do not invent facts.
- If an image is provided, describe only what is visibly supported by it.
- If the image and description differ, mention the uncertainty in analysis.
- Do not claim that an issue is confirmed if the evidence is unclear.
`;

function validateAnalysis(result) {
  const categories = [
    "Road Damage",
    "Garbage",
    "Water Leakage",
    "Drainage",
    "Streetlight",
    "Other"
  ];

  const priorities = ["Low", "Medium", "High", "Critical"];

  if (
    !result ||
    !categories.includes(result.category) ||
    !priorities.includes(result.priority) ||
    typeof result.priorityScore !== "number" ||
    result.priorityScore < 0 ||
    result.priorityScore > 100 ||
    typeof result.analysis !== "string" ||
    typeof result.recommendedAction !== "string"
  ) {
    throw new Error("Gemini returned an invalid analysis.");
  }

  return result;
}

// TEXT-BASED ISSUE ANALYSIS
export const analyzeIssue = async (description) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing.");
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `${ANALYSIS_PROMPT}\n\nCitizen's issue description:\n${description}`,
      config: {
        responseMimeType: "application/json"
      }
    });

    return validateAnalysis(JSON.parse(response.text));
  } catch (error) {
    console.error("Gemini text analysis failed:", error.message);
    throw new Error("Unable to analyze the civic issue.");
  }
};

// IMAGE + TEXT-BASED ISSUE ANALYSIS
export const analyzeIssueWithImage = async (description, imageBuffer, mimeType) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing.");
  }

  if (!imageBuffer || !mimeType?.startsWith("image/")) {
    throw new Error("A valid image is required.");
  }

  try {
    const base64Image = imageBuffer.toString("base64");

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          text: `${ANALYSIS_PROMPT}\n\nCitizen's issue description:\n${description}`
        },
        {
          inlineData: {
            mimeType,
            data: base64Image
          }
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    return validateAnalysis(JSON.parse(response.text));
  } catch (error) {
    console.error("Gemini image analysis failed:", error.message);
    throw new Error("Unable to analyze the civic issue image.");
  }
};