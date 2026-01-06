
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const cleanJson = (text: string) => {
  if (!text) return '{"questions": []}';
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export async function summarizeDocument(base64Image: string): Promise<string> {
  const base64Data = base64Image.includes('base64,') 
    ? base64Image.split('base64,')[1] 
    : base64Image;

  const imagePart = { 
    inlineData: { 
      mimeType: 'image/jpeg', 
      data: base64Data 
    } 
  };

  const textPart = { 
    text: `Você é um Tutor Acadêmico de Elite. Analise o material e crie um resumo executivo com Essência, Pontos Críticos e Atenção (erros comuns).` 
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
      config: { temperature: 0.15 }
    });
    return response.text || "Erro ao processar resumo.";
  } catch (error) {
    return "Erro ao conectar com a IA para resumo.";
  }
}

export async function deepenKnowledge(question: string, answer: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Professor Particular. Explique o porquê desta questão: 
      Q: ${stripHtml(question)} 
      A: ${stripHtml(answer)}
      Use analogia e exemplo prático. Markdown.`
    });
    return response.text || "Não foi possível aprofundar.";
  } catch (error) {
    return "Erro de conexão com o tutor.";
  }
}

export async function generateQuizQuestions(flashcards: any[]): Promise<any[]> {
  if (!flashcards || flashcards.length === 0) return [];

  const flashcardsData = flashcards
    .slice(0, 20)
    .map((f, i) => `FC${i+1}: P: ${stripHtml(f.question)} | R: ${stripHtml(f.answer)}`)
    .join('\n');
  
  const prompt = `Você é um Especialista em Concursos. 
Crie um simulado de múltipla escolha (A até E) baseado NESTES flashcards:
${flashcardsData}

Gere 5 questões. Responda APENAS o JSON conforme o esquema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  banca: { type: Type.STRING },
                  tema: { type: Type.STRING },
                  enunciado: { type: Type.STRING },
                  opcoes: {
                    type: Type.OBJECT,
                    properties: {
                      a: { type: Type.STRING },
                      b: { type: Type.STRING },
                      c: { type: Type.STRING },
                      d: { type: Type.STRING },
                      e: { type: Type.STRING }
                    },
                    required: ["a", "b", "c", "d", "e"]
                  },
                  respostaCorreta: { type: Type.STRING },
                  explicacao: { type: Type.STRING }
                },
                required: ["banca", "tema", "enunciado", "opcoes", "respostaCorreta", "explicacao"]
              }
            }
          },
          required: ["questions"]
        },
        temperature: 0.7 
      }
    });

    const resultText = response.text;
    const cleaned = cleanJson(resultText || '');
    const data = JSON.parse(cleaned);
    return data.questions || [];
  } catch (error) {
    console.error("Gemini Quiz Error:", error);
    throw new Error("Falha na geração do simulado pela IA.");
  }
}

export async function analyzeQuizPerformance(results: any[]): Promise<string> {
  const summary = results.map((r, i) => `Q${i+1}: ${r.isCorrect ? 'Acertou' : 'Errou'} - TEMA: ${r.question.tema} | ERRO: ${!r.isCorrect ? `O usuário marcou ${r.userAnswer} mas o correto era ${r.question.respostaCorreta}` : 'Nenhum'}`).join('\n');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Você é um Analista de Performance de Estudantes. Analise este simulado e crie um feedback técnico e motivador.
      RESULTADOS:
      ${summary}
      
      Gere um relatório em Markdown focado em:
      1. **Diagnóstico por Tema**: Identifique quais temas precisam de re-estudo imediato.
      2. **Padrão de Erro**: O estudante está errando por confundir conceitos ou falta de atenção?
      3. **Ações Práticas**: Liste 3 passos concretos para a próxima sessão de estudos.
      Use uma linguagem de mentor, emojis discretos e formatação clara.`
    });
    return response.text || "Feedback indisponível.";
  } catch (error) {
    return "Erro ao analisar performance.";
  }
}

