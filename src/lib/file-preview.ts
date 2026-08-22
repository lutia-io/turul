import type { StoredFile } from "@/data/files"

export function fileKindLabel(file: StoredFile) {
  if (file.contentType.startsWith("image/")) {
    return "Image"
  }

  if (file.contentType === "application/pdf") {
    return "PDF"
  }

  if (file.contentType === "text/csv" || file.filename.endsWith(".csv")) {
    return "CSV"
  }

  if (
    file.contentType.includes("spreadsheet") ||
    file.filename.endsWith(".xlsx") ||
    file.filename.endsWith(".xls")
  ) {
    return "Spreadsheet"
  }

  return file.contentType
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
