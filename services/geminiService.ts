import { GoogleGenAI, Modality, Type } from "@google/genai";
import { WordAnalysis, DifficultyLevel, AnalysisType } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to clean JSON strings from markdown blocks
const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const analyzeTextForVocabulary = async (
  text: string, 
  userLevel: string = 'B1', 
  modelName: string = 'gemini-2.5-flash',
  enabledTypes: AnalysisType[] = ['vocabulary']
): Promise<WordAnalysis[]> => {
  const ai = getAI();
  const prompt = `
    Analyze the following English text for an upper-intermediate learner. 
    Identify key items based on the following enabled categories: ${enabledTypes.join(', ')}.

    1. **Vocabulary**: Identify words/phrases at CEFR level ${userLevel} or higher (B2, C1, C2). Ignore names/places.
    2. **Grammar**: (If enabled) Identify complex sentence structures, inverted sentences, advanced conditional forms, or unique syntax usage.
    3. **Literary**: (If enabled) Identify literary devices like metaphors, similes, symbolism, or foreshadowing.
    4. **Historical**: (If enabled) Identify historical references, cultural allusions, or specific era-related terminology.

    For EACH identified item, provide:
    - type: One of ['vocabulary', 'grammar', 'literary', 'historical']
    - word: The specific word or phrase (or the grammar pattern name).
    - lemma: Root form (for vocabulary) or same as word.
    - phonetic: IPA (only for vocabulary).
    - partOfSpeech: (noun, verb, etc. for vocabulary; 'phrase' or 'clause' for others).
    - collocations: List 2-3 phrases (mostly for vocabulary).
    - context: The exact sentence it appeared in.
    - level: CEFR level (B2-C2) or 'Advanced' for non-vocab.
    - definition: Concise English definition or explanation of the grammar/literary concept.
    - persianTranslation: Natural Persian translation or explanation.
    - exampleSentence: A simplified example using the word or concept.

    Return the result as a JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `${prompt}\n\nTEXT TO ANALYZE:\n${text}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['vocabulary', 'grammar', 'literary', 'historical'] },
              word: { type: Type.STRING },
              lemma: { type: Type.STRING },
              phonetic: { type: Type.STRING, description: "IPA pronunciation (vocabulary only)" },
              partOfSpeech: { type: Type.STRING },
              collocations: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }
              },
              context: { type: Type.STRING },
              level: { type: Type.STRING },
              definition: { type: Type.STRING },
              persianTranslation: { type: Type.STRING },
              exampleSentence: { type: Type.STRING },
            },
            required: ['type', 'word', 'lemma', 'context', 'definition', 'persianTranslation', 'exampleSentence']
          }
        }
      }
    });

    const result = JSON.parse(cleanJson(response.text || '[]'));
    // Ensure types are valid defaults if missing
    return result.map((item: any) => ({
       ...item,
       type: item.type || 'vocabulary'
    })) as WordAnalysis[];
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

export const analyzeSingleWord = async (
  targetWord: string,
  contextSentence: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<WordAnalysis> => {
  const ai = getAI();
  const prompt = `
    Analyze the specific word "${targetWord}" found in this context: "${contextSentence}".
    Provide a detailed vocabulary analysis for a language learner.
    
    Return the result as a single JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['vocabulary'] },
            word: { type: Type.STRING },
            lemma: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            collocations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            context: { type: Type.STRING },
            level: { type: Type.STRING },
            definition: { type: Type.STRING },
            persianTranslation: { type: Type.STRING },
            exampleSentence: { type: Type.STRING },
          },
          required: ['word', 'lemma', 'partOfSpeech', 'context', 'definition', 'persianTranslation', 'exampleSentence']
        }
      }
    });

    const result = JSON.parse(cleanJson(response.text || '{}'));
    return { ...result, type: 'vocabulary' } as WordAnalysis;
  } catch (error) {
    console.error("Single Word Analysis Error:", error);
    throw error;
  }
};

export const translateFullText = async (text: string, modelName: string = 'gemini-2.5-flash'): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Translate the following English text into natural, fluent Persian. Maintain the tone and formatting.\n\n${text}`,
    });
    return response.text || '';
  } catch (error) {
    console.error("Translation Error:", error);
    throw error;
  }
};

export const generateSpeechFromText = async (text: string, modelName: string = 'gemini-2.5-flash-preview-tts'): Promise<string | null> => {
  const ai = getAI();
  try {
    // Use Kore as it is a robust standard voice for TTS tasks
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });
    
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Generation Error:", error);
    return null;
  }
};

export interface PronunciationResult {
  score: number; // 0-100
  feedback: string;
  correctedWords: { word: string; status: 'correct' | 'mispronounced' | 'missing' }[];
}

export const evaluatePronunciation = async (
  originalText: string, 
  userTranscript: string, 
  modelName: string = 'gemini-2.5-flash'
): Promise<PronunciationResult> => {
  const ai = getAI();
  const prompt = `
    Compare the Original Text with the User's Spoken Transcript.
    Rate the pronunciation accuracy on a scale of 0-100.
    Provide specific feedback in Persian on how to improve.
    Return a list of words from the original text indicating if they were correct, mispronounced, or missing.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `${prompt}\n\nOriginal: "${originalText}"\nUser Said: "${userTranscript}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            correctedWords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ['correct', 'mispronounced', 'missing'] }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(cleanJson(response.text || '{}')) as PronunciationResult;
  } catch (error) {
    console.error("Pronunciation Eval Error:", error);
    throw error;
  }
};