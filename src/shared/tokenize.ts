export const tokenize = <T>({
  regex,
  str,
  startIndex,
  type,
  contextType,
}: {
  regex: RegExp;
  str: string;
  startIndex?: number;
  type: T | null;
  // context type is used to determine the type of the whole current string
  // the matched part will be of type `type`
  // the rest will be of type `contextType`
  contextType: T | null;
}): {
  value: string;
  index: number;
  type: T | null;
}[] => {
  const matches: {
    value: string;
    index: number;
    type: T | null;
  }[] = [];
  let lastIndex = 0;
  while (true) {
    const match = regex.exec(str);
    if (!match) {
      const value = str.slice(lastIndex);
      if (!value) {
        break;
      }
      matches.push({
        value,
        index: lastIndex,
        type: contextType,
      });
      break;
    }
    if (match.index > lastIndex) {
      matches.push({
        value: str.slice(lastIndex, match.index),
        index: lastIndex,
        type: contextType,
      });
    }
    matches.push({
      value: match[0],
      index: match.index,
      type,
    });
    lastIndex = match.index + match[0].length;
  }

  return matches.map((match) => ({
    ...match,
    index: match.index + (startIndex ?? 0),
  }));
};
