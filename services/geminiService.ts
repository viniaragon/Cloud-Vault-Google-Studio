import { GoogleGenAI } from "@google/genai";

const AI_API_KEY = process.env.API_KEY;

// Initialize Gemini
// Note: In a production app, never expose keys on the client. 
// This is for demonstration/prototyping purposes as requested.
const ai = new GoogleGenAI({ apiKey: AI_API_KEY });

export const analyzeFile = async (file: File, base64Data: string): Promise<string> => {
  if (!AI_API_KEY) {
    return "Chave de API não configurada.";
  }

  try {
    const isImage = file.type.startsWith('image/');
    const isText = file.type === 'text/plain';
    const isPdf = file.type === 'application/pdf'; // <--- AGORA ACEITAMOS PDF

    let prompt = "";
    let modelName = "gemini-2.5-flash";

    if (isImage) {
      modelName = "gemini-2.5-flash"; 
      prompt = "Analise esta imagem brevemente. Descreva o que é, detecte objetos principais ou leia textos visíveis. Responda em Português, máximo 20 palavras.";
    } else if (isText || isPdf) { // <--- PDF ENTRA AQUI
      modelName = "gemini-2.5-flash";
      prompt = "Analise este documento. Faça um resumo conciso dos pontos principais em Português, ideal para uma identificação rápida do conteúdo.";
    } else {
      return "Formato não suportado para análise IA.";
    }

    // Remove data URL prefix (e.g., "data:image/png;base64," or "data:application/pdf;base64,")
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