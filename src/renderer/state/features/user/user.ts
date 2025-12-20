import { createSlice } from '@reduxjs/toolkit';
import { PRIVACY_POLICY_VERSION, TERMS_OF_SERVICE_VERSION } from '@constants';

export type UserState = {
  acceptedTermsOfServiceVersion?: string;
  acceptedPrivacyPolicyVersion?: string;
  allowedAnalytics?: boolean;
  wordWrappingInEditor?: boolean;
  maxSendHistoryEntries?: number;
};

const initialState = {
  wordWrappingInEditor: true,
  maxSendHistoryEntries: 20,
} as UserState;

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    acceptTerms: (state) => {
      state.acceptedTermsOfServiceVersion = TERMS_OF_SERVICE_VERSION;
      state.acceptedPrivacyPolicyVersion = PRIVACY_POLICY_VERSION;
    },
    allowAnalytics: (state, { payload }: { payload: boolean }) => {
      state.allowedAnalytics = payload;
    },
    reset: () => initialState,
    setWordWrappingInEditor: (state, { payload }: { payload: boolean }) => {
      state.wordWrappingInEditor = payload;
    },
    setMaxSendHistoryEntries: (state, { payload }: { payload: number }) => {
      state.maxSendHistoryEntries = payload;
    },
  },
});

export const {
  acceptTerms,
  allowAnalytics,
  reset,
  setWordWrappingInEditor,
  setMaxSendHistoryEntries,
} = userSlice.actions;

export default userSlice.reducer;
