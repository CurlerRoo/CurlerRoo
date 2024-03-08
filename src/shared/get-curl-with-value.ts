import { groupValueAndVariable } from './format-curl';
import { Variable } from './types';
import { getCurlParts } from './get-curl-parts';
import { findVariableFromCurlPartValue } from './utils';

export const getCurlWithValue = ({
  curl,
  variables,
}: {
  curl: string;
  variables: Variable[];
}) => {
  const parts = getCurlParts(curl);
  const valuedParts = parts.map((part) => {
    if (part.type === 'variable' || part.type === 'escaped-variable') {
      const variable = findVariableFromCurlPartValue({
        value: part.value,
        variables,
      });
      if (variable?.value === undefined) {
        return part;
      }
      const stringValue =
        typeof variable.value === 'string'
          ? variable.value
          : JSON.stringify(variable.value);
      return {
        ...part,
        value: part.type === 'variable' ? `'${stringValue}'` : stringValue,
      };
    }
    return part;
  });
  const groupedParts = groupValueAndVariable(valuedParts);
  const value = groupedParts.map((m) => m.value).join('');
  return value;
};
