export function setStringFilterParam(
  query: Record<string, string | number>,
  key: string,
  value?: string,
  op?: string
) {
  if (op === "empty") {
    query[`${key}Op`] = "empty"
    return
  }
  if (value) {
    query[key] = value
    if (op) {
      query[`${key}Op`] = op
    }
  }
}

export function setNumberFilterParam(
  query: Record<string, string | number>,
  key: string,
  value?: number,
  op?: string
) {
  if (op === "empty") {
    query[`${key}Op`] = "empty"
    return
  }
  if (value != null) {
    query[key] = value
    if (op) {
      query[`${key}Op`] = op
    }
  }
}
