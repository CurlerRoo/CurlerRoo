import qs from 'qs';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createDirectory,
  createFileWithContent,
  setSelectedSubDirectoryOrFile,
} from '../../state/features/selected-directory/selected-directory';
import { AppDispatch, RootState } from '../../state/store';
import { Services } from '@services';
import { DocOnDiskType } from '../../../shared/types';
import { v4 } from 'uuid';
import { ENDPOINT0 } from '../../../shared/constants/constants';
import { modal } from '../components/modal';
import { useSearchParams } from 'react-router-dom';

export const useSharedLink = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch: AppDispatch = useDispatch();
  const { selectedDirectory } = useSelector(
    (state: RootState) => state.selectedDirectory,
  );

  const sharedKey = searchParams.get('sharedKey');
  useEffect(() => {
    (async () => {
      if (sharedKey && selectedDirectory) {
        try {
          const path = `${selectedDirectory}/shared`;
          const checkExistedFilePath = `${path}/${sharedKey}.crr`;
          const fileExisted =
            await Services.checkIfFileExists(checkExistedFilePath);
          if (!fileExisted) {
            const { document, error } = await fetch(
              `${ENDPOINT0}/share/${sharedKey}`,
            )
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

            if (!(await Services.checkIfFileExists(path))) {
              await dispatch(createDirectory({ path }));
            }
            dispatch(
              setSelectedSubDirectoryOrFile({ path, type: 'directory' }),
            );

            const createResult = await dispatch(
              createFileWithContent({
                content: {
                  ...document,
                  id: document.id || v4(),
                  shared_id: sharedKey,
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
                      formattedBody: '',
                    })),
                    id: cell.id || v4(),
                  })),
                  executingAllCells: false,
                },
                name: `${sharedKey}.crr`,
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
        } finally {
          setSearchParams((searchParams) => {
            searchParams.delete('sharedKey');
            return searchParams;
          });
        }
      }
    })();
  }, [sharedKey, dispatch, selectedDirectory, searchParams, setSearchParams]);
};
