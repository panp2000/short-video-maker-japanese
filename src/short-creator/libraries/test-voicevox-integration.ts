// src/short-creator/libraries/test-voicevox-integration.ts
// VOICEVOXとの統合テスト用ファイル

import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';

export async function testVoicevoxIntegration() {
  const voicevoxUrl = process.env.VOICEVOX_URL || 'http://localhost:50021';
  
  console.log('Testing VOICEVOX integration...');
  console.log('VOICEVOX URL:', voicevoxUrl);
  
  try {
    // 1. VOICEVOXが起動しているか確認
    const speakers = await axios.get(`${voicevoxUrl}/speakers`);
    console.log('Available speakers:', speakers.data.length);
    
    // 2. 簡単な音声生成テスト
    const text = 'こんにちは、VOICEVOXテストです。';
    const speaker = 0; // 四国めたん
    
    // 音声クエリの生成
    const queryResponse = await axios.post(
      `${voicevoxUrl}/audio_query`,
      null,
      {
        params: { text, speaker }
      }
    );
    
    // 音声合成
    const synthesisResponse = await axios.post(
      `${voicevoxUrl}/synthesis`,
      queryResponse.data,
      {
        params: { speaker },
        responseType: 'arraybuffer'
      }
    );
    
    console.log('Audio generated successfully!');
    console.log('Audio size:', synthesisResponse.data.byteLength, 'bytes');
    
    // テスト用にファイルに保存（オプション）
    const testPath = path.join(__dirname, '../../../voicevox-test.wav');
    await fs.writeFile(testPath, Buffer.from(synthesisResponse.data));
    console.log('Test audio saved to:', testPath);
    
    return true;
  } catch (error) {
    console.error('VOICEVOX integration test failed:', error);
    return false;
  }
}

// このファイルを直接実行した場合
if (require.main === module) {
  testVoicevoxIntegration();
}
