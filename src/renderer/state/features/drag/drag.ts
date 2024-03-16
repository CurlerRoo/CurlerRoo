import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type DragState = {
  dragFromDirectory?: string;
  dragToDirectories: {
    [key: string]: number;
  };
  dragToCells: {
    [key: string]: number;
  };
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
  addDragToCells,
  removeDragToCells,
  reset,
} = dragSlice.actions;

export default dragSlice.reducer;
