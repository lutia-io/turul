import type {
  TemplateVariable,
  TemplateVariableGroup,
} from "@/components/template-value-input"
import type { JsonSchemaProperty } from "@/lib/json-definition"

export const mockTextTemplate = "{{ mockText }}"
export const mockNumberTemplate = "{{ mockNumber }}"
export const mockIntegerTemplate = "{{ mockInteger }}"
export const mockBooleanTemplate = "{{ mockBoolean }}"
export const mockDateTemplate = "{{ mockDate }}"
export const mockDateTimeTemplate = "{{ mockDateTime }}"
export const mockEmailTemplate = "{{ mockEmail }}"
export const mockURLTemplate = "{{ mockURL }}"
export const mockPhoneTemplate = "{{ mockPhone }}"

const MOCK_TOKEN_RE =
  /^\{\{\s*mock(Text|Number|Integer|Boolean|DateTime|Date|Email|URL|Phone|Choice)\b[^}]*\}\}$/

export const mockTemplateVariables: TemplateVariable[] = [
  { label: "Mock text", token: mockTextTemplate, hint: "mock" },
  { label: "Mock number", token: mockNumberTemplate, hint: "mock" },
  { label: "Mock whole number", token: mockIntegerTemplate, hint: "mock" },
  { label: "Mock yes / no", token: mockBooleanTemplate, hint: "mock" },
  { label: "Mock date", token: mockDateTemplate, hint: "mock" },
  { label: "Mock date & time", token: mockDateTimeTemplate, hint: "mock" },
  { label: "Mock email", token: mockEmailTemplate, hint: "mock" },
  { label: "Mock URL", token: mockURLTemplate, hint: "mock" },
  { label: "Mock phone", token: mockPhoneTemplate, hint: "mock" },
  {
    label: "Mock choice",
    token: '{{ mockChoice "a" "b" }}',
    caretOffset: '{{ mockChoice "'.length,
    hint: "mock",
  },
]

export const mockTemplateGroup: TemplateVariableGroup = {
  label: "Sample data",
  description: "Generated values, different each time the template runs.",
  variables: mockTemplateVariables,
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
  if (property.type === "integer") {
    return {
      label: "Mock whole number",
      token: mockIntegerTemplate,
      hint: "mock",
    }
  }
  if (property.type === "number") {
    return { label: "Mock number", token: mockNumberTemplate, hint: "mock" }
  }
  if (property.type === "array" || property.type === "object") {
    return undefined
  }
  return { label: "Mock text", token: mockTextTemplate, hint: "mock" }
}
