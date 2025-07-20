// src/short-creator/libraries/create-japanese-captions.ts
// 日本語テキストから字幕を生成するヘルパー関数（改良版）

import type { Caption } from "../../types/shorts";

/**
 * 日本語テキストを自然な位置で分割
 * @param text 分割するテキスト
 * @returns 分割されたテキストの配列
 */
function splitJapaneseText(text: string): string[] {
  const chunks: string[] = [];
  
  // まず句読点で分割
  const sentences = text.split(/([。！？、])/);
  
  let currentChunk = '';
  for (let i = 0; i < sentences.length; i++) {
    const part = sentences[i];
    
    // 句読点は前の文に結合
    if (part.match(/[。！？、]/)) {
      currentChunk += part;
      if (part.match(/[。！？]/)) {
        // 文末なので区切る
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
      } else if (currentChunk.length > 7) {
        // 読点で、既に7文字以上なら区切る
        chunks.push(currentChunk);
        currentChunk = '';
      }
    } else if (part) {
      // 長い部分はさらに分割
      if (currentChunk.length + part.length > 10) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
        
        // 10文字以上の部分は助詞で分割を試みる
        if (part.length > 10) {
          const subParts = part.split(/(は|が|を|に|で|と|の|から|まで)/);
          let subChunk = '';
          
          for (const subPart of subParts) {
            if (subPart.match(/^(は|が|を|に|で|と|の|から|まで)$/)) {
              subChunk += subPart;
              if (subChunk.length >= 5) {
                chunks.push(subChunk);
                subChunk = '';
              }
            } else if (subPart) {
              if (subChunk.length + subPart.length > 10) {
                if (subChunk) chunks.push(subChunk);
                subChunk = subPart;
              } else {
                subChunk += subPart;
              }
            }
          }
          if (subChunk) chunks.push(subChunk);
        } else {
          currentChunk = part;
        }
      } else {
        currentChunk += part;
      }
    }
  }
  
  // 残りを追加
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  // 空の要素を除去
  return chunks.filter(chunk => chunk.trim().length > 0);
}

/**
 * 日本語テキストから字幕を生成（改良版）
 * @param text 元のテキスト
 * @param audioLength 音声の長さ（秒）
 * @returns 字幕の配列
 */
export function createJapaneseCaptions(text: string, audioLength: number): Caption[] {
  const captions: Caption[] = [];
  
  // テキストを自然な位置で分割
  const chunks = splitJapaneseText(text);
  
  if (chunks.length === 0) {
    return captions;
  }
  
  // 各チャンクの文字数に基づいて時間を配分
  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const totalMs = audioLength * 1000;
  
  // 開始と終了に少し余白を持たせる
  const startOffset = 200; // 200ms遅らせて開始
  const endOffset = 300;   // 300ms早く終了
  const availableMs = totalMs - startOffset - endOffset;
  
  let currentMs = startOffset;
  
  for (const chunk of chunks) {
    // 文字数に比例した表示時間を計算
    const chunkRatio = chunk.length / totalChars;
    const chunkDuration = availableMs * chunkRatio;
    
    captions.push({
      text: chunk,
      startMs: Math.round(currentMs),
      endMs: Math.round(currentMs + chunkDuration),
    });
    
    currentMs += chunkDuration;
  }
  
  return captions;
}
