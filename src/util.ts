export function convertOptionsToMappingProperties(input: any): any {
  if (typeof input !== "object" || input === null) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(convertOptionsToMappingProperties);
  }

  const output: Record<string, any> = {};

  for (const [key, value] of Object.entries(input)) {
    if (
      ["required", "default", "validate", "__meta", "options"].includes(key)
    ) {
      continue;
    }
    const newKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`
    );
    output[newKey] = convertOptionsToMappingProperties(value);
  }

  return output;
}
