import fs from 'fs-extra';
import { readFile } from '@file';
import { createNewStore } from '../renderer/state/store';
import {
  sendAllCurls,
  setActiveDocument,
} from '../renderer/state/features/documents/active-document';
import path from 'path';
import { globSync } from 'glob';
import Bluebird from 'bluebird';
import { execShPromise } from '../main/lib/exec-sh';

// get input file from command line

const main = async () => {
  // check if curl is installed
  await execShPromise('curl --version', true).catch((e) => {
    console.error('Error: curl is not installed');
    process.exit(1);
  });

  const workingDirectory = path.resolve(process.argv[2]);

  const files = globSync(`${workingDirectory}/**/*.crr`);

  const results = await Bluebird.map(
    files,
    async (crrFilePath) => {
      try {
        const { parsed: document, type } = await readFile(crrFilePath);
        if (type !== 'valid' || !document) {
          throw new Error(`Invalid file: ${crrFilePath}`);
        }
        const store = createNewStore();
        store.dispatch(
          setActiveDocument({
            id: document.id,
            shared_id: document.shared_id,
            version: 2,
            filePath: crrFilePath,
            executingAllCells: document.executingAllCells,
            cells: document.cells.map((cell) => ({
              ...cell,
              outputs: cell.outputs.map((output) => ({
                ...output,
                formattedBody: '',
              })),
            })),
            globalVariables: document.globalVariables,
            activeCellIndex: 0,
          }),
        );
        store.dispatch(
          sendAllCurls({
            selectedDirectory: workingDirectory,
          }),
        );
        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });

        while (Math.random() + 2) {
          const cells = store.getState().activeDocument?.cells;
          if (cells?.every((cell) => cell.send_status !== 'sending')) {
            break;
          } else {
            await new Promise((resolve) => {
              setTimeout(resolve, 10);
            });
          }
        }

        const outputFolder = crrFilePath
          .replace(
            workingDirectory,
            `${workingDirectory}/curlerroo-cli-output/`,
          )
          .replace(/\.crr$/, '');
        const activeDocument = store.getState().activeDocument;

        if (!activeDocument) {
          throw new Error(`Error: ${crrFilePath}: No active document`);
        }

        const results = activeDocument.cells.map((cell, i) => {
          fs.mkdirSync(outputFolder, { recursive: true });
          fs.writeFileSync(
            path.join(outputFolder, `cell-${i}.json`),
            JSON.stringify(cell, null, 2),
          );
          if (
            cell.send_status === 'error' ||
            cell.pre_scripts_error ||
            cell.post_scripts_error
          ) {
            const message = `${crrFilePath}#${i}: Error: ${
              cell.pre_scripts_error ||
              cell.post_scripts_error ||
              cell.outputs.flatMap((output) => output.body).join('.')
            }`;
            console.log(message);
            return {
              success: false,
              message,
            };
          }
          const message = `${crrFilePath}#${i}: Success`;
          console.log(message);
          return {
            success: true,
            message,
          };
        });
        return results;
      } catch (e) {
        const error = e as Error;
        const message = `${crrFilePath}: Error: ${error.message}`;
        console.log(message);
        return {
          success: false,
          message,
        };
      }
    },
    {
      concurrency: 4,
    },
  ).then((m) => m.flat());

  console.log('\nTotal:', results.length);
  console.log('Success:', results.filter((result) => result.success).length);
  console.log('Failed:', results.filter((result) => !result.success).length);
  console.log('See output in:', `${workingDirectory}/curlerroo-cli-output`);

  if (results.some((result) => !result.success)) {
    console.log('Process exited with error');
    process.exit(1);
  }
  console.log('Process exited successfully');
  process.exit(0);
};

main();
