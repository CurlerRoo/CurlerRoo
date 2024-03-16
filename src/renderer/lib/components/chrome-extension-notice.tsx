import 'rc-switch/assets/index.css';
import { modal } from './modal';

export function ChromeExtensionNotice() {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div>
          <p
            style={{
              lineHeight: '1.5',
            }}
          >
            Chrome Extension installed grants unlimited storage to the app.
            Without the extension, the app can only hold as much as 5MB of data.
          </p>
        </div>
      </div>
    </div>
  );
}

export const showChromeExtensionNotice = () => {
  modal({
    content: <ChromeExtensionNotice />,
  });
};
