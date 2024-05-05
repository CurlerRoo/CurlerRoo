import { PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import _ from 'lodash';
import Bluebird from 'bluebird';
import { v4 } from 'uuid';
import { Services } from '@services';
import {
  CurlCellType,
  DocOnDiskType,
  Variable,
} from '../../../../shared/types';
import { getCurlParts } from '../../../../shared/get-curl-parts';
import { validateCurlSyntax } from '../../../../shared/validate-curl';

type RandomNumber = number;

export type ActiveDocumentState = null | {
  id: string;
  version: number;
  executingAllCells: boolean;
  cells: CurlCellType[];
  globalVariables: Variable[];
  activeCellIndex: number;
  forceRefocusActiveCell?: RandomNumber;
  filePath: string | null;
};

export const saveActiveDocument = createAsyncThunk<
  void,
  void,
  { state: { activeDocument: ActiveDocumentState } }
>('activeDocument/saveActiveDocument', async (__, thunkAPI) => {
  const state = thunkAPI.getState().activeDocument as ActiveDocumentState;
  if (!state) {
    throw new Error('No active document');
  }
  if (!state.filePath) {
    throw new Error('No file path');
  }
  await Services.writeFile(state.filePath, {
    id: state.id,
    cells: state.cells,
    version: state.version,
    globalVariables: state.globalVariables,
    type: 'notebook',
    executingAllCells: state.executingAllCells,
  });
});

export const executePreScript = createAsyncThunk<
  {
    variables: Variable[];
  },
  { cellIndex: number },
  { state: { activeDocument: ActiveDocumentState } }
>('activeDocument/executePreScript', async ({ cellIndex }, thunkAPI) => {
  const state = thunkAPI.getState().activeDocument as ActiveDocumentState;
  if (!state) {
    throw new Error('No active document');
  }
  const cell = state.cells[cellIndex];
  if (!cell.pre_scripts_enabled) {
    return {
      variables: [],
    };
  }
  return Services.executeScript({
    postScript: cell.pre_scripts.join('\n'),
    resBody: '',
    resHeaders: {},
  });
});

export const executePostScript = createAsyncThunk<
  {
    variables: Variable[];
  },
  {
    cellIndex: number;
    bodyText: string;
  },
  { state: { activeDocument: ActiveDocumentState } }
>(
  'activeDocument/executePostScript',
  async ({ cellIndex, bodyText }, thunkAPI) => {
    const state = thunkAPI.getState().activeDocument as ActiveDocumentState;
    if (!state) {
      throw new Error('No active document');
    }
    const cell = state.cells[cellIndex];
    if (!cell.post_scripts_enabled) {
      return {
        variables: [],
      };
    }
    return Services.executeScript({
      postScript: cell.post_scripts.join('\n'),
      resBody: bodyText,
      resHeaders: {},
    });
  },
);

export const sendCurl = createAsyncThunk<
  {
    responses: {
      protocol: string;
      status: number;
      headers: _.Dictionary<any>;
      bodyFilePath: string;
      bodyBase64: string;
      bodyText: string;
    }[];
  },
  { cellIndex: number; selectedDirectory: string },
  { state: { activeDocument: ActiveDocumentState } }
>(
  'activeDocument/sendCurl',
  async ({ cellIndex, selectedDirectory }, thunkAPI) => {
    const state = thunkAPI.getState().activeDocument as ActiveDocumentState;
    if (!state) {
      throw new Error('No active document');
    }

    const { variables: preScriptVariables } = await thunkAPI
      .dispatch(executePreScript({ cellIndex }))
      .unwrap();

    const cell = state.cells[cellIndex];
    const responses = await Promise.race([
      Services.sendCurl({
        curlRequest: cell.source.join('\n'),
        variables: _([...preScriptVariables, ...state.globalVariables])
          .uniqBy('key')
          .value(),
        selectedDirectory,
      }).catch((error) => {
        throw new Error(
          error.message?.replace(
            `Error invoking remote method 'dialog:sendCurl': `,
            '',
          ),
        );
      }),
      new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Request timed out'));
        }, 30000);
      }),
    ])
      .then(
        (responses) =>
          responses as Awaited<ReturnType<typeof Services.sendCurl>>,
      )
      .then((responses) =>
        responses.map((response) => {
          return {
            ...response,
            bodyFilePath: response.bodyFilePath,
            bodyText: response.body,
          };
        }),
      );

    if (!state) {
      throw new Error('No active document');
    }

    const bodyText = _.last(responses)?.bodyText;
    if (bodyText) {
      await thunkAPI
        .dispatch(executePostScript({ cellIndex, bodyText }))
        .unwrap()
        .catch(() => {
          return {
            variables: [],
          };
        });
    }

    return {
      responses,
    };
  },
);

export const validateCellAndSendCurl = createAsyncThunk<
  {
    responses: {
      protocol: string;
      status: number;
      headers: _.Dictionary<any>;
      bodyFilePath: string;
      bodyBase64: string;
      bodyText: string;
    }[];
  },
  { cellIndex: number; selectedDirectory: string },
  { state: { activeDocument: ActiveDocumentState } }
>(
  'activeDocument/validateCellAndSendCurl',
  async ({ cellIndex, selectedDirectory }, thunkAPI) => {
    const state = thunkAPI.getState().activeDocument as ActiveDocumentState;
    if (!state) {
      throw new Error('No active document');
    }
    const cell = state.cells[cellIndex];

    const curlParts = getCurlParts(cell.source.join('\n'));
    const curlValidationResult = validateCurlSyntax({ parts: curlParts });

    if (curlValidationResult.length > 0) {
      throw new Error(curlValidationResult[0].errorMessage);
    }

    const { responses } = await thunkAPI
      .dispatch(sendCurl({ cellIndex, selectedDirectory }))
      .unwrap();
    return {
      responses,
    };
  },
);

export const setExecutingAllCells = createAsyncThunk<
  boolean,
  boolean,
  { state: { activeDocument: ActiveDocumentState } }
>(
  'activeDocument/setExecutingAllCells',
  async (executingAllCells, thunkAPI) => {
    const state = thunkAPI.getState().activeDocument as ActiveDocumentState;
    if (!state) {
      throw new Error('No active document');
    }
    return executingAllCells;
  },
);

export const sendAllCurls = createAsyncThunk<
  Promise<void>,
  { selectedDirectory: string },
  { state: { activeDocument: ActiveDocumentState } }
>('activeDocument/sendAllCurls', async ({ selectedDirectory }, thunkAPI) => {
  const state = thunkAPI.getState().activeDocument as ActiveDocumentState;
  if (!state) {
    throw new Error('No active document');
  }
  await thunkAPI.dispatch(setExecutingAllCells(true));
  await Bluebird.mapSeries(state.cells, async (cell, cellIndex) => {
    const filePathHasNotChanged =
      thunkAPI.getState().activeDocument?.filePath === state.filePath;
    const executingAllCells =
      thunkAPI.getState().activeDocument?.executingAllCells;
    if (
      cell.cell_type === 'curl' &&
      executingAllCells &&
      filePathHasNotChanged
    ) {
      await thunkAPI.dispatch(sendCurl({ cellIndex, selectedDirectory }));
    }
  });
});

const initialState = {
  id: v4(),
  version: 2,
  executingAllCells: false,
  cells: [
    {
      id: v4(),
      cell_type: 'curl',
      cursor_position: {
        lineNumber: 1,
        column: 1,
        offset: 0,
      },
      execution_count: 0,
      metadata: {
        collapsed: false,
        jupyter: {
          source_hidden: false,
        },
      },
      outputs: [
        {
          protocol: '',
          bodyFilePath: '',
          bodyBase64: '',
          body: [''],
          headers: {},
          status: 0,
          showSearch: false,
          responseDate: 0,
          formattedBody: '',
        },
      ],
      source: [''],
      pre_scripts_enabled: false,
      pre_scripts: [''],
      post_scripts_enabled: false,
      post_scripts: [''],
      send_status: 'idle',
    },
  ],
  filePath: null,
  globalVariables: [],
  activeCellIndex: 0,
} as ActiveDocumentState;

export const activeDocumentSlice = createSlice({
  name: 'activeDocument',
  initialState,
  reducers: {
    setCellName: (
      state,
      action: PayloadAction<{ cellIndex: number; name: string }>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.cells[action.payload.cellIndex].name = action.payload.name;
    },
    forceRefocusActiveCell: (state) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.forceRefocusActiveCell = Math.random();
    },
    setFormattedBody: (
      state,
      action: PayloadAction<{
        cellIndex: number;
        formattedBody: string;
      }>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      const cell = state.cells[action.payload.cellIndex];
      const lastOutput = _.last(cell.outputs);
      if (!lastOutput) {
        return;
      }
      lastOutput.formattedBody = action.payload.formattedBody;
    },
    moveCellUp: (state, action: PayloadAction<number>) => {
      if (!state) {
        throw new Error('No active document');
      }
      if (action.payload === 0) {
        return;
      }
      const cell = state.cells[action.payload];
      state.cells.splice(action.payload, 1);
      state.cells.splice(action.payload - 1, 0, cell);
      if (state.activeCellIndex === action.payload) {
        state.activeCellIndex = action.payload - 1;
      } else if (state.activeCellIndex === action.payload - 1) {
        state.activeCellIndex = action.payload;
      }
    },
    moveCellDown: (state, action: PayloadAction<number>) => {
      if (!state) {
        throw new Error('No active document');
      }
      if (action.payload === state.cells.length - 1) {
        return;
      }
      const cell = state.cells[action.payload];
      state.cells.splice(action.payload, 1);
      state.cells.splice(action.payload + 1, 0, cell);
      if (state.activeCellIndex === action.payload) {
        state.activeCellIndex = action.payload + 1;
      } else if (state.activeCellIndex === action.payload + 1) {
        state.activeCellIndex = action.payload;
      }
    },
    setActiveCellIndex: (state, action: PayloadAction<number>) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.activeCellIndex = action.payload;
    },
    addCell: (
      state,
      action: PayloadAction<{ cell: CurlCellType; cellIndex: number }>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      // add cell at index
      state.cells.splice(action.payload.cellIndex, 0, action.payload.cell);
    },
    removeCell: (state, action: PayloadAction<number>) => {
      if (!state) {
        throw new Error('No active document');
      }
      if (action.payload === state.cells.length - 1) {
        state.activeCellIndex = action.payload - 1;
      }
      state.cells.splice(action.payload, 1);
    },
    updateCell: (
      state,
      action: PayloadAction<{ cellIndex: number; cell: CurlCellType }>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.cells[action.payload.cellIndex] = action.payload.cell;
    },
    appendToCellPostScript: (
      state,
      action: PayloadAction<{ cellIndex: number; postScript: string }>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      if (
        !state.cells[action.payload.cellIndex].post_scripts.filter(Boolean)
          .length
      ) {
        state.cells[action.payload.cellIndex].post_scripts = [
          action.payload.postScript,
        ];
        state.cells[action.payload.cellIndex].post_scripts_enabled = true;
        return;
      }
      state.cells[action.payload.cellIndex].post_scripts.push(
        action.payload.postScript,
      );
      state.cells[action.payload.cellIndex].post_scripts_enabled = true;
    },
    setFilePath: (state, action: PayloadAction<string>) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.filePath = action.payload;
    },
    setActiveDocument: (state, action: PayloadAction<ActiveDocumentState>) => {
      return action.payload;
    },
    clearOutputs: (state, action: PayloadAction<{ cellIndex: number }>) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.cells[action.payload.cellIndex].send_status = 'idle';
      state.cells[action.payload.cellIndex].outputs = [
        {
          protocol: '',
          bodyFilePath: '',
          bodyBase64: '',
          body: [''],
          headers: {},
          status: 0,
          showSearch: false,
          responseDate: 0,
          formattedBody: '',
        },
      ];
    },
    cancelSend: (state, action: PayloadAction<{ cellIndex: number }>) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.cells[action.payload.cellIndex].send_status = 'idle';
      state.cells[action.payload.cellIndex].sending_id = undefined;
      state.executingAllCells = false;
    },
    addVariable: (state, action: PayloadAction<{ variable: Variable }>) => {
      if (!state) {
        throw new Error('No active document');
      }
      if (action.payload.variable.key.startsWith('_')) {
        throw new Error('Cannot add variable starting with _');
      }
      state.globalVariables = _([
        action.payload.variable,
        ...state.globalVariables,
      ])
        .uniqBy('key')
        .sortBy('key')
        .value();
    },
    deleteVariable: (state, action: PayloadAction<{ variable: Variable }>) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.globalVariables = _.filter(
        state.globalVariables,
        (variable) => variable.key !== action.payload.variable.key,
      );
    },
    clearVariables: (state) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.globalVariables = [];
    },
    addFile: (
      state,
      action: PayloadAction<{ cellIndex: number; filePath: string }>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      const cell = state.cells[action.payload.cellIndex];
      cell.source = [...cell.source, `@${action.payload.filePath}`];
    },
    setOutputsSearchResult: (
      state,
      action: PayloadAction<{
        cellIndex: number;
        outputsSearchResult: {
          start: number;
          end: number;
          index: number;
        }[];
      }>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      const lastOutput = _.last(state.cells[action.payload.cellIndex].outputs);
      if (!lastOutput) {
        return;
      }
      lastOutput.searchResult = action.payload.outputsSearchResult;
      if (
        lastOutput.searchResultSelectedIndex &&
        lastOutput.searchResultSelectedIndex >= lastOutput.searchResult.length
      ) {
        lastOutput.searchResultSelectedIndex = undefined;
      }
    },
    selectNextOutputsSearchResult: (
      state,
      action: PayloadAction<{ cellIndex: number }>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      const cell = state.cells[action.payload.cellIndex];
      if (!_.last(cell.outputs)?.searchResult?.length) {
        return;
      }
      if (_.last(cell.outputs)?.searchResultSelectedIndex == null) {
        _.last(cell.outputs)!.searchResultSelectedIndex = 0;
        return;
      }
      const newSelectedIndex = _.flow(
        (index: number) => index + 1,
        (index) => index % _.last(cell.outputs)!.searchResult!.length,
      )(_.last(cell.outputs)!.searchResultSelectedIndex!);
      _.last(cell.outputs)!.searchResultSelectedIndex = newSelectedIndex;
    },
    selectPreviousOutputsSearchResult: (
      state,
      action: PayloadAction<{ cellIndex: number }>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      const cell = state.cells[action.payload.cellIndex];
      if (!_.last(cell.outputs)?.searchResult?.length) {
        return;
      }
      if (_.last(cell.outputs)?.searchResultSelectedIndex == null) {
        _.last(cell.outputs)!.searchResultSelectedIndex =
          _.last(cell.outputs)!.searchResult!.length - 1;
        return;
      }
      const newSelectedIndex = _.flow(
        (index: number) => index - 1,
        (index) =>
          index < 0 ? _.last(cell.outputs)!.searchResult!.length - 1 : index,
      )(_.last(cell.outputs)!.searchResultSelectedIndex!);
      _.last(cell.outputs)!.searchResultSelectedIndex = newSelectedIndex;
    },
    setShowSearch: (
      state,
      action: PayloadAction<{
        cellIndex: number;
        showSearch: boolean;
      }>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      const cell = state.cells[action.payload.cellIndex];
      _.last(cell.outputs)!.showSearch = action.payload.showSearch;
    },
    clearSearch: (state, action: PayloadAction<{ cellIndex: number }>) => {
      if (!state) {
        throw new Error('No active document');
      }
      const cell = state.cells[action.payload.cellIndex];
      _.last(cell.outputs)!.searchResult = undefined;
      _.last(cell.outputs)!.searchResultSelectedIndex = undefined;
      _.last(cell.outputs)!.showSearch = false;
    },
    reset: () => initialState,
    setCursorPosition: (
      state,
      action: PayloadAction<{
        cellIndex: number;
        cursorPosition: {
          offset: number;
          lineNumber: number;
          column: number;
        };
      }>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.cells[action.payload.cellIndex].cursor_position =
        action.payload.cursorPosition;
    },
  },
  extraReducers: (builder) => {
    const sendCurlPending = (
      state: ActiveDocumentState,
      action: ReturnType<typeof sendCurl.pending>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.activeCellIndex = action.meta.arg.cellIndex;
      const cell = state.cells[action.meta.arg.cellIndex];
      cell.send_status = 'sending';
      cell.sending_id = action.meta.requestId;
    };
    builder.addCase(sendCurl.pending, sendCurlPending);
    builder.addCase(validateCellAndSendCurl.pending, sendCurlPending);

    const sendCurlRejected = (
      state: ActiveDocumentState,
      action: ReturnType<typeof sendCurl.rejected>,
    ) => {
      if (!state) {
        throw new Error('No active document');
      }
      const cell = state.cells[action.meta.arg.cellIndex];
      if (cell.sending_id !== action.meta.requestId) {
        return;
      }
      cell.send_status = 'error';
      cell.sending_id = undefined;
      cell.outputs = [
        {
          protocol: '',
          bodyFilePath: '',
          bodyBase64: '',
          body: (
            action.error.message?.replace(
              `Error invoking remote method 'dialog:executeScript': `,
              '',
            ) || 'Error sending request'
          ).split('\n'),
          formattedBody: '',
          headers: {},
          status: 0,
          showSearch: false,
          responseDate: 0,
        },
      ];
    };
    builder.addCase(sendCurl.rejected, sendCurlRejected);
    builder.addCase(validateCellAndSendCurl.rejected, sendCurlRejected);

    const sendCurlFulfilled = (
      state: ActiveDocumentState,
      action: ReturnType<typeof sendCurl.fulfilled>,
    ) => {
      (async () => {
        if (!state) {
          throw new Error('No active document');
        }
        const cell = state.cells[action.meta.arg.cellIndex];
        if (cell.sending_id !== action.meta.requestId) {
          return;
        }
        const { responses } = action.payload;

        cell.send_status = 'success';
        cell.sending_id = undefined;
        cell.outputs = responses.map((response) => ({
          protocol: response.protocol,
          bodyFilePath: response.bodyFilePath,
          bodyBase64: response.bodyBase64,
          body: response.bodyText.split('\n'),
          formattedBody: '',
          headers: response.headers,
          status: response.status,
          showSearch: false,
          responseDate: Date.now(),
        }));
      })();
    };
    builder.addCase(sendCurl.fulfilled, sendCurlFulfilled);
    builder.addCase(validateCellAndSendCurl.fulfilled, sendCurlFulfilled);

    builder.addCase(setExecutingAllCells.fulfilled, (state, action) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.executingAllCells = action.payload;
    });

    builder.addCase(executePreScript.fulfilled, (state, action) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.globalVariables = _([
        ...action.payload.variables,
        ...state.globalVariables,
      ])
        .filter((variable) => !variable.key.startsWith('_'))
        .uniqBy('key')
        .sortBy('key')
        .value();
      state.cells[state.activeCellIndex].pre_scripts_error = '';
      state.cells[state.activeCellIndex].pre_scripts_status = 'success';
    });

    builder.addCase(executePreScript.rejected, (state, action) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.cells[state.activeCellIndex].pre_scripts_error =
        action.error.message?.replace(
          `Error invoking remote method 'dialog:executeScript': `,
          '',
        );
      state.cells[state.activeCellIndex].pre_scripts_status = 'error';
    });

    builder.addCase(executePreScript.pending, (state) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.cells[state.activeCellIndex].pre_scripts_status = 'sending';
    });

    builder.addCase(executePostScript.fulfilled, (state, action) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.globalVariables = _([
        ...action.payload.variables,
        ...state.globalVariables,
      ])
        .filter((variable) => !variable.key.startsWith('_'))
        .uniqBy('key')
        .sortBy('key')
        .value();
      state.cells[state.activeCellIndex].post_scripts_error = '';
      state.cells[state.activeCellIndex].post_scripts_status = 'success';
    });

    builder.addCase(executePostScript.rejected, (state, action) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.cells[state.activeCellIndex].post_scripts_error =
        action.error.message?.replace(
          `Error invoking remote method 'dialog:executeScript': `,
          '',
        );
      state.cells[state.activeCellIndex].post_scripts_status = 'error';
    });

    builder.addCase(executePostScript.pending, (state) => {
      if (!state) {
        throw new Error('No active document');
      }
      state.cells[state.activeCellIndex].post_scripts_status = 'sending';
    });
  },
});

export const {
  setFormattedBody,
  moveCellUp,
  moveCellDown,
  addCell,
  removeCell,
  updateCell,
  appendToCellPostScript,
  setActiveCellIndex,
  setFilePath,
  setActiveDocument,
  clearOutputs,
  cancelSend,
  addVariable,
  deleteVariable,
  clearVariables,
  addFile,
  setShowSearch,
  clearSearch,
  reset,
  setCursorPosition,
  forceRefocusActiveCell,
  setCellName,
} = activeDocumentSlice.actions;
