package diff

type FileStatus int

const (
	StatusSame      FileStatus = iota // =
	StatusDifferent                   // ≠
	StatusSimilar                     // ≈
	StatusLeftOnly                    // only in left
	StatusRightOnly                   // only in right
)

type FileResult struct {
	RelativePath string      `json:"relativePath"`
	Name         string      `json:"name"`
	LeftPath     string      `json:"leftPath"`
	RightPath    string      `json:"rightPath"`
	Status       FileStatus  `json:"status"`
	IsBinary     bool        `json:"isBinary"`
	IsCsv        bool        `json:"isCsv"`
	IsDir        bool        `json:"isDir"`
	Children     []FileResult `json:"children"`
	Size         int64       `json:"size"`
	ErrMsg       string      `json:"errMsg,omitempty"`
}

type CompareProgress struct {
	Total     int    `json:"total"`
	Current   int    `json:"current"`
	FileName  string `json:"fileName"`
	Completed bool   `json:"completed"`
	Error     string `json:"error,omitempty"`
	Result    *CompareSummary `json:"result,omitempty"`
}

type CompareSummary struct {
	LeftDir           string       `json:"leftDir"`
	RightDir          string       `json:"rightDir"`
	Files             []FileResult `json:"files"`
	TotalFiles        int          `json:"totalFiles"`
	SameCount         int          `json:"sameCount"`
	DifferentCount    int          `json:"differentCount"`
	SimilarCount      int          `json:"similarCount"`
	LeftOnlyCount     int          `json:"leftOnlyCount"`
	RightOnlyCount    int          `json:"rightOnlyCount"`
}

func (s FileStatus) String() string {
	switch s {
	case StatusSame:
		return "="
	case StatusDifferent:
		return "\u2260"
	case StatusSimilar:
		return "\u2248"
	case StatusLeftOnly:
		return "L"
	case StatusRightOnly:
		return "R"
	}
	return "?"
}

type SplitLineType int

const (
	SplitContext SplitLineType = iota
	SplitChanged
	SplitDel
	SplitAdd
	SplitSection
)

type SplitLine struct {
	LeftNum     int
	RightNum    int
	LeftLine    string
	RightLine   string
	Type        SplitLineType
	SectionText string
}

func (s FileStatus) CSSClass() string {
	switch s {
	case StatusSame:
		return "status-same"
	case StatusDifferent:
		return "status-different"
	case StatusSimilar:
		return "status-similar"
	case StatusLeftOnly:
		return "status-left-only"
	case StatusRightOnly:
		return "status-right-only"
	}
	return ""
}
