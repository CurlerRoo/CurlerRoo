import _ from 'lodash';
import { DocOnDiskType, DocType, docOnDiskSchema, docSchema } from './types';

export const getDocOnDiskFromDoc = (doc: DocType): DocOnDiskType => {
  const parsedDocOnDisk = _.flow(
    (doc) => docSchema.parse(doc),
    (doc) => ({
      ...doc,
      cells: doc.cells.map((cell) => ({
        ...cell,
        send_status: cell.send_status === 'sending' ? 'idle' : cell.send_status,
        sending_id: undefined,
      })),
    }),
    (doc) => docOnDiskSchema.parse(doc),
  )(doc);
  return parsedDocOnDisk;
};
