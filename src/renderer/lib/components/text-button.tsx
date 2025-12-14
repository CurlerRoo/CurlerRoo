import { ButtonHTMLAttributes } from 'react';
import { IconBaseProps, IconType } from 'react-icons';
import Tooltip from 'rc-tooltip';
import 'rc-tooltip/assets/bootstrap.css';
import { useColors } from '../contexts/theme-context';

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
  const colors = useColors();
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
      <div
        {...props}
        style={{
          padding: '2px 5px',
          alignItems: 'center',
          display: 'flex',
          width: 'fit-content',
          height: 'fit-content',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          ...props.style,
        }}
        onMouseEnter={(e) => {
          if (props.onMouseEnter) {
            props.onMouseEnter(e);
          }
          e.currentTarget.style.backgroundColor = `#${colors.SURFACE_SECONDARY}`;
        }}
        onMouseLeave={(e) => {
          if (props.onMouseLeave) {
            props.onMouseLeave(e);
          }
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {Icon && (
          <Icon
            {...iconProps}
            style={{
              cursor: 'pointer',
              color: `#${colors.TEXT_PRIMARY}`,
              ...iconProps?.style,
            }}
          />
        )}
        {children ? (
          <button
            style={{
              border: 'none',
              color: `#${colors.TEXT_PRIMARY}`,
              cursor: 'pointer',
              backgroundColor: 'transparent',
            }}
          >
            {children}
          </button>
        ) : null}
      </div>
    </Tooltip>
  );
}
