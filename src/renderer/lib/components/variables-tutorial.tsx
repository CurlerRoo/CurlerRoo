import { useDispatch } from 'react-redux';
import { Services } from '@services';
import { useColors } from '../contexts/theme-context';
import { exampleDocument } from '../../../shared/example-document';
import {
  createFileWithContent,
  setSelectedSubDirectoryOrFile,
} from '../../state/features/selected-directory/selected-directory';
import { AppDispatch } from '../../state/store';

export function ShowVariablesTutorialLevel2({
  onExampleDocumentCreated,
}: {
  onExampleDocumentCreated: () => void;
}) {
  const colors = useColors();
  const dispatch: AppDispatch = useDispatch();

  return (
    <div style={{ width: '100%', lineHeight: '1.35rem' }}>
      <p>
        You can use cURL command with variables, the syntax for using variables
        is as same as using variables in Bash scripts or PowerShell scripts.
      </p>
      <p>
        <span
          style={{
            textDecoration: 'underline',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: `#${colors.PRIMARY}`,
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

export const ShowVariablesTutorialLevel1 = ({
  onExampleDocumentCreated,
}: {
  onExampleDocumentCreated: () => void;
}) => {
  const colors = useColors();
  const dispatch: AppDispatch = useDispatch();

  return (
    <div style={{ width: '100%', lineHeight: '1.35rem' }}>
      <p>
        Variables are useful for storing values that you want to use in multiple
        cells.
      </p>
      <p>
        <span
          style={{
            textDecoration: 'underline',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: `#${colors.PRIMARY}`,
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
};
