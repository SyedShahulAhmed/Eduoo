import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "../config/env.js";

const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);

export const generateOneLineReco = async (platform, metrics) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Give me ONE LINE motivational recommendation ONLY for next week's improvement.
Target platform: ${platform}
Metrics: ${JSON.stringify(metrics)}

Rules:
- Only one single sentence.
- Keep it short and positive.
- Include a relevant emoji.
- DO NOT mention platforms that are not in target.
`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini 1-line reco error:", err.message);
    return `Stay consistent on ${platform} next week! 💪`;
  }
};
