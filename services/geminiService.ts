import { GoogleGenAI } from "@google/genai";

const AI_API_KEY = process.env.API_KEY;

// Initialize Gemini
// Note: In a production app, never expose keys on the client. 
// This is for demonstration/prototyping purposes as requested.
const ai = new GoogleGenAI({ apiKey: AI_API_KEY });

export const analyzeFile = async (file: File, base64Data: string): Promise<string> => {
  if (!AI_API_KEY) {
    return "AIzaSyCBtitGHZ7ORACrglhkzG9aMD_OJdUYfPQ";
  }

  try {
    const isImage = file.type.startsWith('image/');
    const isText = file.type === 'text/plain';

    let prompt = "";
    let modelName = "gemini-2.5-flash";

    if (isImage) {
      modelName = "gemini-2.5-flash"; // Good for multimodal
      prompt = "Analise esta imagem brevemente. Descreva o que é, detecte objetos principais ou leia textos visíveis. Responda em Português, máximo 20 palavras.";
    } else if (isText) {
      modelName = "gemini-2.5-flash";
      prompt = "Resuma o conteúdo deste arquivo de texto em uma frase concisa em Português.";
    } else {
      return "Formato não suportado para análise IA.";
    }

    // Remove data URL prefix (e.g., "data:image/png;base64,")
    const base64Content = base64Data.split(',')[1];

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Content,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    return response.text || "Sem análise disponível.";
  } catch (error) {
    console.error("Erro na análise Gemini:", error);
    return "Erro ao analisar arquivo.";
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};