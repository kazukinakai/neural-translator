#!/bin/bash

echo "📦 NeuraL Translator をビルド中..."

# リリースビルドを作成
npm run tauri build

# アプリケーションフォルダにコピー
echo "📁 アプリケーションフォルダにインストール中..."
cp -r src-tauri/target/release/bundle/macos/neural-translator.app /Applications/

echo "✅ インストール完了！"
echo "🎉 アプリケーションフォルダから「NeuraL Translator」を起動できます"