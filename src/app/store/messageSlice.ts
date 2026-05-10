import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string | null;
    message_text: string;
    is_group_chat: boolean;
    timestamp: string;
}

interface MessageState {
    privateMessages: Message[];
    groupMessages: Message[];
}

const initialState: MessageState = {
    privateMessages: [],
    groupMessages: [],
};

const messageSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {
        addMessage: (state, action: PayloadAction<Message>) => {
            if (action.payload.is_group_chat) {
                state.groupMessages.push(action.payload);
            } else {
                state.privateMessages.push(action.payload);
            }
        },
        setMessages: (state, action: PayloadAction<{ private: Message[], group: Message[] }>) => {
            state.privateMessages = action.payload.private;
            state.groupMessages = action.payload.group;
        },
    },
});

export const { addMessage, setMessages } = messageSlice.actions;
export default messageSlice.reducer;
