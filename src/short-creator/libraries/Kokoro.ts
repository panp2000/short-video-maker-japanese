import { KokoroTTS, TextSplitterStream } from "kokoro-js";
import axios from "axios";
import {
  VoiceEnum,
  type kokoroModelPrecision,
  type Voices,
} from "../../types/shorts";
import { KOKORO_MODEL, logger } from "../../config";

export class Kokoro {
  private voicevoxUrl: string | null = null;
  private useVoicevox: boolean = false;
  
  constructor(private tts: KokoroTTS | null) {
    // VOICEVOXのURLが設定されている場合は保存
    this.voicevoxUrl = process.env.VOICEVOX_URL || null;
    this.useVoicevox = !!this.voicevoxUrl;
    
    logger.info({ 
      voicevoxUrl: this.voicevoxUrl,
      useVoicevox: this.useVoicevox 
    }, "TTS configuration");
  }

  async generate(
    text: string,
    voice: Voices,
  ): Promise<{
    audio: ArrayBuffer;
    audioLength: number;
  }> {
    // 日本語文字が含まれている場合、VOICEVOXを使用
    const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
    
    logger.info({ 
      text, 
      hasJapanese, 
      useVoicevox: this.useVoicevox,
      voicevoxUrl: this.voicevoxUrl 
    }, "Processing text");
    
    if (hasJapanese && this.useVoicevox) {
      logger.info("Using VOICEVOX for Japanese text");
      try {
        return await this.generateWithVoicevox(text, voice);
      } catch (error) {
        logger.error({ error }, "VOICEVOX failed, falling back to Kokoro");
        // フォールバックしない - エラーを投げる
        throw new Error(`VOICEVOX generation failed: ${error}`);
      }
    }
    
    // 英語の場合は既存のKokoro処理
    if (!this.tts) {
      throw new Error("Kokoro TTS not initialized");
    }
    
    logger.info("Using Kokoro for English text");
    
    const splitter = new TextSplitterStream();
    const stream = this.tts.stream(splitter, {
      voice,
    });
    splitter.push(text);
    splitter.close();

    const output = [];
    for await (const audio of stream) {
      output.push(audio);
    }

    const audioBuffers: ArrayBuffer[] = [];
    let audioLength = 0;
    for (const audio of output) {
      audioBuffers.push(audio.audio.toWav());
      audioLength += audio.audio.audio.length / audio.audio.sampling_rate;
    }

    const mergedAudioBuffer = Kokoro.concatWavBuffers(audioBuffers);
    logger.debug({ text, voice, audioLength }, "Audio generated with Kokoro");

    return {
      audio: mergedAudioBuffer,
      audioLength: audioLength,
    };
  }

  private async generateWithVoicevox(
    text: string,
    voice: Voices,
  ): Promise<{
    audio: ArrayBuffer;
    audioLength: number;
  }> {
    if (!this.voicevoxUrl) {
      throw new Error("VOICEVOX URL not configured");
    }
    
    try {
      // VOICEVOXのスピーカーIDマッピング（簡易版）
      const speakerMap: Record<string, number> = {
        'zundamon': 3,      // ずんだもん（ノーマル）
        'metan': 2,         // 四国めたん（ノーマル）
        'tsumugi': 8,       // 春日部つむぎ（ノーマル）
        'default': 3,       // デフォルトはずんだもん
      };
      
      // 音声から適切なスピーカーIDを選択（とりあえずデフォルト）
      const speakerId = speakerMap['default'];
      
      logger.info({ 
        voicevoxUrl: this.voicevoxUrl, 
        text, 
        speakerId 
      }, "Calling VOICEVOX API");
      
      // 1. 音声クエリの生成
      const queryResponse = await axios.post(
        `${this.voicevoxUrl}/audio_query`,
        null,
        {
          params: { text, speaker: speakerId },
          timeout: 30000
        }
      );
      
      logger.info("VOICEVOX audio_query successful");
      
      // 2. 音声合成
      const synthesisResponse = await axios.post(
        `${this.voicevoxUrl}/synthesis`,
        queryResponse.data,
        {
          params: { speaker: speakerId },
          responseType: 'arraybuffer',
          timeout: 60000
        }
      );
      
      // Node.jsでは、axiosはBufferを返す
      const audioBuffer = Buffer.from(synthesisResponse.data);
      
      // WAVファイルから音声長を計算
      // WAVヘッダーから情報を読み取る
      const sampleRate = audioBuffer.readUInt32LE(24);
      const dataSize = audioBuffer.readUInt32LE(40);
      const audioLength = dataSize / sampleRate / 2; // 16bit mono
      
      logger.info({ 
        text, 
        speakerId, 
        audioLength,
        audioSize: audioBuffer.length,
        sampleRate,
        dataSize
      }, "Audio generated with VOICEVOX successfully");
      
      // ArrayBufferに変換して返す
      const arrayBuffer = audioBuffer.buffer.slice(
        audioBuffer.byteOffset,
        audioBuffer.byteOffset + audioBuffer.byteLength
      );
      
      return {
        audio: arrayBuffer,
        audioLength
      };
    } catch (error: any) {
      logger.error({ 
        error: error.message,
        voicevoxUrl: this.voicevoxUrl,
        text 
      }, "Failed to generate audio with VOICEVOX");
      throw error;
    }
  }

  static concatWavBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
    const header = Buffer.from(buffers[0].slice(0, 44));
    let totalDataLength = 0;

    const dataParts = buffers.map((buf) => {
      const b = Buffer.from(buf);
      const data = b.slice(44);
      totalDataLength += data.length;
      return data;
    });

    header.writeUInt32LE(36 + totalDataLength, 4);
    header.writeUInt32LE(totalDataLength, 40);

    return Buffer.concat([header, ...dataParts]);
  }

  static async init(dtype: kokoroModelPrecision): Promise<Kokoro> {
    // VOICEVOXモードの場合、Kokoro TTSの初期化をスキップ
    if (process.env.VOICEVOX_URL) {
      logger.info("Running in VOICEVOX mode, skipping Kokoro TTS initialization");
      return new Kokoro(null);
    }
    
    const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL, {
      dtype,
      device: "cpu", // only "cpu" is supported in node
    });

    return new Kokoro(tts);
  }

  listAvailableVoices(): Voices[] {
    // VOICEVOXモードの場合は、仮の音声リストを返す
    if (this.voicevoxUrl) {
      return ['zundamon', 'metan', 'tsumugi'] as any;
    }
    
    const voices = Object.values(VoiceEnum) as Voices[];
    return voices;
  }
}
