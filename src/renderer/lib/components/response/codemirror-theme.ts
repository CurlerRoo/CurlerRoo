import { EditorView } from '@uiw/react-codemirror';
import { useColors, useTheme } from '../../contexts/theme-context';

export function useCodeMirrorTheme() {
  const colors = useColors();
  const { theme } = useTheme();
  const isDark = theme === 'DARK_MODE';

  return EditorView.theme(
    {
      '&': {
        backgroundColor: `#${colors.SURFACE_PRIMARY}`,
        color: `#${colors.TEXT_PRIMARY}`,
      },
      '.cm-scroller': {
        backgroundColor: `#${colors.SURFACE_PRIMARY}`,
      },
      '.cm-content': {
        caretColor: `#${colors.TEXT_PRIMARY}`,
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: `#${colors.TEXT_PRIMARY}`,
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: `#${colors.SELECTION} !important`,
      },
      '.cm-selectionBackground': {
        backgroundColor: `#${colors.SELECTION} !important`,
      },
      '.cm-selectionMatch': {
        backgroundColor: `#${colors.SELECTION} !important`,
      },
      '& ::selection': {
        backgroundColor: `#${colors.SELECTION} !important`,
      },
      '.cm-activeLine': {
        backgroundColor: `transparent`,
      },
      '.cm-gutters': {
        backgroundColor: `#${colors.SURFACE_PRIMARY}`,
        color: `#${colors.TEXT_SECONDARY}`,
        borderRight: `1px solid #${colors.BORDER}`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: `#${colors.SURFACE_PRIMARY}`,
        color: `#${colors.TEXT_PRIMARY}`,
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'transparent',
        border: `1px solid #${colors.BORDER}`,
        color: `#${colors.TEXT_SECONDARY}`,
      },
      '.cm-panels': {
        backgroundColor: `#${colors.SURFACE_PRIMARY}`,
        color: `#${colors.TEXT_PRIMARY}`,
        borderBottom: `1px solid #${colors.BORDER}`,
      },
      '.cm-searchMatch': {
        backgroundColor: isDark
          ? 'rgba(255, 211, 61, 0.25)'
          : 'rgba(255, 234, 0, 0.25)',
        outline: `1px solid #${colors.WARNING}`,
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: isDark
          ? 'rgba(255, 211, 61, 0.4)'
          : 'rgba(255, 234, 0, 0.4)',
      },
      // Syntax highlighting for strings and numbers
      '.ͼe': {
        color: `#${colors.SYNTAX_STRING}`,
      },
    },
    { dark: isDark },
  );
}
