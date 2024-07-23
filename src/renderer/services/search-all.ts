import Bluebird from 'bluebird';
import { DirectoryTree } from '../../shared/file-interface';
import { Services } from '@services';

export const searchAll = async ({
  text,
  selectedDirectoryInfo,
}: {
  text: string;
  selectedDirectoryInfo: DirectoryTree;
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
        const outputBodies = cell.outputs.map((output) =>
          output.body.join('\n'),
        );
        const beforeScript = cell.pre_scripts_enabled
          ? cell.pre_scripts.join('\n')
          : '';
        const afterScript = cell.post_scripts_enabled
          ? cell.post_scripts.join('\n')
          : '';
        const name = cell.name || '';
        outputBodies
          .concat([source, beforeScript, afterScript, name])
          .forEach((outputBody, outputIndex) => {
            const index = outputBody.toLowerCase().indexOf(text.toLowerCase());
            if (index !== -1) {
              searchResults.push({
                filePath: path,
                cellIndex,
                previewText: [
                  outputBody.slice(index - 30, index),
                  outputBody.slice(index, index + text.length),
                  outputBody.slice(
                    index + text.length,
                    index + text.length + 30,
                  ),
                ],
              });
            }
          });
      });
    },
    {
      concurrency: 1,
    },
  );

  return searchResults;
};
