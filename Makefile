# Variables
NODE = node
NPM = npm
APP_NAME = jd-assistant

# Default target
.PHONY: all
all: install

# Install dependencies
.PHONY: install
install:
	$(NPM) install

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