export const getValueByPath = (
  object: any,
  path: string,
  defaultValue?: any,
) => {
  const removeQuotes = (string: string) => {
    if (string.startsWith('"') && string.endsWith('"')) {
      return string.slice(1, -1);
    }
    if (string.startsWith("'") && string.endsWith("'")) {
      return string.slice(1, -1);
    }
    return string;
  };

  const fullPath = Array.isArray(path)
    ? (path as string[])
    : path.split(/[.[\]]/).filter(Boolean);

  const value = fullPath.reduce((acc, key) => {
    const unquotedKey = removeQuotes(key);
    const result =
      acc && unquotedKey in Object(acc) ? acc[unquotedKey] : defaultValue;
    return result;
  }, object);
  if (typeof value === 'object') {
    return value;
  }
  return value;
};
