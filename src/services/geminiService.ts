import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface TTSOptions {
  format: "monologue" | "dialogue";
  voice: "male" | "female";
  speed: "normal" | "slow";
}

export async function generateFlemishAudio(text: string, options: TTSOptions) {
  const model = "gemini-2.5-flash-preview-tts";
  
  let prompt = "";
  let speechConfig: any = {};

  if (options.format === "monologue") {
    const voiceName = options.voice === "male" ? "Fenrir" : "Kore"; // Fenrir/Zephyr for male, Kore/Puck for female
    const speedInstruction = options.speed === "slow" ? "Speak slowly and clearly for a language learner." : "Speak at a natural pace.";
    
    prompt = `Read the following text in Flemish (Belgian Dutch). ${speedInstruction}\n\nText:\n${text}`;
    
    speechConfig = {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName },
      },
    };
  } else {
    // Dialogue
    const speedInstruction = options.speed === "slow" ? "The speakers should talk slowly and clearly." : "The speakers should talk at a natural pace.";
    
    // First, we need to transform the text into a dialogue if it's not already.
    // We can do this in the same prompt or a separate one. 
    // Multi-speaker TTS requires a specific format in the prompt usually.
    
    prompt = `Transform the following text into a natural, engaging dialogue between two Flemish speakers, Jan (male) and An (female). 
    Then, generate the audio for this dialogue in Flemish (Belgian Dutch). 
    ${speedInstruction}
    
    Dialogue format:
    Jan: [text]
    An: [text]
    
    Original Text:
    ${text}`;

    speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          {
            speaker: "Jan",
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Fenrir" },
            },
          },
          {
            speaker: "An",
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        ],
      },
    };
  }

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig,
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  const transcript = response.text; // The model might return the dialogue text too

  return {
    audioData: base64Audio,
    transcript: transcript || text,
  };
}
