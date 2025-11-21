import { GoogleGenAI } from "@google/genai";
import { FileMetadata } from "../types";

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
    const isPdf = file.type === 'application/pdf';

    let prompt = "";
    let modelName = "gemini-2.5-flash";

    if (isImage) {
      modelName = "gemini-2.5-flash"; 
      prompt = "Analise esta imagem brevemente. Descreva o que é, detecte objetos principais ou leia textos visíveis. Responda em Português, máximo 20 palavras.";
    } else if (isText || isPdf) {
      modelName = "gemini-2.5-flash";
      prompt = "Analise este documento. Faça um resumo conciso dos pontos principais em Português, ideal para uma identificação rápida do conteúdo.";
    } else {
      return "Formato não suportado para análise IA.";
    }

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

// --- CHAT FUNCTIONALITY ---

export const createChatSession = (filesContext: FileMetadata[]) => {
  // Prepare context about existing files
  const contextDescription = filesContext.map(f => 
    `- Arquivo: ${f.name} (${f.type}). ${f.aiSummary ? `Resumo: ${f.aiSummary}` : 'Sem resumo ainda.'}`
  ).join('\n');

  const systemInstruction = `
    Você é o assistente virtual inteligente do sistema CloudVault Enterprise.
    Seu objetivo é ajudar o usuário a gerenciar seus arquivos e responder perguntas sobre eles.
    
    Aqui está a lista de arquivos que o usuário possui atualmente no banco de dados:
    ${contextDescription || "Nenhum arquivo disponível no momento."}

    Diretrizes:
    1. Responda sempre em Português do Brasil.
    2. Seja conciso, profissional e prestativo.
    3. Se o usuário perguntar sobre um arquivo específico, use o resumo fornecido no contexto para responder.
    4. Se perguntarem algo fora do contexto dos arquivos, responda como um assistente geral prestativo.
  `;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
    }
  });
};