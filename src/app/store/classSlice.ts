import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi, apiFetch } from '../lib/auth';

interface Assignment {
    id: string;
    title: string;
    due_date: string;
    total_marks: number;
    teacher_id: string;
    content: any;
}

interface Submission {
    id: string;
    assignment_id: string;
    student_id: string;
    submission_time: string;
    score: number | null;
    feedback: string | null;
}

interface ClassState {
    assignments: Assignment[];
    submissions: Submission[];
    loading: boolean;
    error: string | null;
}

const initialState: ClassState = {
    assignments: [],
    submissions: [],
    loading: false,
    error: null,
};

export const fetchAssignments = createAsyncThunk(
    'class/fetchAssignments',
    async () => {
        const response = await fetch('/api/assignments');
        if (!response.ok) throw new Error('Failed to fetch assignments');
        const data = await response.json();
        return data.assignments;
    }
);

const classSlice = createSlice({
    name: 'class',
    initialState,
    reducers: {
        addAssignment: (state, action: PayloadAction<Assignment>) => {
            state.assignments.push(action.payload);
        },
        updateSubmission: (state, action: PayloadAction<Submission>) => {
            const index = state.submissions.findIndex(s => s.id === action.payload.id);
            if (index !== -1) {
                state.submissions[index] = action.payload;
            } else {
                state.submissions.push(action.payload);
            }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAssignments.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchAssignments.fulfilled, (state, action) => {
                state.loading = false;
                state.assignments = action.payload;
            })
            .addCase(fetchAssignments.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Error fetching assignments';
            });
    },
});

export const { addAssignment, updateSubmission } = classSlice.actions;
export default classSlice.reducer;
