package main

import (
	"bytes"
	"context"
	"encoding/base64"
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
	IsImage  bool   `json:"isImage"`
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
	}
	if rightPath != "" {
		if lang == "" {
			lang = diff.DetectLanguage(rightPath)
		}
		result.NewName = rightPath
	}
	result.Language = lang

	isLeftImg := leftPath != "" && diff.IsImageFile(leftPath)
	isRightImg := rightPath != "" && diff.IsImageFile(rightPath)

	if isLeftImg || isRightImg {
		result.IsImage = true
		result.Language = "image"
		if leftPath != "" {
			data, err := os.ReadFile(leftPath)
			if err != nil {
				result.Error = "Failed to read left image: " + err.Error()
				return result
			}
			mime := diff.GetImageMime(leftPath)
			result.Original = "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(data)
		}
		if rightPath != "" {
			data, err := os.ReadFile(rightPath)
			if err != nil {
				result.Error = "Failed to read right image: " + err.Error()
				return result
			}
			mime := diff.GetImageMime(rightPath)
			result.Modified = "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(data)
		}
		return result
	}

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
