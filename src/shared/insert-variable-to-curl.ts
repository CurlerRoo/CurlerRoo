import _ from 'lodash';
import { getCurlParts } from './get-curl-parts';

export const insertVariableToCurl = ({
  curl,
  index,
  variableName,
}: {
  curl: string;
  index: number;
  variableName: string;
}) => {
  if (!curl) {
    return `$${variableName}`;
  }
  const lastPart = _.last(getCurlParts(curl));
  if (lastPart) {
    if (lastPart.value.length + lastPart.index === index) {
      return `${curl}$${variableName}`;
    }
  }

  const parts = getCurlParts(curl);
  const partIndex = _.findIndex(parts, (part) => {
    return index >= part.index && index < part.index + part.value.length;
  });
  const part = parts[partIndex];
  const localIndex = index - part.index;
  const insertedPart = (() => {
    if (part.type === 'value') {
      // case 1
      if (part.value.startsWith('"')) {
        if (localIndex === 0) {
          return `$${variableName}${part.value}`;
        }

        if (localIndex === part.value.length) {
          return `${part.value}$${variableName}`;
        }

        if (part.value[localIndex].match(/[\w\d_]/)) {
          return `${part.value.slice(0, localIndex)}$\{${variableName}}${part.value.slice(localIndex)}`;
        }
        return `${part.value.slice(0, localIndex)}$${variableName}${part.value.slice(localIndex)}`;
      }

      // case 2
      if (part.value.startsWith("'")) {
        if (localIndex === 0 || localIndex === 1) {
          return `$${variableName}${part.value}`;
        }

        if (
          localIndex === part.value.length ||
          localIndex === part.value.length - 1
        ) {
          return `${part.value}$${variableName}`;
        }

        return `${part.value.slice(0, localIndex)}'$${variableName}'${part.value.slice(localIndex)}`;
      }

      // case 3
      if (part.value[localIndex].match(/[\w\d_]/)) {
        return `${part.value.slice(0, localIndex)}$\{${variableName}}${part.value.slice(localIndex)}`;
      }
      return `${part.value.slice(0, localIndex)}$${variableName}${part.value.slice(localIndex)}`;
    }
    if (part.type === 'space' || part.type === 'newline') {
      return `${part.value.slice(0, localIndex)}$${variableName}${part.value.slice(localIndex)}`;
    }
    throw new Error('Cannot insert variable to ' + part.type);
  })();

  return parts
    .map((part, i) => {
      if (i === partIndex) {
        return {
          ...part,
          value: insertedPart,
        };
      }
      return part;
    })
    .map((part) => part.value)
    .join('');
};
