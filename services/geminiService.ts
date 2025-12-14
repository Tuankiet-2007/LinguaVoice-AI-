import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Language, SubtitleSegment, GenerationResult } from "../types";

// Helper to create the Gemini client safely
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set the API_KEY environment variable.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Translates text and segments it into sentences using Gemini.
 */
export const translateAndSegment = async (
  text: string,
  sourceLang: Language
): Promise<SubtitleSegment[]> => {
  const ai = getClient();
  const targetLang = sourceLang === Language.ENGLISH ? Language.VIETNAMESE : Language.ENGLISH;
  
  const prompt = `
    You are a professional translator and subtitle aligner.
    Task:
    1. Split the following ${sourceLang} text into logical sentences or phrases suitable for subtitles.
    2. Translate each sentence into ${targetLang}.
    3. Return a JSON array of objects, where each object has "original" and "translated" fields.

    Input Text: "${text}"
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING },
            translated: { type: Type.STRING }
          },
          required: ["original", "translated"]
        }
      }
    }
  });

  const rawSegments = JSON.parse(response.text || "[]");
  
  // Initialize with placeholder timestamps. We will refine these based on audio duration later.
  return rawSegments.map((seg: any, index: number) => ({
    id: index,
    original: seg.original,
    translated: seg.translated,
    startTime: 0,
    endTime: 0
  }));
};

/**
 * Generates speech from text using Gemini TTS.
 */
export const generateSpeech = async (
  text: string,
  voiceName: string
): Promise<string> => {
  const ai = getClient();
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  });

  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!audioData) {
    throw new Error("Failed to generate audio.");
  }

  return audioData;
};

/**
 * Orchestrates the full process: Translation -> TTS -> Timestamp Alignment
 */
export const processContent = async (
  text: string,
  language: Language,
  voiceName: string
): Promise<GenerationResult> => {
  // 1. Translate and Segment
  const segments = await translateAndSegment(text, language);
  
  // 2. Generate Audio for the full text
  // We reconstruct the full text from segments to ensure consistency
  const fullTextToSpeak = segments.map(s => s.original).join(' ');
  const audioBase64 = await generateSpeech(fullTextToSpeak, voiceName);

  return {
    audioBase64,
    segments
  };
};

/**
 * Helper to estimate timestamps based on character count relative to total duration.
 * Since we don't get word-level timestamps from the API yet, this provides a visual approximation.
 */
export const alignSegments = (segments: SubtitleSegment[], duration: number): SubtitleSegment[] => {
  const totalChars = segments.reduce((sum, seg) => sum + seg.original.length, 0);
  let currentTime = 0;

  return segments.map(seg => {
    const segmentDuration = (seg.original.length / totalChars) * duration;
    const aligned = {
      ...seg,
      startTime: currentTime,
      endTime: currentTime + segmentDuration
    };
    currentTime += segmentDuration;
    return aligned;
  });
};

/**
 * Converts raw PCM base64 string to a WAV Blob.
 * Assumes 24kHz, 16-bit, Mono (standard for Gemini TTS).
 */
export const base64ToWavBlob = (base64: string, sampleRate = 24000): Blob => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);

  // RIFF identifier
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true); // file length - 8
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // length of fmt chunk
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate (SampleRate * BlockAlign)
  view.setUint16(32, 2, true); // Block align (Channels * BytesPerSample)
  view.setUint16(34, 16, true); // Bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, len, true);

  // Write PCM samples
  const pcmData = new Uint8Array(buffer, 44);
  for (let i = 0; i < len; i++) {
    pcmData[i] = binaryString.charCodeAt(i);
  }

  return new Blob([buffer], { type: 'audio/wav' });
};