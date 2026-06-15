package diff

import (
	"embed"
	"fmt"
	"html"
	"html/template"
	"io"
	"path/filepath"
	"strings"
)

//go:embed templates/*.tmpl
var templateFS embed.FS

var diffFuncs = template.FuncMap{
	"safe": func(s string) template.HTML {
		return template.HTML(highlightContent(s))
	},
	"csvCellClass": func(cellType CsvDiffCellType) string {
		switch cellType {
		case CsvCellChanged:
			return "modified"
		case CsvCellAdd:
			return "added"
		case CsvCellDel:
			return "removed"
		default:
			return ""
		}
	},
}

func highlightContent(line string) string {
	if len(line) == 0 {
		return ""
	}
	prefix := line[0]
	content := line[1:]

	escaped := html.EscapeString(content)

	if prefix == '+' {
		return `<span class="added-code">` + escaped + `</span>`
	}
	if prefix == '-' {
		return `<span class="removed-code">` + escaped + `</span>`
	}
	return escaped
}

func renderFileDiff(leftPath, rightPath string) (string, error) {
	diffFile, err := CompareSingleFiles(leftPath, rightPath)
	if err != nil {
		return "", err
	}
	if diffFile == nil {
		return "<div class=\"empty-diff\">Files are identical</div>", nil
	}

	shortLeft := filepath.Base(leftPath)
	shortRight := filepath.Base(rightPath)
	if leftPath == "" {
		shortLeft = ""
	}
	if rightPath == "" {
		shortRight = ""
	}

	tmpl := template.New("diff_unified.tmpl").Funcs(diffFuncs)
	tmpl, err = tmpl.ParseFS(templateFS, "templates/diff_unified.tmpl")
	if err != nil {
		return "", fmt.Errorf("parse template: %w", err)
	}

	data := struct {
		OldName string
		NewName string
		Lines   []RawDiffLine
	}{
		OldName: shortLeft,
		NewName: shortRight,
		Lines:   diffFile.Lines,
	}

	var buf strings.Builder
	err = tmpl.ExecuteTemplate(&buf, "diff_unified", data)
	if err != nil {
		return "", fmt.Errorf("execute template: %w", err)
	}

	return buf.String(), nil
}

func renderCsvDiff(leftPath, rightPath string) (string, error) {
	table, err := computeCsvDiff(leftPath, rightPath)
	if err != nil {
		return "", err
	}

	shortLeft := filepath.Base(leftPath)
	shortRight := filepath.Base(rightPath)

	tmpl := template.New("csv_diff.tmpl").Funcs(diffFuncs)
	tmpl, err = tmpl.ParseFS(templateFS, "templates/csv_diff.tmpl")
	if err != nil {
		return "", fmt.Errorf("parse csv template: %w", err)
	}

	data := struct {
		LeftPath  string
		RightPath string
		Table     *CsvDiffTable
	}{
		LeftPath:  shortLeft,
		RightPath: shortRight,
		Table:     table,
	}

	var buf strings.Builder
	err = tmpl.ExecuteTemplate(&buf, "csv_diff", data)
	if err != nil {
		return "", fmt.Errorf("execute csv template: %w", err)
	}

	return buf.String(), nil
}

func RenderDiffToHTML(leftPath, rightPath string, isCsv bool, w io.Writer) error {
	if isCsv {
		html, err := renderCsvDiff(leftPath, rightPath)
		if err != nil {
			return err
		}
		_, err = io.WriteString(w, html)
		return err
	}

	html, err := renderFileDiff(leftPath, rightPath)
	if err != nil {
		return err
	}
	_, err = io.WriteString(w, html)
	return err
}
