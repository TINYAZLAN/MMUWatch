import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const generateVideoSummary = async (videoTitle: string, description: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an AI assistant for MMU Tube, a video platform for Multimedia University. 
      Provide a concise, engaging summary and 3-4 key highlights for a video titled "${videoTitle}" with the following description: "${description}".
      Format the response in Markdown. Include a section for "Summary" and "Key Highlights".`,
    });

    return response.text;
  } catch (error) {
    console.error("AI Summarization failed:", error);
    return null;
  }
};

export const getAIRecommendations = async (userInterests: string[], currentVideoTitle: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the user's interests in ${userInterests.join(', ')} and the current video "${currentVideoTitle}", 
      suggest 3 relevant topics or categories they might enjoy on MMU Tube.`,
    });

    return response.text;
  } catch (error) {
    console.error("AI Recommendations failed:", error);
    return null;
  }
};
