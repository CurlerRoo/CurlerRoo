import { useDispatch } from 'react-redux';
import { Services } from '@services';
import { COLORS, THEME } from '@constants';
import {
  createFileWithContent,
  setSelectedSubDirectoryOrFile,
} from '../../state/features/selected-directory/selected-directory';
import { exampleDocument } from '../../../shared/example-document';
import { AppDispatch } from '../../state/store';

export function PostScriptsTutorial({
  onExampleDocumentCreated,
}: {
  onExampleDocumentCreated: () => void;
}) {
  const dispatch: AppDispatch = useDispatch();

  return (
    <div>
      <p>
        You can use Javascript to create variables or extract data from the
        response
      </p>
      <p>
        <span
          style={{
            textDecoration: 'underline',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: `#${COLORS[THEME].BLUE}`,
          }}
          onClick={async () => {
            const createResult = await dispatch(
              createFileWithContent({ content: exampleDocument }),
            ).then(
              (m) =>
                m.payload as Awaited<ReturnType<typeof Services.createFile>>,
            );

            dispatch(
              setSelectedSubDirectoryOrFile({
                path: createResult.filePath,
                type: 'file',
              }),
            );

            onExampleDocumentCreated();
          }}
        >
          Create an example document
        </span>{' '}
        to learn more about it
      </p>
    </div>
  );
}
