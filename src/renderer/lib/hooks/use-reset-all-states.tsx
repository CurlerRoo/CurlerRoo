import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { reset as resetActiveDocument } from '../../state/features/documents/active-document';
import { reset as resetSelectedDirectory } from '../../state/features/selected-directory/selected-directory';
import { reset as resetUser } from '../../state/features/user/user';
import { reset as resetDrag } from '../../state/features/drag/drag';
import { reset as resetUpdates } from '../../state/features/updates/updates';

export const useResetAllStates = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(resetActiveDocument());
    dispatch(resetSelectedDirectory());
    dispatch(resetUser());
    dispatch(resetDrag());
    dispatch(resetUpdates());
  }, [dispatch]);
};
