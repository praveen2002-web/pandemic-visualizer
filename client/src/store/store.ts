import { configureStore } from '@reduxjs/toolkit';
import pandemicReducer from './pandemicSlice';

export const store = configureStore({
  reducer: {
    pandemic: pandemicReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
