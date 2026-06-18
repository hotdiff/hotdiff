APP_NAME := HotDiff
VERSION ?= 0.2.0
ARCH := $(shell uname -m)
OS := $(shell uname -s)
DIST := dist

MAC_DMG := $(DIST)/$(APP_NAME)-$(VERSION).darwin.$(ARCH).dmg
WIN_EXE := $(DIST)/$(APP_NAME)-$(VERSION).windows.amd64.exe
STAGING := $(DIST)/staging

.PHONY: release release-mac release-win clean

ifeq ($(OS),Darwin)
release: release-mac
else
release: release-win
endif

release-mac:
	@echo "Building $(APP_NAME) v$(VERSION) for macOS/$(ARCH)..."
	wails build -platform darwin/$(ARCH)
	@echo "Packaging DMG..."
	rm -rf $(STAGING)
	mkdir -p $(STAGING)
	cp -R "build/bin/Hot Diff.app" $(STAGING)/
	ln -s /Applications $(STAGING)/Applications
	mkdir -p $(DIST)
	hdiutil create -volname "$(APP_NAME)" -srcfolder $(STAGING) -ov -format UDZO "$(MAC_DMG)"
	rm -rf $(STAGING)
	@echo "Done: $(MAC_DMG)"

release-win:
	@echo "Building $(APP_NAME) v$(VERSION) for Windows/amd64..."
	wails build -platform windows/amd64 -nsis
	@echo "Packaging Windows installer..."
	mkdir -p $(DIST)
	@exe=$$(ls -t build/bin/*-installer.exe 2>/dev/null | head -1); \
	[ -z "$$exe" ] && exe=$$(ls -t build/bin/*-amd64.exe 2>/dev/null | head -1); \
	if [ -n "$$exe" ]; then \
		cp "$$exe" "$(WIN_EXE)" && echo "Done: $(WIN_EXE)"; \
	else \
		echo "Error: No Windows executable found in build/bin/"; exit 1; \
	fi

clean:
	rm -rf $(DIST)
