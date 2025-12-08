import { GoogleGenAI } from "@google/genai";
import { FileMetadata } from "../types";

const AI_API_KEY = process.env.API_KEY;

// Initialize Gemini only if API key exists (prevents app crash)
const ai = AI_API_KEY ? new GoogleGenAI({ apiKey: AI_API_KEY }) : null;

// Função de Análise (Usada para "Ver Resumo" ou transcrever áudio puro)
export const analyzeFile = async (file: File | Blob, base64Data: string): Promise<string> => {
  if (!AI_API_KEY || !ai) {
    return "Chave de API não configurada.";
  }

  try {
    const mimeType = file.type;
    const isImage = mimeType.startsWith('image/');
    const isAudio = mimeType.startsWith('audio/');

    // UPGRADE: Usando o modelo Gemini 3 Pro
    let modelName = "gemini-3-pro-preview";

    let prompt = "";

    if (isImage) {
      prompt = "Analise esta imagem. Descreva o que é, detecte objetos principais ou leia textos visíveis. Responda em Português.";
    } else if (isAudio) {
      prompt = "Ouça este áudio. Transcreva o conteúdo falado fielmente, apenas corrigindo pontuação.";
    } else {
      // PDF e Texto
      prompt = "Analise este documento. Faça um resumo detalhado dos pontos principais em Português.";
    }

    const base64Content = base64Data.split(',')[1];

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
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

export const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// --- CHAT FUNCTIONALITY ---

export const createChatSession = (filesContext: FileMetadata[]) => {
  const contextDescription = filesContext.map(f =>
    `- Arquivo: ${f.name} (${f.type}). ${f.aiSummary ? `Resumo: ${f.aiSummary}` : 'Sem resumo ainda.'}`
  ).join('\n');

  const systemInstruction = `
    Você é o assistente virtual avançado do sistema CloudVault Enterprise, alimentado pelo Gemini 3 Pro.
    
    CONTEXTO DE ARQUIVOS (Use APENAS se a pergunta for sobre eles):
    ${contextDescription || "Nenhum arquivo carregado no momento."}

    DIRETRIZES:
    1. **Capacidade Plena:** Você não é limitado aos arquivos. Pode responder sobre qualquer assunto (código, medicina, criatividade, etc).
    2. **Áudio:** Se receber uma transcrição de áudio do usuário, responda à pergunta ou comentário contido nela naturalmente.
    3. **Idioma:** Responda sempre em Português do Brasil.
  `;

  if (!ai) {
    throw new Error('API Key não configurada');
  }

  return ai.chats.create({
    model: 'gemini-3-pro-preview', // MODELO ATUALIZADO
    config: {
      systemInstruction: systemInstruction,
    }
  });
};