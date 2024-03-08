import _ from 'lodash';
import { DocOnDiskType, DocType, docSchema } from './types';
import { v4 } from 'uuid';

export const getDocFromDocOnDisk = (docOnDisk: DocOnDiskType): DocType => {
  const parsed = _.flow(
    (doc: DocOnDiskType): DocType => {
      return {
        ...doc,
        executingAllCells: false,
        cells: doc.cells.map((cell) => ({
          ...cell,
          id: cell.id || v4(),
          cursor_position: {
            lineNumber: 1,
            column: 1,
            offset: 0,
          },
          outputs: cell.outputs.map((output) => ({
            ...output,
            formattedBody: '',
            showSearch: false,
            bodyFilePath: output.bodyFilePath || '',
            bodyBase64: output.bodyBase64 || '',
          })),
        })),
      };
    },
    (doc) => docSchema.parse(doc),
  )(docOnDisk);

  return parsed;
};
