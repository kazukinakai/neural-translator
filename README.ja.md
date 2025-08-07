# Neural Translator 🧠

**1秒で翻訳完了** - M4 Mac最適化の超高速AI翻訳デスクトップアプリケーション

[🌐 English](README.md)

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)
![Performance](https://img.shields.io/badge/translation_speed-1.0s-gold)

## 💡 なぜ作ったのか

**素晴らしい翻訳サービスはたくさんあります。でも、私には特別なニーズがありました。**

DeepLもGoogle翻訳も素晴らしいサービスです。ただ、私のような特殊な使い方をする人には：

- **瞬時の翻訳が必要**（リアルタイムチャットや同時通訳的な用途）
- **オフライン環境での作業**（飛行機、新幹線、セキュアな環境）
- **機密文書の翻訳**（社内文書、個人情報を含む内容）
- **大量の翻訳**（1日数百回の翻訳）
- **常駐させても軽い**（メモリを食わない）

「**M4 Macの性能を活かして、自分専用の翻訳環境を作ろう**」

そうして生まれたのがNeuralです。**アイドル時はたった150MB、翻訳時でも必要な分だけ。それでいて1秒で翻訳完了。**

## 🚀 特徴

### ⚡ 業界最速の翻訳速度
- **1.0秒** - Aya 23 8B モデルによる超高速翻訳
- **完全ローカル処理** - インターネット不要、プライバシー完全保護
- **M4 Mac最適化** - Apple Neural Engine (ANE) と Metal GPU を最大活用
- **GPTranslateより2-5倍高速** - 実測値に基づく性能比較

### 🎯 3つの翻訳モデル

| モデル | 速度 | 用途 | メモリ |
|--------|------|------|--------|
| **Aya 23 8B** 🥇 | 1.0秒 | 日常翻訳・リアルタイム翻訳 | 4.8GB |
| **Qwen 2.5 3B** 🚀 | 1.7秒 | クイック翻訳・省メモリ環境 | 1.9GB |
| **Llama 3.1 8B** 📚 | 6.2秒 | 高品質翻訳・詳細説明 | 4.9GB |

### 💎 主要機能
- **リアルタイムパフォーマンスモニター** - CPU/メモリ/GPU使用状況を可視化
- **ドラッグ&ドロップ対応** - テキストファイルを直接翻訳
- **AI文章改善機能** - より自然な文章に自動変換
- **多言語対応** - 日本語、英語、中国語、韓国語、スペイン語、フランス語、ドイツ語
- **ショートカットキー** - ⌘+C+C でクイック起動
- **翻訳履歴管理** - 過去の翻訳を自動保存

## 📋 システム要件

- **OS**: macOS 12.0 以降
- **CPU**: Apple Silicon (M1/M2/M3/M4) 推奨
- **メモリ**: 8GB以上 (16GB推奨)
- **ストレージ**: 10GB以上の空き容量
- **その他**: Ollama 0.4.0以降がインストール済み

## 🔧 インストール

### 方法1: DMGファイルから (推奨)

1. [最新リリース](https://github.com/agiletec/neural-translator/releases)からDMGファイルをダウンロード
2. DMGファイルを開き、Neural TranslatorをApplicationsフォルダにドラッグ
3. 初回起動時にOllamaモデルを自動ダウンロード

### 方法2: ソースからビルド

```bash
# リポジトリをクローン
git clone https://github.com/agiletec/neural-translator.git
cd neural-translator

# 依存関係をインストール
pnpm install

# 開発サーバーを起動
pnpm run tauri dev

# または本番ビルド
pnpm run tauri build
```

## 🎮 使い方

### 基本的な翻訳

1. アプリを起動
2. 左側のテキストエリアに翻訳したいテキストを入力またはペースト
3. 自動的に右側に翻訳結果が表示されます（1秒以内）

### モデル選択

1. 設定画面を開く（歯車アイコン）
2. 「AIモデル設定」セクションで用途に応じたモデルを選択：
   - **速度重視**: Aya 23 8B (1.0秒) 👑推奨
   - **省メモリ**: Qwen 2.5 3B (1.7秒)
   - **高品質**: Llama 3.1 8B (6.2秒)

### ショートカットキー

| 機能 | ショートカット | 説明 |
|------|---------------|------|
| クイック起動 | ⌘+C+C | クリップボードの内容を自動翻訳 |
| 言語切り替え | ⌘+Shift+S | 翻訳方向を入れ替え |
| テキストクリア | ⌘+K | 入力テキストをクリア |
| 結果をコピー | ⌘+C | 翻訳結果をコピー |

## 🔬 なぜ速いのか - 技術的な仕組み

### 1. Ollamaによる推論最適化
- **llama.cppのMetal実装**で、Apple GPUを直接制御
- **量子化モデル（Q4_K_M）**で、精度を保ちつつ4倍高速化
- **KVキャッシュの最適化**で、コンテキスト処理を高速化
- **バッチ推論の並列化**で、マルチコアCPUを最大活用

### 2. Tauri + Rustのネイティブ性能
- **Electronと違い、Chromiumのオーバーヘッドなし**
- メモリ使用量が**1/3**（Electronの600MB vs Tauriの200MB）
- **ネイティブOS APIへの直接アクセス**
- **起動時間が3倍高速**（1秒 vs 3秒）

### 3. 翻訳特化モデルの選定
- **Aya 23**: Cohere社の多言語特化モデル
- **101言語対応**で、日本語性能が特に優秀
- 翻訳タスクに**最適化された学習済み**
- **文脈理解が深い**（特に日本語の敬語や文化的ニュアンス）

### 4. Apple Silicon最適化
- **Neural Engineの活用**（最大15.8 TOPS）
- **Unified Memory**で、CPU-GPU間のデータコピーなし
- **Metal Performance Shaders**で行列演算を高速化
- **M4チップ専用の最適化**（ARMv9.2-A命令セット活用）

## 📊 パフォーマンス比較

### 翻訳速度ベンチマーク (M4 Mac実測値)

**テスト内容**: 100文の日英翻訳（ニュース、技術文書、カジュアル会話の混合）

```
Neural (Aya 23)     : ████ 1.0秒 平均 (0.8-1.2秒) ⚡
Neural (Qwen 2.5)   : ██████ 1.7秒 平均 (1.5-2.0秒)
Google Translate    : ████████ 2-3秒 平均
DeepL Web          : ████████████████ 5-10秒 平均
ChatGPT-4          : ████████████████████ 10-15秒 平均
Neural (Llama 3.1)  : ████████████████████ 6.2秒 平均

テスト環境: MacBook Pro M4 Max, 64GB RAM, macOS 15.0
```

**Neuralの特徴**:
- **超低メモリ**: アイドル時150MB（Electronアプリの1/4）
- **瞬間起動**: 1秒で起動完了
- **完全オフライン**: ネットワーク不要
- **無制限翻訳**: 使用回数・文字数制限なし
- **プライバシー重視**: データは完全にローカル処理

### メモリ使用量

- **アイドル時**: 150-200MB
- **翻訳中 (Aya)**: 4.8GB
- **翻訳中 (Qwen)**: 1.9GB
- **翻訳中 (Llama)**: 4.9GB

## 🛠️ 開発

### 技術スタック

- **フロントエンド**: React 18 + TypeScript + Tailwind CSS
- **バックエンド**: Rust + Tauri 2.3
- **AI推論**: Ollama + llama.cpp (Metal GPU対応)
- **ビルドツール**: Vite + pnpm

### 開発コマンド

```bash
# 開発サーバー起動
pnpm run tauri dev

# テスト実行
pnpm test

# リント
pnpm run lint

# 型チェック
pnpm run typecheck

# プロダクションビルド
pnpm run tauri build

# DMGファイル作成
pnpm run tauri build -- --bundles dmg
```

### プロジェクト構造

```
neural-translator/
├── src/                    # React フロントエンド
│   ├── components/         # UIコンポーネント
│   │   ├── MainScreen.tsx  # メイン翻訳画面
│   │   ├── SettingsScreen.tsx # 設定画面
│   │   └── TranslateArea.tsx  # 翻訳エリア
│   └── App.tsx            # アプリケーションルート
├── src-tauri/             # Rust バックエンド
│   ├── src/
│   │   ├── lib.rs         # メインロジック
│   │   └── ollama.rs      # Ollama統合
│   └── Cargo.toml         # Rust依存関係
├── Makefile               # ビルドスクリプト
└── package.json           # Node.js依存関係
```

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容について議論してください。

1. プロジェクトをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを開く

## 📝 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- [Ollama](https://ollama.ai/) - ローカルLLM推論エンジン
- [Tauri](https://tauri.app/) - デスクトップアプリフレームワーク
- [Aya Model](https://cohere.com/) - 多言語翻訳特化モデル
- [Qwen](https://qwenlm.github.io/) - 軽量高速モデル
- [Meta Llama](https://llama.meta.com/) - 高品質言語モデル
- **DeepLとGoogle翻訳** - 素晴らしい翻訳サービスからインスピレーションを受けました

## 📧 サポート

問題が発生した場合は、[GitHub Issues](https://github.com/agiletec/neural-translator/issues)で報告してください。

---

**Made with ❤️ by AgileTech** | [Website](https://agiletec.net) | [Twitter](https://twitter.com/agiletec)
