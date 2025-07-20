// 日本語対応のための最小限の変更案
// このファイルは、実装時の参考用です

// 1. config.tsに追加する環境変数
export const TTS_ENGINE = process.env.TTS_ENGINE || 'kokoro'; // 'kokoro' | 'voicevox'
export const VOICEVOX_URL = process.env.VOICEVOX_URL || 'http://localhost:50021';

// 2. Kokoro.tsに追加するVOICEVOX対応
// 既存のgenerate()メソッドを拡張して、VOICEVOXにも対応させる

// 3. docker-compose.ymlの修正
// VOICEVOXサービスを追加

// 4. テスト手順
// - docker-compose up でVOICEVOXとshort-video-makerを起動
// - curlでAPIをテスト
// - 日本語テキストで動画生成

// 注意点：
// - 最初は既存の英語音声のまま、日本語テキストが処理できることを確認
// - 次にVOICEVOXを使って日本語音声を生成
// - 最後にWhisperの日本語対応を確認
