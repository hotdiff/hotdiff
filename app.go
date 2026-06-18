package main

import (
	"bytes"
	"context"
	"hotdiff/diff"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) SelectDirectory() string {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Directory",
	})
	if err != nil {
		return ""
	}
	return dir
}

func (a *App) SelectFile() string {
	file, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select File",
	})
	if err != nil {
		return ""
	}
	return file
}

func (a *App) StartCompare(leftDir, rightDir string) {
	ch := make(chan diff.CompareProgress, 100)
	go func() {
		diff.CompareDirs(leftDir, rightDir, ch)
		close(ch)
	}()
	go func() {
		for p := range ch {
			runtime.EventsEmit(a.ctx, "compare-progress", p)
		}
	}()
}

func (a *App) GetDiffDetail(leftPath, rightPath string) *DiffDetailResult {
	return buildDiffDetail(leftPath, rightPath)
}

type DiffDetailResult struct {
	Original string `json:"original"`
	Modified string `json:"modified"`
	Language string `json:"language"`
	OldName  string `json:"oldName"`
	NewName  string `json:"newName"`
	Error    string `json:"error,omitempty"`
}

func buildDiffDetail(leftPath, rightPath string) *DiffDetailResult {
	result := &DiffDetailResult{
		OldName: leftPath,
		NewName: rightPath,
	}

	lang := ""
	if leftPath != "" {
		lang = diff.DetectLanguage(leftPath)
		result.OldName = leftPath
	} else {
		result.OldName = "[deleted]"
	}
	if rightPath != "" {
		if lang == "" {
			lang = diff.DetectLanguage(rightPath)
		}
		result.NewName = rightPath
	} else {
		result.NewName = "[new]"
	}
	result.Language = lang

	if leftPath != "" {
		data, err := os.ReadFile(leftPath)
		if err != nil {
			result.Error = "Failed to read left file: " + err.Error()
			return result
		}
		if bytes.Contains(data, []byte{0}) {
			result.Error = "Binary file not supported"
			return result
		}
		result.Original = string(data)
	}
	if rightPath != "" {
		data, err := os.ReadFile(rightPath)
		if err != nil {
			result.Error = "Failed to read right file: " + err.Error()
			return result
		}
		if bytes.Contains(data, []byte{0}) {
			result.Error = "Binary file not supported"
			return result
		}
		result.Modified = string(data)
	}

	return result
}
