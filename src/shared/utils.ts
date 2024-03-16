import { Variable } from './types';

export const findVariableFromCurlPartValue = ({
  value,
  variables,
}: {
  value: string;
  variables: Variable[];
}) => {
  const variable = variables.find(
    (v) => `$${v.key}` === value || `\${${v.key}}` === value,
  );
  return variable;
};

export const getLinesFromText = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  return lines.map((line, index) => {
    const isFirst = index === 0;
    const isLast = index === lines.length - 1;
    if (isFirst && !isLast) {
      return `${line}\n`;
    }
    return line;
  });
};

export const debugLog = (message?: any, ...optionalParams: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message, ...optionalParams);
  }
};
