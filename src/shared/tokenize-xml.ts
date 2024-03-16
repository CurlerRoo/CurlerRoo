import { XMLParser } from 'fast-xml-parser';

type TokenType =
  | 'tag'
  | 'attributeKey'
  | 'attributeEqual'
  | 'attributeValue'
  | 'value'
  | 'text'
  | 'comment'
  | 'structural';

export type XmlToken = {
  value: string;
  start: number;
  end: number;
  type: TokenType;
  index: number;
  startLine: number;
  path: string;
};

export const _tokenizeXml = ({
  xml,
  indent,
}: {
  xml: any;
  indent: number;
}): {
  value: string;
  type: TokenType;
}[] => {
  const prefix = `${' '.repeat(indent)}`;
  if (Array.isArray(xml)) {
    return [
      {
        value: prefix,
        type: 'structural',
      },
      ...xml.flatMap((x) =>
        _tokenizeXml({
          xml: x,
          indent: indent === 0 ? indent : indent + 2,
        }),
      ),
    ];
  }
  if (typeof xml === 'object') {
    const [tagKey, attributesKey] = Object.keys(xml);
    const tag = xml[tagKey];
    const attributes = (() => {
      const attr = Object.entries(xml[attributesKey] || {}).flatMap(
        ([key, value]) =>
          [
            {
              value: ' ',
              type: 'structural',
            },
            {
              value: key.slice(2),
              type: 'attributeKey',
            },
            {
              value: '=',
              type: 'attributeEqual',
            },
            {
              value: `"${value}"`,
              type: 'attributeValue',
            },
          ] as const,
      );
      return attr;
    })();
    if (tagKey.startsWith('#text')) {
      const lines = String(tag)
        .split('\n')
        .filter((line: string) => line.trim());
      return lines.map((line: string) => ({
        value: `${line.trim()}`,
        type: 'text' as const,
      }));
    }
    if (tagKey.startsWith('#comment')) {
      return [
        {
          value: '\n',
          type: 'structural',
        },
        {
          value: prefix,
          type: 'structural',
        },
        {
          value: `<!--${tag[0]['#text']}-->`,
          type: 'comment',
        },
      ];
    }
    if (tagKey.startsWith('#cdata')) {
      return [
        {
          value: '\n',
          type: 'structural',
        },
        {
          value: prefix,
          type: 'structural',
        },
        {
          value: `<![CDATA[${tag[0]['#text']}]]>`,
          type: 'text',
        },
      ];
    }
    if (tagKey.startsWith('?')) {
      return [
        {
          value: '\n',
          type: 'structural',
        },
        {
          value: prefix,
          type: 'structural',
        },
        {
          value: `<${tagKey}`,
          type: 'tag',
        },
        ...attributes,
        {
          value: '?>',
          type: 'tag',
        },
      ];
    }
    if (tagKey.startsWith('!')) {
      return [
        {
          value: '\n',
          type: 'structural',
        },
        {
          value: prefix,
          type: 'structural',
        },
        {
          value: `<${tagKey}`,
          type: 'tag',
        },
        ...attributes,
        {
          value: '>',
          type: 'tag',
        },
      ];
    }
    if (Array.isArray(tag)) {
      const children = tag.flatMap((x) =>
        _tokenizeXml({
          xml: x,
          indent: indent + 2,
        }),
      );
      const hasChildren = children.filter((m) => m.value.trim()).length > 0;
      if (!hasChildren) {
        return [
          {
            value: '\n',
            type: 'structural',
          },
          {
            value: prefix,
            type: 'structural',
          },
          {
            value: `<${tagKey}`,
            type: 'tag',
          },
          ...attributes,
          {
            value: '/>',
            type: 'tag',
          },
        ];
      }
      if (tag.length === 1 && tag[0]['#text']) {
        return [
          {
            value: '\n',
            type: 'structural',
          },
          {
            value: prefix,
            type: 'structural',
          },
          {
            value: `<${tagKey}`,
            type: 'tag',
          },
          ...attributes,
          {
            value: '>',
            type: 'tag',
          },
          ...tag.flatMap((x) =>
            _tokenizeXml({
              xml: x,
              indent: indent + 2,
            }),
          ),
          {
            value: `</${tagKey}>`,
            type: 'tag',
          },
        ];
      }
      return [
        {
          value: '\n',
          type: 'structural',
        },
        {
          value: prefix,
          type: 'structural',
        },
        {
          value: `<${tagKey}`,
          type: 'tag',
        },
        ...attributes,
        {
          value: '>',
          type: 'tag',
        },
        ...tag.flatMap((x) =>
          _tokenizeXml({
            xml: x,
            indent: indent + 2,
          }),
        ),
        {
          value: '\n',
          type: 'structural',
        },
        {
          value: prefix,
          type: 'structural',
        },
        {
          value: `</${tagKey}>`,
          type: 'tag',
        },
      ];
    }
  }
  throw new Error(`Unknown type ${typeof xml}`);
};

const flattenArrayWithSingleItem = (arr: any): any => {
  if (arr.length === 1) {
    return flattenArrayWithSingleItem(arr[0]);
  }
  return arr;
};

export const tokenizeXml = (jsonString: string) => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    ignorePiTags: false,
    ignoreDeclaration: false,
    preserveOrder: true,
    commentPropName: '#comment',
    cdataPropName: '#cdata',
    processEntities: true,
    htmlEntities: true,
  });
  const dom = flattenArrayWithSingleItem(parser.parse(jsonString));
  const tokens = _tokenizeXml({
    xml: dom,
    indent: 0,
  }).filter((m) => m.value);
  while (tokens[0]?.type === 'structural') {
    tokens.shift();
  }
  return tokens.reduce(
    (acc, token, index) => {
      const lastToken = acc.xmlTokens[acc.xmlTokens.length - 1];
      acc.xmlTokens.push({
        value: token.value,
        type: token.type,
        start: lastToken ? lastToken.end : 0,
        end: token.value.length + (lastToken ? lastToken.end : 0),
        index,
        startLine: acc.currentLine,
        path: '',
      });
      return {
        xmlTokens: acc.xmlTokens,
        currentLine: acc.currentLine + token.value.split('\n').length - 1,
      };
    },
    {
      xmlTokens: [] as XmlToken[],
      currentLine: 0,
    },
  ).xmlTokens;
};
