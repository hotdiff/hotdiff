package main

import (
	"bytes"
	"context"
	"hotdiff/diff"
	"os"
	"path/filepath"

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
		Title: "选择目录",
	})
	if err != nil {
		return ""
	}
	return dir
}

func (a *App) SelectFile() string {
	file, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择文件",
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
	Original string           `json:"original"`
	Modified string           `json:"modified"`
	Language string           `json:"language"`
	IsCsv    bool             `json:"isCsv"`
	CsvTable *diff.CsvDiffTable `json:"csvTable,omitempty"`
	OldName  string           `json:"oldName"`
	NewName  string           `json:"newName"`
	Error    string           `json:"error,omitempty"`
}

func buildDiffDetail(leftPath, rightPath string) *DiffDetailResult {
	result := &DiffDetailResult{
		OldName: leftPath,
		NewName: rightPath,
	}

	if diff.IsLikelyCsv(leftPath) || diff.IsLikelyCsv(rightPath) {
		result.IsCsv = true
		result.OldName = filepath.Base(leftPath)
		result.NewName = filepath.Base(rightPath)
		table, err := diff.ComputeCsvDiff(leftPath, rightPath)
		if err != nil {
			result.Error = err.Error()
			return result
		}
		result.CsvTable = table
		return result
	}

	lang := ""
	if leftPath != "" {
		lang = diff.DetectLanguage(leftPath)
		result.OldName = filepath.Base(leftPath)
	} else {
		result.OldName = "[deleted]"
	}
	if rightPath != "" {
		if lang == "" {
			lang = diff.DetectLanguage(rightPath)
		}
		result.NewName = filepath.Base(rightPath)
	} else {
		result.NewName = "[new]"
	}
	result.Language = lang

	if leftPath != "" {
		data, err := os.ReadFile(leftPath)
		if err != nil {
			result.Error = "读取左侧文件失败: " + err.Error()
			return result
		}
		if bytes.Contains(data, []byte{0}) {
			result.Error = "不支持二进制文件比较"
			return result
		}
		result.Original = string(data)
	}
	if rightPath != "" {
		data, err := os.ReadFile(rightPath)
		if err != nil {
			result.Error = "读取右侧文件失败: " + err.Error()
			return result
		}
		if bytes.Contains(data, []byte{0}) {
			result.Error = "不支持二进制文件比较"
			return result
		}
		result.Modified = string(data)
	}

	return result
}
