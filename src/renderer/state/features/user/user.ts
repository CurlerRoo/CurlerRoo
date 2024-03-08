import { createSlice } from '@reduxjs/toolkit';
import { PRIVACY_POLICY_VERSION, TERMS_OF_SERVICE_VERSION } from '@constants';

export type UserState = {
  acceptedTermsOfServiceVersion?: string;
  acceptedPrivacyPolicyVersion?: string;
  allowedAnalytics?: boolean;
};

const initialState = {} as UserState;

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
  },
});

export const { acceptTerms, allowAnalytics, reset } = userSlice.actions;

export default userSlice.reducer;
