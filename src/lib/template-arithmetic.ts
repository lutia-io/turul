export const addTemplate = "{{ add 1 1 }}"
export const subTemplate = "{{ sub 1 1 }}"
export const mulTemplate = "{{ mul 1 1 }}"
export const divTemplate = "{{ div 1 1 }}"
export const modTemplate = "{{ mod 1 1 }}"

export const arithmeticTemplateVariables = [
  { label: "Add numbers", token: addTemplate },
  { label: "Subtract numbers", token: subTemplate },
  { label: "Multiply numbers", token: mulTemplate },
  { label: "Divide numbers", token: divTemplate },
  { label: "Remainder", token: modTemplate },
].map((item) => ({
  ...item,
  caretOffset: item.token.indexOf("1"),
}))
