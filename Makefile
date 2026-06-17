APP_NAME := HotDiff
VERSION ?= 0.1.0
OS := $(shell uname -s | tr '[:upper:]' '[:lower:]')
ARCH := $(shell uname -m)
DMG_NAME := $(APP_NAME)-$(VERSION).$(OS).$(ARCH).dmg
APP_BUNDLE := build/bin/Hot Diff.app
STAGING := dist/staging
DMG_PATH := dist/$(DMG_NAME)

.PHONY: release clean

release:
	@echo "Building $(APP_NAME) v$(VERSION)..."
	wails build
	@echo "Packaging DMG..."
	rm -rf $(STAGING)
	mkdir -p $(STAGING)
	cp -R "$(APP_BUNDLE)" $(STAGING)/
	ln -s /Applications $(STAGING)/Applications
	hdiutil create -volname "$(APP_NAME)" -srcfolder $(STAGING) -ov -format UDZO "$(DMG_PATH)"
	rm -rf $(STAGING)
	@echo "Done: $(DMG_PATH)"

clean:
	rm -rf dist
