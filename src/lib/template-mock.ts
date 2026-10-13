import type {
  TemplateVariable,
  TemplateVariableGroup,
} from "@/components/template-value-input"
import type { JsonSchemaProperty } from "@/lib/json-definition"
import { mathTemplateGroup } from "@/lib/template-arithmetic"

export const mockTextTemplate = "{{ mockText }}"
export const mockNumberTemplate = "{{ mockNumber }}"
export const mockBooleanTemplate = "{{ mockBoolean }}"
export const mockDateTemplate = "{{ mockDate }}"
export const mockTimeTemplate = "{{ mockTime }}"
export const mockDateTimeTemplate = "{{ mockDateTime }}"
export const mockEmailTemplate = "{{ mockEmail }}"
export const mockURLTemplate = "{{ mockURL }}"
export const mockPhoneTemplate = "{{ mockPhone }}"

export const nowTemplate = "{{ now }}"
export const nowDateTemplate = "{{ nowDate }}"
export const nowTimeTemplate = "{{ nowTime }}"
export const nowDateTimeTemplate = "{{ nowDateTime }}"
export const dateOfTemplate = "{{ dateOf  }}"
export const timeOfTemplate = "{{ timeOf  }}"

const MOCK_TOKEN_RE =
  /^\{\{\s*mock(Text|Number|Integer|Boolean|DateTime|Date|Time|Email|URL|Phone|Choice)\b[^}]*\}\}$/

export const mockTemplateVariables: TemplateVariable[] = [
  { label: "Text", token: mockTextTemplate },
  { label: "Number", token: mockNumberTemplate },
  { label: "Yes / no", token: mockBooleanTemplate },
  { label: "Date", token: mockDateTemplate },
  { label: "Time", token: mockTimeTemplate },
  { label: "Date & time", token: mockDateTimeTemplate },
  { label: "Email", token: mockEmailTemplate },
  { label: "URL", token: mockURLTemplate },
  { label: "Phone", token: mockPhoneTemplate },
  {
    label: "Choice",
    token: '{{ mockChoice "a" "b" }}',
    caretOffset: '{{ mockChoice "'.length,
  },
]

export const dateTimeTemplateVariables: TemplateVariable[] = [
  { label: "Current date & time", token: nowTemplate },
  { label: "Current date & time (nowDateTime)", token: nowDateTimeTemplate },
  { label: "Current date", token: nowDateTemplate },
  { label: "Current time of day", token: nowTimeTemplate },
  {
    label: "Date of…",
    token: dateOfTemplate,
    caretOffset: "{{ dateOf ".length,
  },
  {
    label: "Time of…",
    token: timeOfTemplate,
    caretOffset: "{{ timeOf ".length,
  },
]

export const dateTimeTemplateGroup: TemplateVariableGroup = {
  label: "Date & Time",
  submenu: true,
  variables: dateTimeTemplateVariables,
}

export const mockTemplateGroup: TemplateVariableGroup = {
  label: "Mock",
  submenu: true,
  variables: mockTemplateVariables,
}

export function utilityTemplateGroups(): TemplateVariableGroup[] {
  return [dateTimeTemplateGroup, mathTemplateGroup, mockTemplateGroup]
}

export function mockChoiceTemplate(values: string[]) {
  const args = values.map((value) => JSON.stringify(value)).join(" ")
  return `{{ mockChoice ${args} }}`
}

export function isMockTemplate(value: string) {
  return MOCK_TOKEN_RE.test(value.trim())
}

export function mockTokenForProperty(
  property?: Pick<JsonSchemaProperty, "type" | "format" | "enumValues">
) {
  return mockVariableForProperty(property)?.token
}

export function nowTokenForProperty(
  property?: Pick<JsonSchemaProperty, "type" | "format">
) {
  return nowVariableForProperty(property)?.token
}

export function nowVariableForProperty(
  property?: Pick<JsonSchemaProperty, "type" | "format">
): TemplateVariable | undefined {
  if (!property) {
    return undefined
  }
  if (property.format === "date") {
    return { label: "Current date", token: nowDateTemplate, hint: "now" }
  }
  if (property.format === "time") {
    return { label: "Current time", token: nowTimeTemplate, hint: "now" }
  }
  if (property.format === "date-time") {
    return {
      label: "Current date & time",
      token: nowTemplate,
      hint: "now",
    }
  }
  return undefined
}

export function mockVariableForProperty(
  property?: Pick<JsonSchemaProperty, "type" | "format" | "enumValues">
): TemplateVariable | undefined {
  if (!property) {
    return undefined
  }
  if (property.enumValues && property.enumValues.length > 0) {
    return {
      label: "Mock choice",
      token: mockChoiceTemplate(property.enumValues),
      hint: "mock",
    }
  }
  if (property.format === "email") {
    return { label: "Mock email", token: mockEmailTemplate, hint: "mock" }
  }
  if (property.format === "phone") {
    return { label: "Mock phone", token: mockPhoneTemplate, hint: "mock" }
  }
  if (property.format === "uri") {
    return { label: "Mock URL", token: mockURLTemplate, hint: "mock" }
  }
  if (property.format === "date") {
    return { label: "Mock date", token: mockDateTemplate, hint: "mock" }
  }
  if (property.format === "time") {
    return { label: "Mock time", token: mockTimeTemplate, hint: "mock" }
  }
  if (property.format === "date-time") {
    return {
      label: "Mock date & time",
      token: mockDateTimeTemplate,
      hint: "mock",
    }
  }
  if (
    property.format === "file" ||
    property.format === "foreign" ||
    property.format === "address"
  ) {
    return undefined
  }
  if (property.type === "boolean") {
    return { label: "Mock yes / no", token: mockBooleanTemplate, hint: "mock" }
  }
  if (property.type === "number" || property.type === "integer") {
    return { label: "Mock number", token: mockNumberTemplate, hint: "mock" }
  }
  if (property.type === "array" || property.type === "object") {
    return undefined
  }
  return { label: "Mock text", token: mockTextTemplate, hint: "mock" }
}
