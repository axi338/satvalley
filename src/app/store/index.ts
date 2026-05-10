import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import classReducer from './classSlice';
import messageReducer from './messageSlice';
import performanceReducer from './performanceSlice';

export const store = configureStore({
    reducer: {
        class: classReducer,
        messages: messageReducer,
        performance: performanceReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
