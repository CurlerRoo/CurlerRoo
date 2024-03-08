import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Services } from '@services';
import { RootState } from '../../state/store';
import {
  COLORS,
  ENABLE_TELEMETRY_FEATURE,
  ENABLE_TERMS_OF_SERVICE_FEATURE,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
  THEME,
} from '@constants';
import { Modal } from './modal';
import { acceptTerms, allowAnalytics } from '../../state/features/user/user';

export function TelemetryConsented() {
  const dispatch = useDispatch();

  return (
    <>
      <Modal
        content={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'start',
            }}
          >
            <p>
              Allow us to collect anonymous usage data to improve the
              application and make it better. We do not collect any personal
              information. You can change this setting at any time in the
              settings menu.
            </p>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
              <button
                style={{
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 16,
                  padding: '4px 8px',
                  backgroundColor: `#${COLORS[THEME].GREEN}`,
                  color: `#${COLORS[THEME].WHITE}`,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  dispatch(allowAnalytics(true));
                }}
              >
                Accept
              </button>
              <button
                style={{
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 16,
                  padding: '4px 8px',
                  backgroundColor: `#${COLORS[THEME].GREY2}`,
                  color: `#${COLORS[THEME].WHITE}`,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  dispatch(allowAnalytics(false));
                }}
              >
                Reject
              </button>
            </div>
          </div>
        }
        visible
      />
    </>
  );
}

export function AcceptedTermsOfService() {
  const dispatch = useDispatch();

  return (
    <>
      <Modal
        content={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'start',
              gap: 10,
            }}
          >
            <p style={{ margin: 0 }}>
              You must accept the latest{' '}
              <button
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: `#${COLORS[THEME].GREEN}`,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  Services.openExternal(
                    'https://github.com/CurlerRoo/CurlerRoo/blob/main/terms-of-service.md',
                  );
                }}
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: `#${COLORS[THEME].GREEN}`,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  Services.openExternal(
                    'https://github.com/CurlerRoo/CurlerRoo/blob/main/privacy-policy.md',
                  );
                }}
              >
                Privacy Policy
              </button>{' '}
              to continue using the application.
            </p>
            <p style={{ margin: 0 }}>
              By clicking &quot;Accept&quot; you agree to the Terms of Service
              and Privacy
            </p>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
              <button
                style={{
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 16,
                  padding: '4px 8px',
                  backgroundColor: `#${COLORS[THEME].GREEN}`,
                  color: `#${COLORS[THEME].WHITE}`,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  dispatch(acceptTerms());
                }}
              >
                Accept
              </button>
              <button
                style={{
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 16,
                  padding: '4px 8px',
                  backgroundColor: `#${COLORS[THEME].GREY2}`,
                  color: `#${COLORS[THEME].WHITE}`,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  window.close();
                }}
              >
                Reject
              </button>
            </div>
          </div>
        }
        visible
      />
    </>
  );
}

export function AppConsent({ children }: { children: React.ReactElement }) {
  const { acceptedPrivacyPolicyVersion, acceptedTermsOfServiceVersion } =
    useSelector((state: RootState) => state.user);

  const tosAlreadyAccepted =
    acceptedPrivacyPolicyVersion === PRIVACY_POLICY_VERSION &&
    acceptedTermsOfServiceVersion === TERMS_OF_SERVICE_VERSION;

  return (
    <>
      {!tosAlreadyAccepted && ENABLE_TERMS_OF_SERVICE_FEATURE ? (
        <AcceptedTermsOfService />
      ) : allowAnalytics == null && ENABLE_TELEMETRY_FEATURE ? (
        <TelemetryConsented />
      ) : null}
      {children}
    </>
  );
}
