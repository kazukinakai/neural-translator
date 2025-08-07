# NeuraL Translator Makefile
# 統一コマンドシステム準拠

.PHONY: help dev build bundle clean install lint typecheck test

# デフォルトコマンド
.DEFAULT_GOAL := help

# 環境変数
PNPM := pnpm
TAURI := pnpm tauri

help: ## Show this help message
	@echo "NeuraL Translator - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	$(PNPM) install

dev: ## Start development server
	$(TAURI) dev

build: ## Build frontend for production
	$(PNPM) run build

bundle: ## Build Mac desktop app (.app and .dmg)
	$(TAURI) build

lint: ## Run ESLint
	$(PNPM) run lint

typecheck: ## Run TypeScript type checking
	$(PNPM) run typecheck

test: ## Run tests
	$(PNPM) test

clean: ## Clean build artifacts
	rm -rf dist/
	rm -rf src-tauri/target/
	rm -rf node_modules/

# Development workflow
dev-setup: install ## Setup development environment
	@echo "✅ Development environment ready"
	@echo "Run 'make dev' to start development server"

# Production workflow  
release: lint typecheck build bundle ## Full release workflow
	@echo "✅ Release build completed"
	@echo "📦 Check src-tauri/target/release/bundle/ for .app and .dmg files"

# Debug commands
debug-deps: ## Show dependency tree
	$(PNPM) list

debug-tauri: ## Show Tauri info
	$(TAURI) info

# Quick commands
quick-dev: ## Quick development start (skip checks)
	$(TAURI) dev

quick-build: ## Quick build (skip lint/typecheck)
	$(TAURI) build

# Test commands
test-watch: ## Run tests in watch mode
	$(PNPM) vitest

test-coverage: ## Run tests with coverage
	$(PNPM) test:coverage