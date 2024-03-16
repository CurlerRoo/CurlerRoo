import { ButtonHTMLAttributes } from 'react';
import { IconBaseProps, IconType } from 'react-icons';
import styled from 'styled-components';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap.css';
import { COLORS, THEME } from '@constants';

const HoverHighlight = styled.div`
  &:hover {
    background-color: #${COLORS[THEME].BACKGROUND_HIGHLIGHT};
  }
`;

export function TextButton({
  icon,
  iconProps,
  children,
  tooltip,
  ...props
}: ButtonHTMLAttributes<HTMLDivElement> & {
  icon?: IconType;
  iconProps?: IconBaseProps;
  tooltip?: string;
}) {
  const Icon = icon;
  return (
    <Tooltip
      overlay={tooltip}
      overlayStyle={{
        ...(tooltip ? {} : { display: 'none' }),
      }}
      overlayInnerStyle={{
        minHeight: 0,
      }}
      placement="bottom"
      trigger="hover"
    >
      <HoverHighlight
        {...props}
        style={{
          padding: '2px 5px',
          alignItems: 'center',
          display: 'flex',
          width: 'fit-content',
          height: 'fit-content',
          cursor: 'pointer',
          ...props.style,
        }}
      >
        {Icon && (
          <Icon
            {...iconProps}
            style={{
              cursor: 'pointer',
              ...iconProps?.style,
            }}
          />
        )}
        {children ? (
          <button
            style={{
              border: 'none',
              color: `#${COLORS[THEME].BLACK_EAL}`,
              cursor: 'pointer',
              backgroundColor: 'transparent',
            }}
          >
            {children}
          </button>
        ) : null}
      </HoverHighlight>
    </Tooltip>
  );
}
