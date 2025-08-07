# Changelog

All notable changes to Neural Translator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-31

### 🎉 Initial Release

#### ✨ Features
- **超高速翻訳エンジン** - 1.0秒で翻訳完了（Aya 23 8B使用時）
- **3つの翻訳特化モデル** - 用途に応じて選択可能
  - Aya 23 8B: 最速翻訳（1.0秒）
  - Qwen 2.5 3B: 軽量高速（1.7秒）
  - Llama 3.1 8B: 高品質翻訳（6.2秒）
- **リアルタイムパフォーマンスモニター** - CPU/メモリ/GPU使用状況を可視化
- **AI文章改善機能** - より自然な文章に自動変換
- **ドラッグ&ドロップ対応** - テキストファイルを直接翻訳
- **多言語サポート** - 7ヶ国語対応（日本語、英語、中国語、韓国語、スペイン語、フランス語、ドイツ語）
- **ショートカットキー** - ⌘+C+C でクイック起動
- **翻訳履歴管理** - 過去の翻訳を自動保存

#### 🚀 Performance
- **GPTranslateより2-5倍高速** - 実測値に基づく性能比較
- **完全ローカル処理** - インターネット不要、プライバシー完全保護
- **M4 Mac最適化** - Apple Neural Engine (ANE) と Metal GPU を最大活用
- **低メモリフットプリント** - アイドル時150-200MB

#### 🛠️ Technical
- **フレームワーク**: Tauri 2.3 + React 18 + TypeScript
- **AI推論**: Ollama + llama.cpp (Metal GPU対応)
- **ビルドツール**: Vite + pnpm
- **システム情報**: sysinfo crateによるメトリクス収集

### 📊 Benchmarks
テスト環境: M4 Mac (16GB RAM)
テストデータ: 100-200文字の一般的な文章

| モデル | 平均速度 | 標準偏差 | 最小 | 最大 |
|--------|----------|----------|------|------|
| Aya 23 8B | 1048ms | ±121ms | 901ms | 1295ms |
| Qwen 2.5 3B | 1763ms | ±147ms | 1542ms | 2051ms |
| Llama 3.1 8B | 6283ms | ±392ms | 5673ms | 7124ms |

### 🐛 Known Issues
- DOCX/PDFファイルの処理は開発中
- Windows/Linux版は未対応（将来のリリースで対応予定）

---

## [Unreleased]

### 📋 Planned Features
- **新Readdy UIとの統合** - モダンなUIへの移行
- **Windows/Linux対応** - クロスプラットフォーム展開
- **DOCX/PDF完全対応** - ドキュメントファイルの直接翻訳
- **バッチ翻訳** - 複数ファイルの一括処理
- **カスタムモデル対応** - ユーザー独自のモデル追加機能
- **クラウド同期** - 設定と履歴のクラウドバックアップ

---

## Development History

### 2024-12-31
- Ollama統合実装完了
- 3モデルのベンチマーク測定実施
- パフォーマンスモニター機能追加
- 設定画面のモデル選択UI実装

### 2024-12-30
- Ollama連携の基盤構築
- 翻訳特化モデルの選定と導入
- M4 Mac最適化の実装

### 2024-12-29
- プロジェクト初期化
- Tauri + React環境構築
- 基本UI設計

---

[1.0.0]: https://github.com/agiletec/neural-translator/releases/tag/v1.0.0