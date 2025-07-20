// src/components/videos/font-config.ts
// 日本語対応フォントの設定

import { loadFont as loadBarlowCondensed } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadNotoSansJP } from "@remotion/google-fonts/NotoSansJP";

// 日本語対応フォントを読み込む
const notoSansJP = loadNotoSansJP();
const barlowCondensed = loadBarlowCondensed();

// 日本語が含まれているかチェック
export function hasJapanese(text: string): boolean {
  return /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
}

// テキストに応じて適切なフォントを選択
export function getFontFamily(text: string): string {
  if (hasJapanese(text)) {
    return notoSansJP.fontFamily; // "Noto Sans JP"
  }
  return barlowCondensed.fontFamily; // "Barlow Condensed"
}
