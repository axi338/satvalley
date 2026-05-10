import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PerformanceData {
    id: string;
    student_id: string;
    quiz_scores: any[];
    homework_scores: any[];
    overall_score: number;
    improvement_percentage: number;
}

interface ToDoItem {
    id: string;
    student_id: string;
    task: string;
    due_date: string;
    completed: boolean;
}

interface PerformanceState {
    performanceData: PerformanceData | null;
    todos: ToDoItem[];
}

const initialState: PerformanceState = {
    performanceData: null,
    todos: [],
};

const performanceSlice = createSlice({
    name: 'performance',
    initialState,
    reducers: {
        setPerformance: (state, action: PayloadAction<PerformanceData>) => {
            state.performanceData = action.payload;
        },
        setTodos: (state, action: PayloadAction<ToDoItem[]>) => {
            state.todos = action.payload;
        },
        addTodo: (state, action: PayloadAction<ToDoItem>) => {
            state.todos.push(action.payload);
        },
        toggleTodo: (state, action: PayloadAction<string>) => {
            const todo = state.todos.find(t => t.id === action.payload);
            if (todo) {
                todo.completed = !todo.completed;
            }
        },
    },
});

export const { setPerformance, setTodos, addTodo, toggleTodo } = performanceSlice.actions;
export default performanceSlice.reducer;
