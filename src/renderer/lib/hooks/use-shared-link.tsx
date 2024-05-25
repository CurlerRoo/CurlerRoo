import qs from 'qs';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  createDirectory,
  createFileWithContent,
  setSelectedSubDirectoryOrFile,
} from '../../state/features/selected-directory/selected-directory';
import { AppDispatch } from '../../state/store';
import { Services } from '@services';
import { DocOnDiskType } from '../../../shared/types';
import { v4 } from 'uuid';
import { ENDPOINT0 } from '../../../shared/constants/constants';
import { modal } from '../components/modal';

export const useSharedLink = () => {
  const query = qs.parse(document.location.search, { ignoreQueryPrefix: true });
  const key = query.sharedKey as string | undefined;
  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    (async () => {
      if (key) {
        const path = `/requests/shared`;
        const checkExistedFilePath = `${path}/${key}.crr`;
        const fileExisted =
          await Services.checkIfFileExists(checkExistedFilePath);
        if (!fileExisted) {
          if (!(await Services.checkIfFileExists(path))) {
            await dispatch(createDirectory({ path }));
          }
          dispatch(setSelectedSubDirectoryOrFile({ path, type: 'directory' }));

          const { document, error } = await fetch(`${ENDPOINT0}/share/${key}`)
            .then((res) => res.json())
            .then((m) => ({
              document: m.document as DocOnDiskType,
              error: null,
            }))
            .catch((e) => ({ error: e, document: null }));
          if (error || !document) {
            modal({
              content:
                'Error fetching shared document. The link may be invalid or expired.',
            });
            return;
          }

          const createResult = await dispatch(
            createFileWithContent({
              content: {
                ...document,
                id: document.id || v4(),
                shared_id: key,
                cells: document.cells.map((cell) => ({
                  ...cell,
                  cursor_position: {
                    column: 0,
                    lineNumber: 0,
                    offset: 0,
                  },
                  outputs: cell.outputs.map((output) => ({
                    ...output,
                    bodyFilePath: '',
                    bodyBase64: '',
                    showSearch: false,
                    formattedBody: '',
                  })),
                  id: cell.id || v4(),
                })),
                executingAllCells: false,
              },
              name: `${key}.crr`,
            }),
          ).then((m) => m.payload as ReturnType<typeof Services.createFile>);
          dispatch(
            setSelectedSubDirectoryOrFile({
              path: createResult.filePath,
              type: 'file',
            }),
          );
        } else {
          dispatch(
            setSelectedSubDirectoryOrFile({
              path: checkExistedFilePath,
              type: 'file',
            }),
          );
        }
      }
    })();
  }, [key, dispatch]);
};
