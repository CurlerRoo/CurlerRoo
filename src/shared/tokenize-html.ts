import * as parse5 from 'parse5';
import { getLinesFromText } from './utils';

const selfClosingTags = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
];

type TokenType =
  | 'tag'
  | 'attributeKey'
  | 'attributeEqual'
  | 'attributeValue'
  | 'value'
  | 'text'
  | 'comment'
  | 'structural';

export type HtmlToken = {
  value: string;
  start: number;
  end: number;
  type: TokenType;
  index: number;
  startLine: number;
  path: string;
};

export const _tokenizeHtml = ({
  html,
  indent,
}: {
  html: any;
  indent: number;
}): {
  value: string;
  type: TokenType;
}[] => {
  const prefix = `${' '.repeat(indent)}`;
  if (html.nodeName === '#document') {
    return (html.childNodes || []).flatMap((child: any) =>
      _tokenizeHtml({
        html: child,
        indent,
      }),
    );
  }
  if (html.nodeName === '#text') {
    if (html.value.trim() === '') {
      return [];
    }

    const lines = html.value.split('\n').filter((line: string) => line.trim());
    return lines.map((line: string) => ({
      value: `${prefix}${line.trim()}\n`,
      type: 'text',
    }));
  }
  if (html.nodeName === '#comment') {
    return [
      {
        value: prefix,
        type: 'structural',
      },
      {
        value: html.data,
        type: 'comment',
      },
    ];
  }
  if (html.nodeName === '#documentType') {
    return [
      {
        value: prefix,
        type: 'structural',
      },
      {
        value: `<!DOCTYPE ${html.name}>`,
        type: 'comment',
      },
      {
        value: '\n',
        type: 'structural',
      },
    ];
  }
  if (selfClosingTags.includes(html.nodeName)) {
    return [
      {
        value: prefix,
        type: 'structural',
      },
      {
        value: `<${html.nodeName}`,
        type: 'tag',
      },
      ...(html.attrs || []).flatMap((attr: any) => {
        const lines = getLinesFromText({ text: attr.value });
        return [
          {
            value: ' ',
            type: 'structural',
          },
          {
            value: attr.name,
            type: 'attributeKey',
          },
          {
            value: '=',
            type: 'attributeEqual',
          },
          ...lines.map((line: string) => {
            return {
              value: line,
              type: 'attributeValue',
            };
          }),
        ];
      }),
      {
        value: '/>',
        type: 'tag',
      },
      {
        value: '\n',
        type: 'structural',
      },
    ];
  }

  return [
    {
      value: prefix,
      type: 'structural',
    },
    {
      value: `<${html.nodeName}`,
      type: 'tag',
    },
    ...(html.attrs || []).flatMap((attr: any) => {
      const lines = getLinesFromText({ text: attr.value });
      return [
        {
          value: ' ',
          type: 'structural',
        },
        {
          value: attr.name,
          type: 'attributeKey',
        },
        {
          value: '=',
          type: 'attributeEqual',
        },
        ...lines.map((line: string) => {
          return {
            value: line,
            type: 'attributeValue',
          };
        }),
      ];
    }),
    {
      value: '>',
      type: 'tag',
    },
    {
      value: '\n',
      type: 'structural',
    },
    ...(html.childNodes || []).flatMap((child: any) =>
      _tokenizeHtml({
        html: child,
        indent: indent + 2,
      }),
    ),
    {
      value: prefix,
      type: 'structural',
    },
    {
      value: `</${html.nodeName}>`,
      type: 'tag',
    },
    {
      value: '\n',
      type: 'structural',
    },
  ];
};

export const tokenizeHtml = (jsonString: string): HtmlToken[] => {
  const dom = parse5.parse(jsonString);
  const tokens = _tokenizeHtml({
    html: dom,
    indent: 0,
  }).filter((m) => m.value);
  return tokens.reduce(
    (acc, token, index) => {
      const lastToken = acc.htmlTokens[acc.htmlTokens.length - 1];
      acc.htmlTokens.push({
        value: token.value,
        type: token.type,
        start: lastToken ? lastToken.end : 0,
        end: token.value.length + (lastToken ? lastToken.end : 0),
        index,
        startLine: acc.currentLine,
        path: '',
      });
      return {
        htmlTokens: acc.htmlTokens,
        currentLine: acc.currentLine + token.value.split('\n').length - 1,
      };
    },
    {
      htmlTokens: [] as HtmlToken[],
      currentLine: 0,
    },
  ).htmlTokens;
};
