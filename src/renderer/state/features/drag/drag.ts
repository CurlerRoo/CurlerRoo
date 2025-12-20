import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type DragState = {
  dragFromDirectory?: string;
  dragToDirectories: {
    [key: string]: number;
  };
  dragToCells: {
    [key: string]: number;
  };
  // Track drag position for reordering within same directory
  dragOverItemPath?: string;
  dragOverItemIndex?: number;
  // Track whether to drop above or below the item ('above' | 'below' | undefined)
  dragDropPosition?: 'above' | 'below';
};

const initialState = {
  dragToDirectories: {},
  dragToCells: {},
} as DragState;

export const dragSlice = createSlice({
  name: 'drag',
  initialState,
  reducers: {
    setDragFromDirectory: (state, action: PayloadAction<string>) => {
      state.dragFromDirectory = action.payload;
      // reset dragToDirectories when dragFromDirectory is set
      state.dragToDirectories = {};
      state.dragToCells = {};
      state.dragOverItemPath = undefined;
      state.dragOverItemIndex = undefined;
    },
    setDragOverItem: (
      state,
      action: PayloadAction<{
        itemPath?: string;
        itemIndex?: number;
        dropPosition?: 'above' | 'below';
      }>,
    ) => {
      state.dragOverItemPath = action.payload.itemPath;
      state.dragOverItemIndex = action.payload.itemIndex;
      state.dragDropPosition = action.payload.dropPosition;
    },
    resetDrag: (state) => {
      state.dragFromDirectory = undefined;
      state.dragToDirectories = {};
      state.dragToCells = {};
      state.dragOverItemPath = undefined;
      state.dragOverItemIndex = undefined;
      state.dragDropPosition = undefined;
    },
    addDragToDirectories: (state, action: PayloadAction<string>) => {
      state.dragToDirectories = {
        ...state.dragToDirectories,
        [action.payload]: (state.dragToDirectories?.[action.payload] ?? 0) + 1,
      };
    },
    removeDragToDirectories: (state, action: PayloadAction<string>) => {
      if (!state.dragToDirectories) {
        return;
      }
      state.dragToDirectories = {
        ...state.dragToDirectories,
        [action.payload]: state.dragToDirectories[action.payload] - 1,
      };
    },
    addDragToCells: (state, action: PayloadAction<string>) => {
      state.dragToCells = {
        ...state.dragToCells,
        [action.payload]: (state.dragToCells?.[action.payload] ?? 0) + 1,
      };
    },
    removeDragToCells: (state, action: PayloadAction<string>) => {
      if (!state.dragToCells) {
        return;
      }
      state.dragToCells = {
        ...state.dragToCells,
        [action.payload]: state.dragToCells[action.payload] - 1,
      };
    },
    reset: () => initialState,
  },
});

export const {
  addDragToDirectories,
  removeDragToDirectories,
  setDragFromDirectory,
  setDragOverItem,
  addDragToCells,
  removeDragToCells,
  reset,
  resetDrag,
} = dragSlice.actions;

export default dragSlice.reducer;
