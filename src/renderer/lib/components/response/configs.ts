export type ResponseHandlerType =
  | 'JSON'
  | 'HTML'
  | 'XML'
  | 'Raw text'
  | 'Image'
  | 'PDF'
  | 'Binary';

export type ResponseHandlerFeature = 'Copy all' | 'Search';

export const responseHandlerTypeToFeature: Record<
  ResponseHandlerType,
  ResponseHandlerFeature[]
> = {
  JSON: ['Copy all', 'Search'],
  HTML: ['Copy all', 'Search'],
  XML: ['Copy all', 'Search'],
  'Raw text': ['Copy all', 'Search'],
  Image: [],
  PDF: [],
  Binary: [],
};
