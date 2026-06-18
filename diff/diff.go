package diff

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
)

func CompareDirs(leftDir, rightDir string, progressCh chan<- CompareProgress) {
	leftFiles := make(map[string]string)
	rightFiles := make(map[string]string)

	leftIsFile := false
	if fi, err := os.Stat(leftDir); err == nil && !fi.IsDir() {
		leftIsFile = true
	}
	rightIsFile := false
	if fi, err := os.Stat(rightDir); err == nil && !fi.IsDir() {
		rightIsFile = true
	}

	if leftIsFile && rightIsFile {
		commonName := filepath.Base(leftDir)
		leftFiles[commonName] = leftDir
		rightFiles[commonName] = rightDir
	} else {
		err := walkDir(leftDir, leftDir, leftFiles)
		if err != nil {
			progressCh <- CompareProgress{Error: fmt.Sprintf("walk left dir: %v", err)}
			return
		}
		err = walkDir(rightDir, rightDir, rightFiles)
		if err != nil {
			progressCh <- CompareProgress{Error: fmt.Sprintf("walk right dir: %v", err)}
			return
		}
	}

	allPaths := make(map[string]bool)
	for p := range leftFiles {
		allPaths[p] = true
	}
	for p := range rightFiles {
		allPaths[p] = true
	}

	var sortedPaths []string
	for p := range allPaths {
		sortedPaths = append(sortedPaths, p)
	}
	sort.Strings(sortedPaths)

	total := len(sortedPaths)
	result := CompareSummary{
		LeftDir:  leftDir,
		RightDir: rightDir,
	}

	var fileResults []FileResult

	for i, relPath := range sortedPaths {
		leftPath := leftFiles[relPath]
		rightPath := rightFiles[relPath]

		progressCh <- CompareProgress{
			Total:    total,
			Current:  i + 1,
			FileName: relPath,
		}

		fr := FileResult{
			RelativePath: relPath,
			Name:         filepath.Base(relPath),
			LeftPath:     leftPath,
			RightPath:    rightPath,
		}

		if rightPath != "" {
			fr.RightName = filepath.Base(rightPath)
		}

		switch {
		case leftPath == "":
			fr.Status = StatusRightOnly
			fi, err := os.Stat(rightPath)
			if err == nil {
				fr.IsDir = fi.IsDir()
				fr.Size = fi.Size()
			}
			result.RightOnlyCount++

		case rightPath == "":
			fr.Status = StatusLeftOnly
			fi, err := os.Stat(leftPath)
			if err == nil {
				fr.IsDir = fi.IsDir()
				fr.Size = fi.Size()
			}
			result.LeftOnlyCount++

		default:
			fiL, errL := os.Stat(leftPath)
			fiR, errR := os.Stat(rightPath)
			if errL == nil && errR == nil && fiL.IsDir() && fiR.IsDir() {
				fr.IsDir = true
				fr.Status = StatusSame
				result.SameCount++
			} else {
				same, similar, err := gitDiffFiles(leftPath, rightPath)
				if err != nil {
					fr.ErrMsg = err.Error()
					fr.Status = StatusDifferent
					result.DifferentCount++
				} else if same {
					fr.Status = StatusSame
					result.SameCount++
				} else if similar {
					fr.Status = StatusSimilar
					result.SimilarCount++
				} else {
					fr.Status = StatusDifferent
					result.DifferentCount++
				}
			}
		}

		fileResults = append(fileResults, fr)
		result.TotalFiles++
	}

	result.Files = fileResults
	progressCh <- CompareProgress{
		Completed: true,
		Result:    &result,
	}
}

func walkDir(root string, base string, files map[string]string) error {
	baseIsFile := false
	fi, err := os.Stat(root)
	if err == nil && !fi.IsDir() {
		baseIsFile = true
		base = filepath.Dir(root)
	}

	err = filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(base, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}
		if strings.HasPrefix(rel, ".") {
			return nil
		}
		if baseIsFile && d.IsDir() {
			return nil
		}
		files[rel] = path
		return nil
	})
	return err
}

func gitDiffFiles(leftPath, rightPath string) (same bool, similar bool, err error) {
	cmd := exec.Command("git", "diff", "--no-index", "--diff-algorithm=minimal", leftPath, rightPath)
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out

	err = cmd.Run()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			if exitErr.ExitCode() == 1 {
				output := out.String()
				lines := strings.Split(output, "\n")
				totalLines := len(lines)
				contentLines := 0
				for _, line := range lines {
					if strings.HasPrefix(line, "+") || strings.HasPrefix(line, "-") {
						if !strings.HasPrefix(line, "+++") && !strings.HasPrefix(line, "---") {
							contentLines++
						}
					}
				}
				if totalLines > 0 {
					ratio := float64(contentLines) / float64(totalLines)
					if ratio < 0.15 {
						return false, true, nil
					}
				}
				return false, false, nil
			}
			return false, false, fmt.Errorf("git diff exit code %d: %s", exitErr.ExitCode(), out.String())
		}
		return false, false, err
	}
	return true, false, nil
}
