import { useDispatch, useSelector } from 'react-redux';
import React, { useEffect, useRef, useState } from 'react';
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
  CURLERROO_FILE_EXTENSION,
  PLATFORM,
  USE_IN_MEMORY_FILE_SYSTEM,
} from '@constants';
import { useColors, useTheme } from '../contexts/theme-context';
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
  reorderFilesInDirectory,
  removeFileFromOrder,
  addFileToOrder,
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
  setDragOverItem,
  resetDrag,
} from '../../state/features/drag/drag';
import { ignoredDirectoryAndFile } from './constants';
import { modal } from './modal';
import { useContextMenu } from './context-menu';
import { GetDirectoryInfoFunction } from '../../../shared/file-interface';
import { getDocFromDocOnDisk } from '../../../shared/get-doc-from-doc-on-disk';
import { CurlResponseOutput, CurlSendHistory } from '../../../shared/types';

const HoverHighlight = ({
  children,
  onClick,
  style,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  ...rest
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  [key: string]: any;
}) => {
  const colors = useColors();
  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      style={style}
      {...rest}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `#${colors.SURFACE_SECONDARY}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </div>
  );
};

const MenuItemHoverHighlight = ({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}) => {
  const colors = useColors();
  return (
    <div
      onClick={onClick}
      style={{
        padding: 8,
        cursor: 'pointer',
        color: `#${colors.TEXT_PRIMARY}`,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `#${colors.SURFACE_SECONDARY}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </div>
  );
};

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
  const colors = useColors();
  const { theme } = useTheme();
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

  const {
    dragToDirectories,
    dragFromDirectory,
    dragToCells,
    dragOverItemPath,
    dragOverItemIndex,
    dragDropPosition,
  } = useSelector((state: RootState) => state.drag);
  const { fileOrder } = useSelector(
    (state: RootState) => state.selectedDirectory,
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

  // Get the parent directory path for this item
  const parentDirectory = isDirectory
    ? dirTree?.path
    : dirTree?.path.replace(/[^/]+$/, '').slice(0, -1);

  // Check if we're dragging within the same directory (reordering)
  const isReordering =
    dragFromDirectory && dragFromParentDirectory === parentDirectory;

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
                    backgroundColor: `#${colors.BORDER}`,
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
                backgroundColor: `#${colors.BORDER}`,
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
                backgroundColor: `#${colors.BORDER}`,
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
                    backgroundColor: `#${colors.BORDER}`,
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

  // Check if this directory is the target for reordering
  const isReorderingTarget =
    isReordering &&
    isDirectory &&
    dragOverItemPath &&
    dirTree.children?.some((child) => child.path === dragOverItemPath);

  return (
    <div
      style={{
        userSelect: 'none',
        backgroundColor:
          extendedDragToDirectory === dirTree.path &&
          dragFromParentDirectory !== extendedDragToDirectory
            ? theme === 'DARK_MODE'
              ? 'rgba(31, 111, 235, 0.25)'
              : 'lightblue'
            : isReorderingTarget
              ? theme === 'DARK_MODE'
                ? 'rgba(31, 111, 235, 0.15)'
                : 'rgba(173, 216, 230, 0.3)'
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
      onDragOver={(e) => {
        if (isReordering && isDirectory) {
          e.preventDefault();
          e.stopPropagation();
          // Check if we're dragging over the directory container itself (for end-of-list drop)
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseY = e.clientY;
          // If mouse is in the bottom 20% of the container, treat as end-of-list drop
          const isNearBottom = mouseY > rect.top + rect.height * 0.8;
          if (isNearBottom) {
            // Set this directory as the drag over target for dropping at the end
            dispatch(
              setDragOverItem({
                itemPath: dirTree.path,
                dropPosition: undefined, // undefined means end of list
              }),
            );
          }
        }
      }}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dragFromDirectory) {
          return;
        }

        const targetDirectory = isDirectory
          ? dirTree.path
          : dirTree.path.replace(/[^/]+$/, '').slice(0, -1);
        const sourceParentDirectory = dragFromDirectory
          .replace(/[^/]+$/, '')
          .slice(0, -1);

        // Only handle reordering within the same directory in onDrop
        // Moves between directories are handled in onDragEnd
        if (
          isReordering &&
          targetDirectory === sourceParentDirectory &&
          dragOverItemPath
        ) {
          // Reorder within the same directory
          const currentOrder = fileOrder[targetDirectory] || [];
          const draggedPath = dragFromDirectory;

          // Get current children to build order if needed
          const currentChildren = dirTree.children || [];
          const filteredChildren = currentChildren.filter(
            (child) => !ignoredDirectoryAndFile.includes(child.name),
          );

          // If no order exists yet, create one from current children (sorted by default)
          let workingOrder = currentOrder.length > 0 ? [...currentOrder] : [];
          if (workingOrder.length === 0) {
            workingOrder = filteredChildren.map((child) => child.path);
          } else {
            // Merge: add any new children that aren't in the order
            const existingPaths = new Set(workingOrder);
            filteredChildren.forEach((child) => {
              if (!existingPaths.has(child.path)) {
                workingOrder.push(child.path);
              }
            });
          }

          // Remove dragged item from current position
          const filteredOrder = workingOrder.filter(
            (path) => path !== draggedPath,
          );

          // If dragOverItemPath is the directory itself, append to end
          // Otherwise, find the target item and insert based on drop position
          if (dragOverItemPath === targetDirectory) {
            filteredOrder.push(draggedPath);
          } else {
            const targetIndex = filteredOrder.findIndex(
              (path) => path === dragOverItemPath,
            );
            // Insert at target position based on drop position
            if (targetIndex !== -1) {
              if (dragDropPosition === 'above') {
                // Insert before the target item
                filteredOrder.splice(targetIndex, 0, draggedPath);
              } else {
                // Insert after the target item
                filteredOrder.splice(targetIndex + 1, 0, draggedPath);
              }
            } else {
              // If target not found, append to end
              filteredOrder.push(draggedPath);
            }
          }

          dispatch(
            reorderFilesInDirectory({
              directoryPath: targetDirectory,
              orderedPaths: filteredOrder,
            }),
          );
          dispatch(resetDrag());
        }
        // Don't handle moves between directories here - let onDragEnd handle it
      }}
      onDragEnd={async (e) => {
        e.stopPropagation();
        if (!dragFromDirectory) {
          dispatch(resetDrag());
          return;
        }

        // Handle move between directories (reordering is handled in onDrop)
        if (extendedDragToDirectory) {
          const name = dragFromDirectory.replace(/.*\//, '');
          const newPath = `${extendedDragToDirectory}/${name}`;
          const oldPath = dragFromDirectory;
          const sourceParentDirectory = dragFromDirectory
            .replace(/[^/]+$/, '')
            .slice(0, -1);

          // Only move if it's actually a different directory
          if (extendedDragToDirectory !== sourceParentDirectory) {
            // TODO: these actions should be atomic
            await dispatch(moveDirectoryOrFile({ newPath, oldPath }));

            // Update order in new directory
            const newDirOrder = fileOrder[extendedDragToDirectory] || [];
            if (!newDirOrder.includes(newPath)) {
              dispatch(
                addFileToOrder({
                  directoryPath: extendedDragToDirectory,
                  filePath: newPath,
                }),
              );
            }

            // Remove from old directory order
            if (sourceParentDirectory && fileOrder[sourceParentDirectory]) {
              dispatch(
                removeFileFromOrder({
                  directoryPath: sourceParentDirectory,
                  filePath: oldPath,
                }),
              );
            }

            if (activeDocument && oldPath === activeDocument.filePath) {
              dispatch(
                setSelectedSubDirectoryOrFile({
                  path: newPath,
                  type: isDirectory ? 'directory' : 'file',
                }),
              );
            }
          }
        } else if (dragToCell) {
          dispatch(
            addFile({
              filePath: dragFromDirectory,
              cellIndex: parseInt(dragToCell),
            }),
          );
        }
        dispatch(resetDrag());
      }}
    >
      {contextMenu.menuPortal}
      {/* Drop indicator line - show above this item if dragging over and drop position is 'above' */}
      {isReordering &&
        dragOverItemPath === dirTree.path &&
        dragDropPosition === 'above' &&
        dragFromDirectory !== dirTree.path && (
          <div
            style={{
              height: 2,
              backgroundColor: `#${colors.PRIMARY}`,
              marginLeft: `${(level - 1) * 15 + 5}px`,
              marginRight: 5,
              borderRadius: 1,
              zIndex: 10,
              position: 'relative',
            }}
          />
        )}
      <HoverHighlight
        onClick={async (e: React.MouseEvent<HTMLDivElement>) => {
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
                backgroundColor: `#${colors.SURFACE_SECONDARY}`,
                border: `1px solid #${colors.PRIMARY}`,
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
        onDragOver={(e) => {
          if (isReordering && dragFromDirectory !== dirTree.path) {
            e.preventDefault();
            e.stopPropagation();
            // Determine if we're dropping above or below based on mouse position
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseY = e.clientY;
            const itemMiddle = rect.top + rect.height / 2;
            const dropPosition = mouseY < itemMiddle ? 'above' : 'below';
            // Set this item as the drag over target
            dispatch(
              setDragOverItem({
                itemPath: dirTree.path,
                dropPosition,
              }),
            );
          }
        }}
        onDragEnd={() => {
          dispatch(resetDrag());
        }}
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
            color={`#${colors.PRIMARY}`}
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
                    background: `#${colors.ERROR}`,
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
      {/* Drop indicator line - show below this item if dragging over and drop position is 'below' */}
      {isReordering &&
        dragOverItemPath === dirTree.path &&
        dragDropPosition === 'below' &&
        dragFromDirectory !== dirTree.path && (
          <div
            style={{
              height: 2,
              backgroundColor: `#${colors.PRIMARY}`,
              marginLeft: `${(level - 1) * 15 + 5}px`,
              marginRight: 5,
              borderRadius: 1,
              zIndex: 10,
              position: 'relative',
            }}
          />
        )}
      {isDirectory && isOpen
        ? (() => {
            const children = dirTree.children || [];
            const filteredChildren = children.filter(
              (child) => !ignoredDirectoryAndFile.includes(child.name),
            );

            // Get custom order for this directory - all files should be tracked now
            const customOrder = fileOrder[dirTree.path] || [];
            const orderMap = new Map<string, number>();
            customOrder.forEach((path, index) => {
              orderMap.set(path, index);
            });

            // Create a map of all items for quick lookup
            const itemsMap = new Map<string, (typeof filteredChildren)[0]>();
            filteredChildren.forEach((child) => {
              itemsMap.set(child.path, child);
            });

            // Sort by custom order - all files should be in the order
            const sortedChildren = customOrder
              .map((path) => itemsMap.get(path))
              .filter((item): item is (typeof filteredChildren)[0] => !!item);

            // Add any items that might not be in the order yet (shouldn't happen, but safety check)
            const orderedPaths = new Set(customOrder);
            const missingItems = filteredChildren.filter(
              (child) => !orderedPaths.has(child.path),
            );
            if (missingItems.length > 0) {
              // Sort missing items by default sort and append
              const sortedMissing = _(missingItems)
                .sortBy((tree) => {
                  if (tree.children) {
                    return '' + tree.name.toLowerCase();
                  }
                  return tree.name.toLowerCase();
                })
                .value();
              sortedChildren.push(...sortedMissing);
            }

            return (
              <>
                {sortedChildren.map((child) => (
                  <DirTree
                    activeDocument={activeDocument}
                    key={child.path}
                    dirTree={child}
                    level={level + 1}
                  />
                ))}
                {/* Drop indicator line at the end of directory if dragging over directory itself */}
                {isReordering &&
                  dragOverItemPath === dirTree.path &&
                  dragFromDirectory !== dirTree.path &&
                  !dragDropPosition && (
                    <div
                      style={{
                        height: 2,
                        backgroundColor: `#${colors.PRIMARY}`,
                        marginLeft: `${level * 15 + 5}px`,
                        marginRight: 5,
                        borderRadius: 1,
                        zIndex: 10,
                        position: 'relative',
                      }}
                    />
                  )}
              </>
            );
          })()
        : null}
    </div>
  );
}

export function FileList({
  activeDocument,
}: {
  activeDocument: ActiveDocumentState;
}) {
  const colors = useColors();
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
                    responseDate: 0,
                    formattedBody: '',
                  },
                ],
                sendHistories: [],
                selectedSendHistoryId: undefined,
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
              sendHistories: (cell.sendHistories || []).map(
                (history: CurlSendHistory) => ({
                  ...history,
                  outputs: (history.outputs || []).map(
                    (output: CurlResponseOutput) => ({
                      ...output,
                      formattedBody: '',
                    }),
                  ),
                }),
              ),
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
    <div
      style={{
        paddingLeft: 5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: `#${colors.TEXT_PRIMARY}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          rowGap: 15,
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
          backgroundColor: `#${colors.BORDER}`,
        }}
      />
      <div
        style={{
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 15,
          padding: '0 5px',
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
                  background: `#${colors.SUCCESS}`,
                  color: 'white',
                  fontWeight: 'bold',
                },
              });
            });
          }}
        />
      </div>
      <div style={{ height: 5 }} />
      <div
        style={{
          overflowY: 'scroll',
          flex: 1,
        }}
      >
        <DirTree
          activeDocument={activeDocument}
          dirTree={selectedDirectoryInfo}
          level={0}
          defaultIsOpen
          hideRoot
        />
      </div>
    </div>
  );
}
