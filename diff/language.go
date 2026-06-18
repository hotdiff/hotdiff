package diff

import (
	"path/filepath"
	"strings"
)

func DetectLanguage(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".go":
		return "go"
	case ".js", ".jsx", ".mjs", ".cjs":
		return "javascript"
	case ".ts", ".tsx", ".mts", ".cts":
		return "typescript"
	case ".py", ".pyw":
		return "python"
	case ".java":
		return "java"
	case ".c", ".h":
		return "c"
	case ".cpp", ".cc", ".cxx", ".hpp", ".hxx":
		return "cpp"
	case ".rs":
		return "rust"
	case ".json":
		return "json"
	case ".html", ".htm":
		return "html"
	case ".css", ".scss", ".sass", ".less":
		return "css"
	case ".xml", ".svg":
		return "xml"
	case ".yaml", ".yml":
		return "yaml"
	case ".md", ".markdown":
		return "markdown"
	case ".sql":
		return "sql"
	case ".sh", ".bash", ".zsh":
		return "shell"
	case ".toml", ".ini", ".cfg", ".conf":
		return "ini"
	case ".csv":
		return "csv"
	case ".proto":
		return "protobuf"
	case ".vue":
		return "html"
	case ".rb":
		return "ruby"
	case ".php":
		return "php"
	case ".swift":
		return "swift"
	case ".kt", ".kts":
		return "kotlin"
	case ".dart":
		return "dart"
	case ".lua":
		return "lua"
	case ".r":
		return "r"
	case ".pl":
		return "perl"
	case ".tf", ".tfvars":
		return "terraform"
	case ".dockerfile", "dockerfile":
		return "dockerfile"
	case ".graphql", ".gql":
		return "graphql"
	default:
		base := strings.ToLower(filepath.Base(path))
		if base == "makefile" {
			return "makefile"
		}
		if strings.HasPrefix(base, "dockerfile") {
			return "dockerfile"
		}
		return "plaintext"
	}
}

var imageExtMap = map[string]string{
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".gif":  "image/gif",
	".bmp":  "image/bmp",
	".webp": "image/webp",
	".svg":  "image/svg+xml",
	".tiff": "image/tiff",
	".tif":  "image/tiff",
	".ico":  "image/x-icon",
	".icns": "image/x-icns",
	".heic": "image/heic",
	".heif": "image/heif",
	".avif": "image/avif",
}

func IsImageFile(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	_, ok := imageExtMap[ext]
	return ok
}

func GetImageMime(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	if mime, ok := imageExtMap[ext]; ok {
		return mime
	}
	return ""
}
