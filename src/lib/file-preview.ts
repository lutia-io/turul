export type FileKind =
  "image" | "pdf" | "csv" | "text" | "spreadsheet" | "unknown"

export type FileIdentity = {
  filename: string
  contentType: string
}

const IMAGE_EXTENSIONS = new Set([
  ".apng",
  ".avif",
  ".bmp",
  ".gif",
  ".ico",
  ".jfif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".tif",
  ".tiff",
  ".webp",
])

const PDF_EXTENSIONS = new Set([".pdf"])

const CSV_EXTENSIONS = new Set([".csv"])

const SPREADSHEET_EXTENSIONS = new Set([".ods", ".xls", ".xlsm", ".xlsx"])

const TEXT_EXTENSIONS = new Set([
  ".c",
  ".cfg",
  ".conf",
  ".cpp",
  ".css",
  ".env",
  ".go",
  ".graphql",
  ".h",
  ".htm",
  ".html",
  ".ini",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".log",
  ".md",
  ".markdown",
  ".mjs",
  ".php",
  ".py",
  ".rb",
  ".rs",
  ".sh",
  ".sql",
  ".toml",
  ".ts",
  ".tsv",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
])

export function fileExtension(filename: string) {
  const index = filename.lastIndexOf(".")
  if (index < 0) {
    return ""
  }
  return filename.slice(index).toLowerCase()
}

function isCsv(file: FileIdentity) {
  return (
    file.contentType === "text/csv" ||
    file.contentType === "application/csv" ||
    CSV_EXTENSIONS.has(fileExtension(file.filename))
  )
}

function isImage(file: FileIdentity) {
  return (
    file.contentType.startsWith("image/") ||
    IMAGE_EXTENSIONS.has(fileExtension(file.filename))
  )
}

function isPdf(file: FileIdentity) {
  return (
    file.contentType === "application/pdf" ||
    PDF_EXTENSIONS.has(fileExtension(file.filename))
  )
}

function isSpreadsheet(file: FileIdentity) {
  return (
    file.contentType.includes("spreadsheet") ||
    file.contentType === "application/vnd.ms-excel" ||
    SPREADSHEET_EXTENSIONS.has(fileExtension(file.filename))
  )
}

function isText(file: FileIdentity) {
  if (isCsv(file)) {
    return false
  }

  if (
    file.contentType.startsWith("text/") ||
    file.contentType === "application/json" ||
    file.contentType === "application/xml" ||
    file.contentType === "application/yaml" ||
    file.contentType === "application/x-yaml" ||
    file.contentType === "application/javascript" ||
    file.contentType === "application/x-javascript" ||
    file.contentType === "application/typescript"
  ) {
    return true
  }

  return TEXT_EXTENSIONS.has(fileExtension(file.filename))
}

export function matchFileKind(file: FileIdentity): FileKind {
  if (isImage(file)) {
    return "image"
  }
  if (isPdf(file)) {
    return "pdf"
  }
  if (isCsv(file)) {
    return "csv"
  }
  if (isSpreadsheet(file)) {
    return "spreadsheet"
  }
  if (isText(file)) {
    return "text"
  }
  return "unknown"
}

export function fileKindLabel(file: FileIdentity) {
  switch (matchFileKind(file)) {
    case "image":
      return "Image"
    case "pdf":
      return "PDF"
    case "csv":
      return "CSV"
    case "text":
      return "Text"
    case "spreadsheet":
      return "Spreadsheet"
    case "unknown":
      return file.contentType || "File"
  }
}

export function fileKindHint(file: FileIdentity) {
  if (matchFileKind(file) === "image") {
    return "Scroll or use +/− to zoom, drag to pan, double-click to reset"
  }
  return undefined
}

export function parseCsv(text: string) {
  const lines = text
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return { headers: [] as string[], rows: [] as string[][] }
  }

  const split = (line: string) => line.split(",").map((cell) => cell.trim())

  return {
    headers: split(lines[0]),
    rows: lines.slice(1, 101).map(split),
  }
}
