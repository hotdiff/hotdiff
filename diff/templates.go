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
		return template.HTML(html.EscapeString(s))
	},
	"safeLeft": func(s string) template.HTML {
		return template.HTML(`<span class="removed-code">` + html.EscapeString(s) + `</span>`)
	},
	"safeRight": func(s string) template.HTML {
		return template.HTML(`<span class="added-code">` + html.EscapeString(s) + `</span>`)
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

func unifiedToSplit(lines []RawDiffLine) []SplitLine {
	var split []SplitLine

	for i := 0; i < len(lines); i++ {
		line := lines[i]

		if line.Type == '@' {
			split = append(split, SplitLine{
				Type:        SplitSection,
				SectionText: line.Content,
			})
			continue
		}

		if line.Type == ' ' {
			split = append(split, SplitLine{
				LeftNum:   line.LeftNum,
				RightNum:  line.RightNum,
				LeftLine:  line.Content[1:],
				RightLine: line.Content[1:],
				Type:      SplitContext,
			})
			continue
		}

		if line.Type == '-' {
			var delLines []RawDiffLine
			delLines = append(delLines, line)
			i++
			for i < len(lines) && lines[i].Type == '-' {
				delLines = append(delLines, lines[i])
				i++
			}

			var addLines []RawDiffLine
			for i < len(lines) && lines[i].Type == '+' {
				addLines = append(addLines, lines[i])
				i++
			}
			i--

			pairCount := len(delLines)
			if len(addLines) > pairCount {
				pairCount = len(addLines)
			}

			for j := 0; j < pairCount; j++ {
				sl := SplitLine{}
				if j < len(delLines) {
					sl.LeftNum = delLines[j].LeftNum
					sl.LeftLine = delLines[j].Content[1:]
				}
				if j < len(addLines) {
					sl.RightNum = addLines[j].RightNum
					sl.RightLine = addLines[j].Content[1:]
				}
				if j >= len(delLines) {
					sl.Type = SplitAdd
				} else if j >= len(addLines) {
					sl.Type = SplitDel
				} else {
					sl.Type = SplitChanged
				}
				split = append(split, sl)
			}
			continue
		}

		if line.Type == '+' {
			split = append(split, SplitLine{
				RightNum:  line.RightNum,
				RightLine: line.Content[1:],
				Type:      SplitAdd,
			})
		}
	}

	return split
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

	splitLines := unifiedToSplit(diffFile.Lines)

	var addCount, delCount int
	for _, sl := range splitLines {
		switch sl.Type {
		case SplitAdd:
			addCount++
		case SplitDel:
			delCount++
		case SplitChanged:
			addCount++
			delCount++
		}
	}

	tmpl := template.New("diff_split.tmpl").Funcs(diffFuncs)
	tmpl, err = tmpl.ParseFS(templateFS, "templates/diff_split.tmpl")
	if err != nil {
		return "", fmt.Errorf("parse template: %w", err)
	}

	data := struct {
		OldName   string
		NewName   string
		Lines     []SplitLine
		AddCount  int
		DelCount  int
	}{
		OldName:  shortLeft,
		NewName:  shortRight,
		Lines:    splitLines,
		AddCount: addCount,
		DelCount: delCount,
	}

	var buf strings.Builder
	err = tmpl.ExecuteTemplate(&buf, "diff_split", data)
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
