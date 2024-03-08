import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import { Services } from '@services';
import { activeDocumentSlice } from './features/documents/active-document';
import {
  fixSelectedSubDirectoryOrFile,
  selectedDirectorySlice,
} from './features/selected-directory/selected-directory';
import { dragSlice } from './features/drag/drag';
import { userSlice } from './features/user/user';
import { updatesSlice } from './features/updates/updates';
import { debugLog } from '../../shared/utils';

const persistedSelectedDirectorySliceReducer = persistReducer(
  {
    key: selectedDirectorySlice.name,
    storage: {
      getItem: (key) => Services.get(key),
      setItem: (key, value) => Services.set(key, value),
      removeItem: (key) => Services.delete(key),
    },
  },
  selectedDirectorySlice.reducer,
);

const persistedUserSliceReducer = persistReducer(
  {
    key: userSlice.name,
    storage: {
      getItem: (key) => Services.get(key),
      setItem: (key, value) => Services.set(key, value),
      removeItem: (key) => Services.delete(key),
    },
  },
  userSlice.reducer,
);

const persistedUpdatesSliceReducer = persistReducer(
  {
    key: updatesSlice.name,
    storage: {
      getItem: (key) => Services.get(key),
      setItem: (key, value) => Services.set(key, value),
      removeItem: (key) => Services.delete(key),
    },
  },
  updatesSlice.reducer,
);

export const store = configureStore({
  reducer: {
    [activeDocumentSlice.name]: activeDocumentSlice.reducer,
    [selectedDirectorySlice.name]: persistedSelectedDirectorySliceReducer,
    [userSlice.name]: persistedUserSliceReducer,
    [dragSlice.name]: dragSlice.reducer,
    [updatesSlice.name]: persistedUpdatesSliceReducer,
  },
  middleware: (getDefaultMiddleware) => {
    const middlewares = getDefaultMiddleware({
      serializableCheck: false,
    });
    // add logger
    middlewares.push((api) => (next) => (action) => {
      debugLog('dispatching', action);
      return next(action);
    });
    return middlewares;
  },
});

export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;

// dispatch fixSelectedSubDirectoryOrFile every 5 seconds
// TODO: find a better way to do this
setInterval(() => {
  store.dispatch(fixSelectedSubDirectoryOrFile());
}, 5000);
