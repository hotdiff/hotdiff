# Hot Diff

A cross-platform file and directory comparison tool built with [Wails](https://wails.io), React, and Monaco Editor.

## Features

- **Directory Comparison** — compare two directories side by side and get a summary of identical, different, similar, and unique files
- **File Diff Viewer** — view side-by-side diffs with syntax highlighting powered by Monaco Editor
- **CSV Diff** — dedicated table view for comparing CSV files column by column
- **Modern UI** — clean Apple-inspired design with Ant Design components and dark theme
- **i18n Support** — English and Chinese (中文) with a language switcher
- **Tabbed Interface** — compare multiple file pairs simultaneously in separate tabs

## Tech Stack

| Layer     | Technology                           |
|-----------|--------------------------------------|
| Framework | [Wails v2](https://wails.io)         |
| Frontend  | React 18 + TypeScript + Vite         |
| UI        | Ant Design 5 (dark theme)            |
| Diff      | Monaco Editor (`@monaco-editor/react`) |
| i18n      | i18next + react-i18next              |
| Backend   | Go                                   |

## Prerequisites

- Go 1.23+
- Node.js 20+
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)

## Getting Started

### Live Development

```bash
wails dev
```

This starts a Vite dev server with hot reload for frontend changes and a Wails dev server for Go backend calls.

### Build

```bash
wails build
```

Produces a native application bundle in the `build/bin/` directory.

## Usage

1. Launch the app — the home screen shows two input fields
2. Click the folder or file icons on the right side of each input (or click the input itself) to select a left and right path
3. Press **Compare** to start the comparison
4. Browse results in a tree view with status indicators:
   - `=` Same — identical files
   - `≠` Different — files differ
   - `≈` Similar — files have minor differences
   - `L` Left Only — exists only on the left
   - `R` Right Only — exists only on the right
5. Click any file to open the diff viewer in a new tab
6. For CSV files, a column-aligned table diff is shown
7. Use the globe icon in the tab bar to switch between English and Chinese

## Project Structure

```
hotdiff/
├── app.go              # Application backend (file dialogs, comparison API)
├── main.go             # Entry point + window configuration
├── diff/               # Diff engine (Go)
│   ├── diff.go         # Directory/file comparison
│   ├── csvdiff.go      # CSV comparison logic
│   ├── language.go     # File extension → Monaco language mapping
│   └── types.go        # Shared types
├── frontend/           # React frontend
│   └── src/
│       ├── App.tsx     # Root component with tab management
│       ├── components/
│       │   ├── HomeView.tsx    # Path selection screen
│       │   ├── ResultView.tsx  # Comparison results list
│       │   └── DiffView.tsx    # Monaco diff viewer
│       ├── i18n/       # Translation files (en.json, zh.json)
│       └── models/     # TypeScript type definitions
└── wails.json          # Wails project configuration
```
