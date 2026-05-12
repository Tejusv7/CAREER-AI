import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
  if (!key || key === 'MY_GEMINI_API_KEY') {
    console.warn("Gemini API key is not set. Please configure VITE_GEMINI_API_KEY in your environment.");
  }
  return key;
};

export const ai = new GoogleGenAI({ apiKey: getApiKey() });

export interface ResumeAnalysis {
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  suggestedImprovements: string[];
  interviewTips: string[];
}

export async function analyzeResume(resumeText: string, targetRole: string): Promise<ResumeAnalysis> {
  // Rapid sanitation and size check
  const sanitizedText = resumeText.trim().replace(/\s+/g, ' ').slice(0, 12000);
  
  const prompt = `Analyze resume for "${targetRole}". 
  
  RESUME:
  ${sanitizedText}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.1, // Lower temperature for faster, more deterministic JSON
      systemInstruction: "You are a top-tier career architect. Analyze the resume against the target role. Be aggressive but fair with ATS scoring. Provide JSON: { \"atsScore\": number, \"strengths\": string[], \"weaknesses\": string[], \"missingSkills\": string[], \"suggestedImprovements\": string[], \"interviewTips\": string[] }. Keep arrays concise (max 5 items each).",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          atsScore: { type: Type.NUMBER },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
          interviewTips: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["atsScore", "strengths", "weaknesses", "missingSkills", "suggestedImprovements", "interviewTips"]
      }
    }
  });

  try {
    const analysis = JSON.parse(response.text);
    return analysis as ResumeAnalysis;
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("Invalid AI response format");
  }
}
