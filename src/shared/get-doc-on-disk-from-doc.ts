import _ from 'lodash';
import { v4 } from 'uuid';
import { DocOnDiskType, DocType, docOnDiskSchema, docSchema } from './types';

export const getDocOnDiskFromDoc = (doc: DocType): DocOnDiskType => {
  const parsedDocOnDisk = _.flow(
    (doc) => docSchema.parse(doc),
    (doc) => ({
      ...doc,
      cells: doc.cells.map((cell) => {
        const outputs = cell.outputs || [];
        const sendHistories =
          cell.sendHistories && cell.sendHistories.length
            ? cell.sendHistories
            : [
                {
                  id: v4(),
                  sentAt: outputs[0]?.responseDate || 0,
                  request: {
                    source: cell.source || [''],
                    pre_scripts: cell.pre_scripts || [''],
                    post_scripts: cell.post_scripts || [''],
                    pre_scripts_enabled: cell.pre_scripts_enabled || false,
                    post_scripts_enabled: cell.post_scripts_enabled || false,
                  },
                  outputs,
                },
              ];

        const selectedSendHistoryId =
          cell.selectedSendHistoryId &&
          sendHistories.some(
            (history) => history.id === cell.selectedSendHistoryId,
          )
            ? cell.selectedSendHistoryId
            : _.last(sendHistories)?.id;

        const selectedOutputs =
          sendHistories.find((history) => history.id === selectedSendHistoryId)
            ?.outputs || outputs;

        return {
          ...cell,
          outputs: selectedOutputs,
          sendHistories: sendHistories,
          selectedResponseHistoryId: selectedSendHistoryId,
          send_status:
            cell.send_status === 'sending' ? 'idle' : cell.send_status,
          sending_id: undefined,
        };
      }),
    }),
    (doc) => docOnDiskSchema.parse(doc),
  )(doc);
  return parsedDocOnDisk;
};
