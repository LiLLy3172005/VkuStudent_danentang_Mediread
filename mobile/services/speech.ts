import * as Speech from 'expo-speech';

class SpeechService {
  private isSpeakingState = false;

  async speak(text: string, rate: number = 0.85) {
    if (!text || !text.trim()) return;

    try {
      if (this.isSpeakingState) {
        await this.stop();
      }

      this.isSpeakingState = true;
      Speech.speak(text, {
        language: 'vi-VN',
        pitch: 1.0,
        rate: rate,
        onDone: () => {
          this.isSpeakingState = false;
        },
        onError: () => {
          this.isSpeakingState = false;
        },
      });
    } catch (e) {
      console.warn('Speech error:', e);
      this.isSpeakingState = false;
    }
  }

  async stop() {
    try {
      await Speech.stop();
      this.isSpeakingState = false;
    } catch {}
  }

  isSpeaking(): boolean {
    return this.isSpeakingState;
  }
}

export const speechService = new SpeechService();
