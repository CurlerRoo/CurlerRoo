import _ from 'lodash';
import { DocOnDiskType, DocType, docSchema, CurlResponseOutput } from './types';
import { v4 } from 'uuid';

const normalizeOutput = (
  output: Partial<CurlResponseOutput> & {
    protocol: string;
    headers: { [key: string]: string };
    status: number;
    body: string[];
  },
): CurlResponseOutput => ({
  ...output,
  formattedBody: output.formattedBody || '',
  bodyFilePath: output.bodyFilePath || '',
  bodyBase64: output.bodyBase64 || '',
  responseDate: output.responseDate || 0,
});

// migrate here
export const getDocFromDocOnDisk = (docOnDisk: DocOnDiskType): DocType => {
  const parsed = _.flow(
    (doc: DocOnDiskType): DocType => {
      return {
        ...doc,
        id: doc.id || v4(),
        executingAllCells: false,
        cells: doc.cells.map((cell) => {
          const outputs =
            cell.outputs?.length > 0
              ? cell.outputs.map(normalizeOutput)
              : [
                  normalizeOutput({
                    protocol: '',
                    headers: {},
                    status: 0,
                    bodyFilePath: '',
                    bodyBase64: '',
                    body: [''],
                    formattedBody: '',
                    responseDate: 0,
                  }),
                ];

          const sendHistories =
            cell.sendHistories && cell.sendHistories.length
              ? cell.sendHistories.map((history) => ({
                  ...history,
                  id: history.id || v4(),
                  sentAt:
                    history.sentAt ||
                    history.outputs?.[0]?.responseDate ||
                    outputs[0]?.responseDate ||
                    0,
                  request: {
                    source: history.request?.source || cell.source || [''],
                    pre_scripts: history.request?.pre_scripts ||
                      cell.pre_scripts || [''],
                    post_scripts: history.request?.post_scripts ||
                      cell.post_scripts || [''],
                    pre_scripts_enabled:
                      history.request?.pre_scripts_enabled ??
                      cell.pre_scripts_enabled ??
                      false,
                    post_scripts_enabled:
                      history.request?.post_scripts_enabled ??
                      cell.post_scripts_enabled ??
                      false,
                  },
                  outputs:
                    history.outputs?.length > 0
                      ? history.outputs.map(normalizeOutput)
                      : outputs,
                }))
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
            cell.selectedResponseHistoryId &&
            sendHistories.some(
              (history) => history.id === cell.selectedResponseHistoryId,
            )
              ? cell.selectedResponseHistoryId
              : _.last(sendHistories)?.id;

          const selectedOutputs =
            sendHistories.find(
              (history) => history.id === selectedSendHistoryId,
            )?.outputs || outputs;

          return {
            ...cell,
            id: cell.id || v4(),
            cursor_position: {
              lineNumber: 1,
              column: 1,
              offset: 0,
            },
            outputs: selectedOutputs,
            sendHistories: sendHistories,
            selectedSendHistoryId,
          };
        }),
      };
    },
    (doc) => docSchema.parse(doc),
  )(docOnDisk);

  return parsed;
};
