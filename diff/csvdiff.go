package diff

import (
	"encoding/csv"
	"fmt"
	"os"
	"strings"
)

type CsvDiffCellType int

const (
	CsvCellUnchanged    CsvDiffCellType = iota + 1
	CsvCellChanged
	CsvCellAdd
	CsvCellDel
)

type CsvDiffCell struct {
	LeftValue  string
	RightValue string
	CellType   CsvDiffCellType
}

type CsvDiffRow struct {
	RowNum int
	Cells  []CsvDiffCell
}

type CsvDiffTable struct {
	Headers []CsvDiffCell
	Rows    []CsvDiffRow
}

func compareCsvFiles(leftPath, rightPath string) (same bool, err error) {
	if leftPath == "" || rightPath == "" {
		return false, nil
	}
	leftRows, err := readCsvFile(leftPath)
	if err != nil {
		return false, fmt.Errorf("read left csv: %w", err)
	}
	rightRows, err := readCsvFile(rightPath)
	if err != nil {
		return false, fmt.Errorf("read right csv: %w", err)
	}
	return csvRowsEqual(leftRows, rightRows), nil
}

func readCsvFile(path string) ([][]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true
	return reader.ReadAll()
}

func csvRowsEqual(a, b [][]string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if len(a[i]) != len(b[i]) {
			return false
		}
		for j := range a[i] {
			if strings.TrimSpace(a[i][j]) != strings.TrimSpace(b[i][j]) {
				return false
			}
		}
	}
	return true
}

func ComputeCsvDiff(leftPath, rightPath string) (*CsvDiffTable, error) {
	return computeCsvDiff(leftPath, rightPath)
}

func computeCsvDiff(leftPath, rightPath string) (*CsvDiffTable, error) {
	var leftRows, rightRows [][]string
	var err error

	if leftPath != "" {
		leftRows, err = readCsvFile(leftPath)
		if err != nil {
			return nil, fmt.Errorf("read left csv: %w", err)
		}
	}
	if rightPath != "" {
		rightRows, err = readCsvFile(rightPath)
		if err != nil {
			return nil, fmt.Errorf("read right csv: %w", err)
		}
	}

	table := &CsvDiffTable{}

	maxCols := 0
	maxRows := len(leftRows)
	if len(rightRows) > maxRows {
		maxRows = len(rightRows)
	}
	if len(leftRows) > 0 {
		for _, r := range leftRows {
			if len(r) > maxCols {
				maxCols = len(r)
			}
		}
	}
	if len(rightRows) > 0 {
		for _, r := range rightRows {
			if len(r) > maxCols {
				maxCols = len(r)
			}
		}
	}

	columnMap := mapCsvColumns(leftRows, rightRows)

	if len(leftRows) > 0 || len(rightRows) > 0 {
		headerCells := make([]CsvDiffCell, len(columnMap))
		for i, cm := range columnMap {
			var leftVal, rightVal string
			if cm.leftIdx >= 0 && len(leftRows) > 0 && cm.leftIdx < len(leftRows[0]) {
				leftVal = leftRows[0][cm.leftIdx]
			}
			if cm.rightIdx >= 0 && len(rightRows) > 0 && cm.rightIdx < len(rightRows[0]) {
				rightVal = rightRows[0][cm.rightIdx]
			}
			cellType := CsvCellUnchanged
			if cm.leftIdx < 0 {
				cellType = CsvCellAdd
			} else if cm.rightIdx < 0 {
				cellType = CsvCellDel
			} else if leftVal != rightVal {
				cellType = CsvCellChanged
			}
			headerCells[i] = CsvDiffCell{
				LeftValue:  leftVal,
				RightValue: rightVal,
				CellType:   cellType,
			}
		}
		table.Headers = headerCells
	}

	startRow := 0
	if len(leftRows) > 0 || len(rightRows) > 0 {
		startRow = 1
	}

	for rowIdx := startRow; rowIdx < maxRows; rowIdx++ {
		leftExists := rowIdx < len(leftRows)
		rightExists := rowIdx < len(rightRows)

		if !leftExists && !rightExists {
			break
		}

		cells := make([]CsvDiffCell, len(columnMap))
		for i, cm := range columnMap {
			var leftVal, rightVal string
			if leftExists && cm.leftIdx >= 0 && cm.leftIdx < len(leftRows[rowIdx]) {
				leftVal = leftRows[rowIdx][cm.leftIdx]
			}
			if rightExists && cm.rightIdx >= 0 && cm.rightIdx < len(rightRows[rowIdx]) {
				rightVal = rightRows[rowIdx][cm.rightIdx]
			}

			cellType := CsvCellUnchanged
			if !leftExists {
				cellType = CsvCellAdd
			} else if !rightExists {
				cellType = CsvCellDel
			} else if leftVal != rightVal {
				cellType = CsvCellChanged
			}

			cells[i] = CsvDiffCell{
				LeftValue:  leftVal,
				RightValue: rightVal,
				CellType:   cellType,
			}
		}
		table.Rows = append(table.Rows, CsvDiffRow{
			RowNum: rowIdx + 1,
			Cells:  cells,
		})
	}

	return table, nil
}

type colMapping struct {
	leftIdx  int
	rightIdx int
}

func mapCsvColumns(leftRows, rightRows [][]string) []colMapping {
	maxCols := 0
	if len(leftRows) > 0 {
		for _, r := range leftRows {
			if len(r) > maxCols {
				maxCols = len(r)
			}
		}
	}
	if len(rightRows) > 0 {
		for _, r := range rightRows {
			if len(r) > maxCols {
				maxCols = len(r)
			}
		}
	}

	var mappings []colMapping

	if len(leftRows) == 0 && len(rightRows) == 0 {
		return mappings
	}

	leftHeaderIndex := make(map[string]int)
	if len(leftRows) > 0 {
		for i, h := range leftRows[0] {
			key := strings.TrimSpace(strings.ToLower(h))
			if _, exists := leftHeaderIndex[key]; !exists {
				leftHeaderIndex[key] = i
			}
		}
	}

	rightHeaderIndex := make(map[string]int)
	if len(rightRows) > 0 {
		for i, h := range rightRows[0] {
			key := strings.TrimSpace(strings.ToLower(h))
			if _, exists := rightHeaderIndex[key]; !exists {
				rightHeaderIndex[key] = i
			}
		}
	}

	matchedRight := make(map[int]bool)

	if len(leftRows) > 0 {
		for li, lh := range leftRows[0] {
			key := strings.TrimSpace(strings.ToLower(lh))
			if ri, ok := rightHeaderIndex[key]; ok && !matchedRight[ri] {
				mappings = append(mappings, colMapping{leftIdx: li, rightIdx: ri})
				matchedRight[ri] = true
			} else {
				mappings = append(mappings, colMapping{leftIdx: li, rightIdx: -1})
			}
		}
	}

	if len(rightRows) > 0 {
		for ri := range rightRows[0] {
			if !matchedRight[ri] {
				mappings = append(mappings, colMapping{leftIdx: -1, rightIdx: ri})
			}
		}
	}

	if len(mappings) == 0 {
		for i := 0; i < maxCols; i++ {
			mappings = append(mappings, colMapping{leftIdx: i, rightIdx: i})
		}
	}

	return mappings
}
