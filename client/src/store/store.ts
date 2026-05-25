import { configureStore } from '@reduxjs/toolkit';
import covidReducer from './covidSlice';
import pandemicReducer from './pandemicSlice';

export const store = configureStore({
  reducer: {
    covid: covidReducer,
    pandemic: pandemicReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
