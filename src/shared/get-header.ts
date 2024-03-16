export const getHeader = (headers: { [key: string]: string }, key: string) => {
  const headerKey = Object.keys(headers).find(
    (k) => k.toLowerCase() === key.toLowerCase(),
  );
  if (!headerKey) {
    return null;
  }
  return headers[headerKey];
};

export const hasHeader = (headers: { [key: string]: string }, name: string) => {
  return !!(
    headers &&
    name &&
    Object.keys(headers).some((h) => h.toLowerCase() === name.toLowerCase())
  );
};
