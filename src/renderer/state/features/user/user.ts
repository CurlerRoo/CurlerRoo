import { createSlice } from '@reduxjs/toolkit';
import { PRIVACY_POLICY_VERSION, TERMS_OF_SERVICE_VERSION } from '@constants';

export type UserState = {
  acceptedTermsOfServiceVersion?: string;
  acceptedPrivacyPolicyVersion?: string;
  allowedAnalytics?: boolean;
  wordWrappingInEditor?: boolean;
};

const initialState = {
  wordWrappingInEditor: true,
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
  },
});

export const { acceptTerms, allowAnalytics, reset, setWordWrappingInEditor } =
  userSlice.actions;

export default userSlice.reducer;
