import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useRef, useState } from 'react';
import Notification from 'rc-notification';
import 'rc-notification/assets/index.css';
import _ from 'lodash';
import styled from 'styled-components';
import {
  VscCloudUpload,
  VscFolderOpened,
  VscNewFile,
  VscNewFolder,
  VscSync,
  VscTriangleDown,
  VscTriangleRight,
} from 'react-icons/vsc';
import { AiOutlineFileUnknown } from 'react-icons/ai';
import { FcOpenedFolder } from 'react-icons/fc';
import { TbWorld } from 'react-icons/tb';
import { v4 } from 'uuid';
import { Services } from '@services';
import {
  COLORS,
  THEME,
  CURLERROO_FILE_EXTENSION,
  PLATFORM,
  USE_IN_MEMORY_FILE_SYSTEM,
} from '@constants';
import { AppDispatch, RootState } from '../../state/store';
import {
  createDirectory,
  createFile,
  deleteDirectoryOrFile,
  duplicateDirectoryOrFile,
  loadDirectoryInfo,
  renameDirectoryOrFile,
  selectDirectory,
  setSelectedSubDirectoryOrFile,
  moveDirectoryOrFile,
  createFileWithContent,
} from '../../state/features/selected-directory/selected-directory';
import {
  ActiveDocumentState,
  addFile,
  saveActiveDocument,
  setActiveDocument,
} from '../../state/features/documents/active-document';
import { TextButton } from './text-button';
import {
  addDragToDirectories,
  removeDragToDirectories,
  setDragFromDirectory,
} from '../../state/features/drag/drag';
import { ignoredDirectoryAndFile } from './constants';
import { modal } from './modal';
import { useContextMenu } from './context-menu';
import { GetDirectoryInfoFunction } from '../../../shared/file-interface';
import { getDocFromDocOnDisk } from '../../../shared/get-doc-from-doc-on-disk';

const HoverHighlight = styled.div`
  &:hover {
    background-color: #${COLORS[THEME].BACKGROUND_HIGHLIGHT};
  }
`;

const MenuItemHoverHighlight = styled.div`
  &:hover {
    background-color: #${COLORS[THEME].BACKGROUND_HIGHLIGHT};
  }
  padding: 8px;
  cursor: pointer;
`;

export function DirTree({
  dirTree,
  level,
  hideRoot = false,
  defaultIsOpen = false,
  activeDocument,
}: {
  dirTree?: Awaited<ReturnType<GetDirectoryInfoFunction>>;
  level: number;
  hideRoot?: boolean;
  defaultIsOpen?: boolean;
  activeDocument: ActiveDocumentState;
}) {
  const dispatch: AppDispatch = useDispatch();
  const { selectedSubDirectoryOrFile } = useSelector(
    (state: RootState) => state.selectedDirectory,
  );
  const isDirectory = !!dirTree?.children;
  const [isOpen, setIsOpen] = useState(defaultIsOpen);
  const isSelected = selectedSubDirectoryOrFile === dirTree?.path;
  const isSubDirectorySelected =
    !!dirTree?.path &&
    isDirectory &&
    !!selectedSubDirectoryOrFile?.startsWith(dirTree?.path) &&
    !isSelected;

  useEffect(() => {
    if (isSubDirectorySelected) {
      setIsOpen(true);
    }
  }, [isSubDirectorySelected]);

  const [isRenaming, setIsRenaming] = useState(false);
  const fileNameRef = useRef<HTMLSpanElement | null>(null);

  const { dragToDirectories, dragFromDirectory, dragToCells } = useSelector(
    (state: RootState) => state.drag,
  );

  const dragToDirectory = Object.entries(dragToDirectories).find(
    ([, v]) => v,
  )?.[0];

  const [extendedDragToDirectory, setExtendedDragToDirectory] = useState<
    string | null
  >(null);
  useEffect(() => {
    if (!dragToDirectory) {
      setTimeout(() => {
        setExtendedDragToDirectory(null);
      }, 1000);
    } else {
      setExtendedDragToDirectory(dragToDirectory);
    }
  }, [dragToDirectory]);

  const dragToCell = Object.entries(dragToCells).find(([, v]) => v)?.[0];

  const dragFromParentDirectory = dragFromDirectory
    ?.replace(/[^/]+$/, '')
    .slice(0, -1);

  const contextMenu = useContextMenu({
    menu:
      ({ customData, e }) =>
      () => {
        if (!dirTree) {
          return null;
        }
        return (
          <div>
            {customData['is-directory'] === 'false' &&
            PLATFORM === 'browser' ? (
              <>
                <MenuItemHoverHighlight
                  onClick={async () => {
                    if (!isDirectory) {
                      await Services.exportFile({
                        base64: await Services.readFileAsBase64(dirTree.path),
                        name: dirTree.name,
                      });
                    }
                    contextMenu.close();
                  }}
                >
                  Export
                </MenuItemHoverHighlight>
                <div
                  style={{
                    height: 1,
                    width: '100%',
                    backgroundColor: `#${COLORS[THEME].BACKGROUND_HIGHLIGHT}`,
                  }}
                />
              </>
            ) : null}
            <MenuItemHoverHighlight
              onClick={async () => {
                const { close } = modal({
                  content: (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <p>
                        Are you sure you want to delete{' '}
                        {isDirectory ? 'folder' : 'file'} &quot;{dirTree.name}
                        &quot;?
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                        }}
                      >
                        <TextButton
                          onClick={() => {
                            close();
                          }}
                        >
                          Cancel
                        </TextButton>
                        <div style={{ width: 10 }} />
                        <TextButton
                          onClick={async () => {
                            await dispatch(deleteDirectoryOrFile(dirTree.path));
                            if (
                              activeDocument &&
                              dirTree.path === activeDocument.filePath
                            ) {
                              await dispatch(
                                setActiveDocument({
                                  id: v4(),
                                  version: 2,
                                  filePath: null,
                                  executingAllCells: false,
                                  cells: [],
                                  globalVariables: [],
                                  activeCellIndex: 0,
                                }),
                              );
                            }
                            close();
                          }}
                        >
                          Delete
                        </TextButton>
                      </div>
                    </div>
                  ),
                });
                contextMenu.close();
              }}
            >
              Delete
            </MenuItemHoverHighlight>
            <div
              style={{
                height: 1,
                width: '100%',
                backgroundColor: `#${COLORS[THEME].BACKGROUND_HIGHLIGHT}`,
              }}
            />
            <MenuItemHoverHighlight
              onClick={() => {
                if (!isDirectory) {
                  dispatch(duplicateDirectoryOrFile(dirTree.path));
                }
                contextMenu.close();
              }}
            >
              Duplicate
            </MenuItemHoverHighlight>
            <div
              style={{
                height: 1,
                width: '100%',
                backgroundColor: `#${COLORS[THEME].BACKGROUND_HIGHLIGHT}`,
              }}
            />
            {PLATFORM === 'electron' ? (
              <>
                <MenuItemHoverHighlight
                  onClick={() => {
                    Services.showItemInFolder(dirTree.path);
                    contextMenu.close();
                  }}
                >
                  Show in folder
                </MenuItemHoverHighlight>
                <div
                  style={{
                    height: 1,
                    width: '100%',
                    backgroundColor: `#${COLORS[THEME].BACKGROUND_HIGHLIGHT}`,
                  }}
                />
              </>
            ) : null}
            <MenuItemHoverHighlight
              onClick={async () => {
                setIsRenaming(true);
                setTimeout(() => {
                  if (!fileNameRef.current?.firstChild?.nodeValue) {
                    return;
                  }
                  fileNameRef.current.focus();

                  const range = document.createRange();
                  range.setStart(fileNameRef.current.firstChild, 0);
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  selection?.extend(
                    fileNameRef.current.firstChild,
                    fileNameRef.current.firstChild.nodeValue.replace(
                      /\.[a-zA-Z0-9]+$/,
                      '',
                    ).length,
                  );
                }, 0);
                contextMenu.close();
              }}
            >
              Rename
            </MenuItemHoverHighlight>
          </div>
        );
      },
  });

  if (!dirTree) {
    return null;
  }

  return (
    <div
      style={{
        userSelect: 'none',
        backgroundColor:
          extendedDragToDirectory === dirTree.path &&
          dragFromParentDirectory !== extendedDragToDirectory
            ? 'lightblue'
            : undefined,
        // if we're at the root level, we want to add some padding to the bottom
        // so that we can drag files into the root directory
        paddingBottom: !level ? 100 : 0,
      }}
      onDragEnter={(e) => {
        e.stopPropagation();

        // if the target is a directory, we want to drop the file into the directory
        // but if the target is a file, we want to drop the file into the directory that contains the file
        const directory = isDirectory
          ? dirTree.path
          : dirTree.path.replace(/[^/]+$/, '').slice(0, -1);
        dispatch(addDragToDirectories(directory));
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        const directory = isDirectory
          ? dirTree.path
          : dirTree.path.replace(/[^/]+$/, '').slice(0, -1);
        dispatch(removeDragToDirectories(directory));
      }}
      onDragEnd={async (e) => {
        e.stopPropagation();
        if (!dragFromDirectory) {
          return;
        }
        if (extendedDragToDirectory) {
          const name = dragFromDirectory.replace(/.*\//, '');
          const newPath = `${extendedDragToDirectory}/${name}`;
          const oldPath = dragFromDirectory;

          // TODO: these actions should be atomic
          await dispatch(moveDirectoryOrFile({ newPath, oldPath }));
          if (activeDocument && oldPath === activeDocument.filePath) {
            dispatch(
              setSelectedSubDirectoryOrFile({
                path: newPath,
                type: isDirectory ? 'directory' : 'file',
              }),
            );
          }
        } else if (dragToCell) {
          dispatch(
            addFile({
              filePath: dragFromDirectory,
              cellIndex: parseInt(dragToCell),
            }),
          );
        }
      }}
    >
      {contextMenu.menuPortal}
      <HoverHighlight
        onClick={async (e) => {
          e.preventDefault();
          if (isDirectory) {
            setIsOpen(!isOpen);
          }
          dispatch(saveActiveDocument());
          dispatch(
            setSelectedSubDirectoryOrFile({
              path: dirTree.path,
              type: isDirectory ? 'directory' : 'file',
            }),
          );
        }}
        style={{
          alignItems: 'center',
          fontFamily: 'Ubuntu',
          fontSize: 13,
          margin: 0,
          display: hideRoot ? 'none' : 'flex',
          borderRadius: 3,
          ...(isSelected
            ? {
                padding: 7,
                paddingLeft: `${(level - 1) * 15 + 4}px`,
                backgroundColor: `#${COLORS[THEME].BACKGROUND_HIGHLIGHT}`,
                border: `1px solid #${COLORS[THEME].BLUE}`,
              }
            : {
                padding: 8,
                paddingLeft: `${(level - 1) * 15 + 5}px`,
                backgroundColor: undefined,
                border: 'none',
              }),
          // TODO: add background color when opening context menu
        }}
        draggable
        onDragStart={() => {
          dispatch(setDragFromDirectory(dirTree.path));
        }}
        onDragEnd={() => {}}
        {...contextMenu.getProps({
          customData: {
            'is-directory': isDirectory,
          },
        })}
      >
        {isDirectory ? (
          isOpen ? (
            <VscTriangleDown
              style={{
                flexShrink: 0,
              }}
            />
          ) : (
            <VscTriangleRight
              style={{
                flexShrink: 0,
              }}
            />
          )
        ) : (
          <VscTriangleDown
            style={{
              visibility: 'hidden',
              flexShrink: 0,
            }}
          />
        )}
        {isDirectory ? (
          <FcOpenedFolder style={{ margin: '0 5px', flexShrink: 0 }} />
        ) : dirTree.name.split('.').slice(-1)[0].toLowerCase() ===
          CURLERROO_FILE_EXTENSION ? (
          <TbWorld
            color={`#${COLORS[THEME].BLUE}`}
            style={{ margin: '0 5px', flexShrink: 0 }}
          />
        ) : (
          <AiOutlineFileUnknown style={{ margin: '0 5px', flexShrink: 0 }} />
        )}
        <span
          spellCheck={false}
          suppressContentEditableWarning
          contentEditable={isRenaming}
          ref={fileNameRef}
          style={{
            overflow: 'hidden',
            outline: 'none',
            whiteSpace: 'nowrap',
          }}
          onFocus={(e) => {
            e.target.style.overflow = 'hidden';
          }}
          onBlur={async (e) => {
            e.target.style.overflow = 'clip';
            const trimmed = e.target.innerText?.trim();
            if (!trimmed) {
              e.target.innerText = dirTree.name;
              return;
            }
            if (trimmed === dirTree.name) {
              setIsRenaming(false);
              return;
            }

            const newPath = dirTree.path.replace(/[^/]+$/, trimmed);
            const oldPath = dirTree.path;

            // TODO: these actions should be atomic
            await dispatch(
              renameDirectoryOrFile({
                newPath,
                oldPath,
              }),
            );
            // if rename succeeded, then fileNamesRef.current will be undefined and we do nothing
            // if rename failed, then fileNamesRef.current will still be defined and we set the innerText back to the original
            if (fileNameRef.current) {
              Notification.newInstance({}, (notification) => {
                notification.notice({
                  content: 'Failed to rename file',
                  closable: true,
                  duration: 10,
                  style: {
                    width: 400,
                    background: `#${COLORS[THEME].RED}`,
                    color: 'white',
                    fontWeight: 'bold',
                  },
                });
              });
              fileNameRef.current.innerHTML = dirTree?.name || '';
            }
            if (activeDocument && oldPath === activeDocument.filePath) {
              dispatch(
                setSelectedSubDirectoryOrFile({
                  path: newPath,
                  type: isDirectory ? 'directory' : 'file',
                }),
              );
            }
            setIsRenaming(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.blur();
            }
          }}
        >
          {dirTree.name}
        </span>
      </HoverHighlight>
      {isDirectory && isOpen
        ? _(dirTree.children)
            .sortBy((tree) => {
              if (tree.children) {
                // this is a hack to make sure that directories are sorted before files
                return '' + tree.name.toLowerCase();
              }
              return tree.name.toLowerCase();
            })
            .map((child) => {
              if (ignoredDirectoryAndFile.includes(child.name)) {
                return null;
              }
              return (
                <DirTree
                  activeDocument={activeDocument}
                  key={child.name}
                  dirTree={child}
                  level={level + 1}
                />
              );
            })
            .value()
        : null}
    </div>
  );
}

export function FileList({
  activeDocument,
}: {
  activeDocument: ActiveDocumentState;
}) {
  const selectedDirectory = useSelector(
    (state: RootState) => state.selectedDirectory.selectedDirectory,
  );
  const { selectedDirectoryInfo, selectedSubDirectoryOrFile, selectedSubType } =
    useSelector((state: RootState) => state.selectedDirectory);
  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    dispatch(loadDirectoryInfo());
  }, [dispatch]);

  const folderName = selectedDirectory?.replace(/.*\//, '');

  useEffect(() => {
    if (selectedSubType !== 'file' || !selectedSubDirectoryOrFile) {
      return;
    }
    (async () => {
      const { parsed: document, type } = await Services.readFile(
        selectedSubDirectoryOrFile,
      );
      if (type === 'empty') {
        return dispatch(
          setActiveDocument({
            id: v4(),
            version: 2,
            filePath: selectedSubDirectoryOrFile,
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
            globalVariables: [],
            activeCellIndex: 0,
          }),
        );
      }
      if (type === 'valid' && document) {
        return dispatch(
          setActiveDocument({
            id: document.id,
            shared_id: document.shared_id,
            version: 2,
            filePath: selectedSubDirectoryOrFile,
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
      }
      if (type === 'invalid') {
        return dispatch(setActiveDocument(null));
      }
      return null;
    })();
  }, [dispatch, selectedSubType, selectedSubDirectoryOrFile]);

  return (
    <div style={{ paddingLeft: 5 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '0 5px',
        }}
      >
        {!USE_IN_MEMORY_FILE_SYSTEM && (
          <TextButton
            icon={VscFolderOpened}
            onClick={() => {
              dispatch(selectDirectory());
            }}
          >
            Select
          </TextButton>
        )}
        {PLATFORM === 'browser' ? (
          <TextButton
            icon={VscCloudUpload}
            onClick={async () => {
              const { base64, name } = await Services.importFile();
              const doc = getDocFromDocOnDisk(JSON.parse(atob(base64)));
              const createResult: any = await dispatch(
                createFileWithContent({
                  content: doc,
                  name,
                }),
              ).then((m) => m.payload);
              dispatch(
                setSelectedSubDirectoryOrFile({
                  path: createResult.filePath,
                  type: 'file',
                }),
              );
            }}
          >
            Import
          </TextButton>
        ) : null}
        <TextButton
          icon={VscNewFile}
          onClick={async () => {
            // TODO: better typing
            const createResult: any = await dispatch(createFile()).then(
              (m) => m.payload,
            );
            dispatch(
              setSelectedSubDirectoryOrFile({
                path: createResult.filePath,
                type: 'file',
              }),
            );
            //
          }}
        >
          File
        </TextButton>
        <TextButton
          icon={VscNewFolder}
          onClick={() => {
            dispatch(createDirectory({}));
          }}
        >
          Folder
        </TextButton>
      </div>
      <div
        style={{
          margin: '10px 0',
          height: 1,
          backgroundColor: `#${COLORS[THEME].GREY2}`,
        }}
      />
      <div
        style={{
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 15,
        }}
      >
        <span
          style={{
            textOverflow: 'ellipsis',
            flex: 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          Folder: {folderName}
        </span>
        <VscSync
          size={16}
          style={{ cursor: 'pointer', flexBasis: 20 }}
          onClick={() => {
            dispatch(loadDirectoryInfo());
            Notification.newInstance({}, (notification) => {
              notification.notice({
                content: 'Refreshed directory',
                closable: true,
                duration: 1,
                style: {
                  width: 400,
                  background: `#${COLORS[THEME].GREEN}`,
                  color: 'white',
                  fontWeight: 'bold',
                },
              });
            });
          }}
        />
      </div>
      <div style={{ height: 5 }} />
      <DirTree
        activeDocument={activeDocument}
        dirTree={selectedDirectoryInfo}
        level={0}
        defaultIsOpen
        hideRoot
      />
    </div>
  );
}
