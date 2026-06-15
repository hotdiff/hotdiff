package main

import (
	"context"
	"hotdiff/diff"

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

func (a *App) SelectLeftFile() string {
	file, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择左侧文件",
	})
	if err != nil {
		return ""
	}
	return file
}

func (a *App) SelectRightFile() string {
	file, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择右侧文件",
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

func (a *App) GetDiffDetail(leftPath, rightPath string) map[string]interface{} {
	diffHTML, isCsv, err := diff.CompareFiles(leftPath, rightPath)
	result := map[string]interface{}{
		"html":  diffHTML,
		"isCsv": isCsv,
	}
	if err != nil {
		result["error"] = err.Error()
	}
	return result
}
