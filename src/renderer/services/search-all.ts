import Bluebird from 'bluebird';
import { DirectoryTree } from '../../shared/file-interface';
import { Services } from '@services';
import _ from 'lodash';

export const searchAll = async ({
  text,
  selectedDirectoryInfo,
  includeHistories = true,
}: {
  text: string;
  selectedDirectoryInfo: DirectoryTree;
  includeHistories?: boolean;
}) => {
  const walk = (dir: DirectoryTree): string[] => {
    let results: string[] = [];
    dir.children?.forEach((child) => {
      if (!child.children) {
        results.push(child.path);
      } else {
        results = results.concat(walk(child));
      }
    });
    return results;
  };
  const paths = walk(selectedDirectoryInfo);
  const searchResults: {
    filePath: string;
    cellIndex: number;
    previewText: [string, string, string];
    historyId?: string;
    sentAt?: number;
  }[] = [];
  await Bluebird.map(
    paths,
    async (path) => {
      const file = await Services.readFile(path);
      const cells = file.parsed?.cells;
      if (!cells) {
        return;
      }
      cells.forEach((cell, cellIndex) => {
        const source = cell.source.join('\n');

        // Sort histories by sentAt (most recent first)
        const sortedHistories = [...(cell.sendHistories || [])].sort(
          (a, b) => (b.sentAt || 0) - (a.sentAt || 0),
        );

        // Track outputs with their history IDs
        const outputBodiesWithHistory: Array<{
          body: string;
          historyId?: string;
          sentAt?: number;
        }> = [
          ...sortedHistories.flatMap((history) =>
            history.outputs.map((output) => ({
              body: output.body.join('\n'),
              historyId: history.id,
              sentAt: history.sentAt,
            })),
          ),
        ];

        const beforeScript = cell.pre_scripts_enabled
          ? cell.pre_scripts.join('\n')
          : '';
        const afterScript = cell.post_scripts_enabled
          ? cell.post_scripts.join('\n')
          : '';
        const name = cell.name || '';

        // Extract source, beforeScript, and afterScript from history with their IDs
        const historySources = sortedHistories.map((history) => ({
          body: history.request?.source?.join('\n') || '',
          historyId: history.id,
          sentAt: history.sentAt,
        }));
        const historyBeforeScripts = sortedHistories.map((history) => ({
          body: history.request?.pre_scripts_enabled
            ? history.request?.pre_scripts?.join('\n') || ''
            : '',
          historyId: history.id,
          sentAt: history.sentAt,
        }));
        const historyAfterScripts = sortedHistories.map((history) => ({
          body: history.request?.post_scripts_enabled
            ? history.request?.post_scripts?.join('\n') || ''
            : '',
          historyId: history.id,
          sentAt: history.sentAt,
        }));

        const searchItems: Array<{
          body: string;
          historyId?: string;
          sentAt?: number;
        }> = [
          ...(includeHistories ? outputBodiesWithHistory : []),
          ...(includeHistories ? historySources : []),
          ...(includeHistories ? historyBeforeScripts : []),
          ...(includeHistories ? historyAfterScripts : []),
          ...(cell.outputs || []).map((output) => ({
            body: output.body.join('\n'),
            historyId: undefined,
            sentAt: undefined,
          })),
          { body: source, historyId: undefined, sentAt: undefined },
          { body: beforeScript, historyId: undefined, sentAt: undefined },
          { body: afterScript, historyId: undefined, sentAt: undefined },
          { body: name, historyId: undefined, sentAt: undefined },
        ];

        const cellSearchResults: Array<{
          filePath: string;
          cellIndex: number;
          previewText: [string, string, string];
          historyId?: string;
          sentAt?: number;
        }> = [];

        searchItems.forEach((item) => {
          const index = item.body.toLowerCase().indexOf(text.toLowerCase());
          if (index !== -1) {
            cellSearchResults.push({
              filePath: path,
              cellIndex,
              previewText: [
                item.body.slice(index - 30, index),
                item.body.slice(index, index + text.length),
                item.body.slice(index + text.length, index + text.length + 30),
              ],
              historyId: item.historyId,
              sentAt: item.sentAt,
            });
          }
        });

        // Sort: current version first, then historical (most recent first)
        cellSearchResults.sort((a, b) => {
          // Current version items (no sentAt) come first
          if (a.sentAt === undefined && b.sentAt === undefined) {
            return 0;
          }
          if (a.sentAt === undefined) return -1;
          if (b.sentAt === undefined) return 1;
          // Among historical items, sort by sentAt descending (most recent first)
          return b.sentAt - a.sentAt;
        });

        // Keep sentAt in results for display
        searchResults.push(...cellSearchResults);
      });
    },
    {
      concurrency: 1,
    },
  );

  return searchResults;
};
