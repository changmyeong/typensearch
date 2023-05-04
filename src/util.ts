export function camelToSnakeObj(input: any): any {
  if (typeof input !== 'object' || input === null) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(camelToSnakeObj);
  }

  const output: Record<string, any> = {};

  for (const [key, value] of Object.entries(input)) {
    const newKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    output[newKey] = camelToSnakeObj(value);
  }

  return output;
}