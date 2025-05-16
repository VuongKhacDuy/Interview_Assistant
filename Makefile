# Variables
NODE = node
NPM = npm
APP_NAME = jd-assistant
NODE_VERSION = 20.6.1
NVM_DIR = $(HOME)/.nvm

# Default target
.PHONY: all
all: setup-env install

# Setup environment
.PHONY: setup-env
setup-env:
	@echo "Setting up Node.js environment..."
	@if ! command -v nvm >/dev/null 2>&1; then \
		curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash; \
		export NVM_DIR="$(HOME)/.nvm"; \
		[ -s "$(NVM_DIR)/nvm.sh" ] && \. "$(NVM_DIR)/nvm.sh"; \
	fi
	@export NVM_DIR="$(HOME)/.nvm"; \
	[ -s "$(NVM_DIR)/nvm.sh" ] && \. "$(NVM_DIR)/nvm.sh"; \
	nvm install $(NODE_VERSION); \
	nvm use $(NODE_VERSION)

# Install all dependencies
.PHONY: install
install: setup-env
	$(NPM) install
	$(NPM) install @huggingface/transformers
	$(NPM) install marked
	$(NPM) install express
	$(NPM) install cors
	$(NPM) install dotenv
	$(NPM) install body-parser
	$(NPM) install --save-dev nodemon

# Run in development mode
.PHONY: dev
dev:
	$(NPM) run dev

# Run in production mode
.PHONY: start
run:
	$(NPM) start

# Build for both Mac and Windows
.PHONY: build
build:
	$(NPM) run build

# Build for Windows only
.PHONY: build-win
build-win:
	$(NPM) run build:win

# Build for Mac only
.PHONY: build-mac
build-mac:
	$(NPM) run build:mac

# Clean up
.PHONY: clean
clean:
	rm -rf node_modules
	rm -rf dist

# Help target
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make install    - Install dependencies"
	@echo "  make dev       - Run in development mode"
	@echo "  make start     - Run in production mode"
	@echo "  make build     - Build for both Mac and Windows"
	@echo "  make build-win - Build for Windows only"
	@echo "  make build-mac - Build for Mac only"
	@echo "  make clean     - Clean up node_modules and dist"