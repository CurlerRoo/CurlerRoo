import 'rc-switch/assets/index.css';
import { Services } from '@services';
import { useColors } from '../contexts/theme-context';
import { modal } from './modal';

const feedbackUrl = 'https://github.com/CurlerRoo/CurlerRoo/issues/new';
export function Feedback() {
  const colors = useColors();
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
          <p>
            If you have any feedback, please create an issue on our{' '}
            <button
              style={{
                color: `#${colors.INFO}`,
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
              onClick={() => {
                Services.openExternal(feedbackUrl);
              }}
            >
              Github repository
            </button>
          </p>
          <p>Your feedback is always greatly appreciated!</p>
        </div>
      </div>
    </div>
  );
}

export const showFeedback = () => {
  modal({
    content: <Feedback />,
  });
};
