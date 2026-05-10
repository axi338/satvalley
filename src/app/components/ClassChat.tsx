import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { addMessage, setMessages } from '../store/messageSlice';
import { io } from 'socket.io-client';
import { Send, User as UserIcon, MessageSquare, Users as UsersIcon } from 'lucide-react';
import { authApi, apiFetch } from '../lib/auth';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

export function ClassChat({ user, profile, initialSelectedUserId }: { user: any; profile: any; initialSelectedUserId?: string | null }) {
    const [input, setInput] = useState('');
    const [chatMode, setChatMode] = useState<'group' | 'private'>('group');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(initialSelectedUserId || null);
    const [students, setStudents] = useState<any[]>([]);
    const { groupMessages, privateMessages } = useAppSelector(state => state.messages);
    const dispatch = useAppDispatch();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialSelectedUserId) {
            setSelectedUserId(initialSelectedUserId);
            setChatMode('private');
        }
    }, [initialSelectedUserId]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = (await authApi.getSession()).data.session?.access_token;
                const resp = await fetch('/api/messages', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await resp.json();
                dispatch(setMessages({ private: data.private || [], group: data.group || [] }));
            } catch (err) {
                console.error(err);
            }
        };
        const fetchStudents = async () => {
            if (!profile?.is_admin && !profile?.raw_app_metadata?.admin) return;
            try {
                const token = (await authApi.getSession()).data.session?.access_token;
                const resp = await fetch('/api/teacher/students', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await resp.json();
                setStudents(data.students || []);
            } catch (err) {
                console.error(err);
            }
        };

        fetchHistory();
        fetchStudents();

        socket.on('new_group_message', (data) => {
            dispatch(addMessage(data));
        });

        socket.on('new_private_message', (data) => {
            dispatch(addMessage(data));
        });

        return () => {
            socket.off('new_group_message');
            socket.off('new_private_message');
        };
    }, [dispatch]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [groupMessages, privateMessages, chatMode]);

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        try {
            const token = (await authApi.getSession()).data.session?.access_token;
            const body = {
                message_text: input,
                is_group_chat: chatMode === 'group',
                receiver_id: chatMode === 'private' ? selectedUserId : null
            };

            const resp = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            if (resp.ok) setInput('');
        } catch (err) {
            console.error(err);
        }
    };

    const currentMessages = chatMode === 'group'
        ? groupMessages
        : privateMessages.filter(m => (m.sender_id === selectedUserId || m.receiver_id === selectedUserId));

    return (
        <div className="flex bg-[#0a0f1d]/40 border border-white/10 rounded-3xl overflow-hidden h-[600px]">
            {/* Sidebar for teachers/admins to see private threads */}
            <div className="w-20 md:w-64 border-r border-white/5 bg-black/20 flex flex-col">
                <div className="p-4 border-b border-white/5">
                    <h3 className="hidden md:block text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-2">Channels</h3>
                </div>

                <button
                    onClick={() => setChatMode('group')}
                    className={`p-4 flex items-center gap-3 transition-all ${chatMode === 'group' ? 'bg-indigo-600/10 text-white' : 'text-indigo-200/40 hover:text-white hover:bg-white/5'}`}
                >
                    <UsersIcon size={20} className={chatMode === 'group' ? 'text-indigo-400' : ''} />
                    <span className="hidden md:block font-bold text-sm">Global Class</span>
                </button>

                <div className="mt-4 px-4 pb-2">
                    <h3 className="hidden md:block text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-2 mb-2">Direct</h3>
                </div>

                {/* Private Threads for Teacher */}
                {students.map(student => (
                    <button
                        key={student.id}
                        onClick={() => {
                            setSelectedUserId(student.id);
                            setChatMode('private');
                        }}
                        className={`p-4 flex items-center gap-3 transition-all ${chatMode === 'private' && selectedUserId === student.id ? 'bg-indigo-600/20 text-white border-l-4 border-indigo-500' : 'text-indigo-200/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                            {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover rounded-lg" /> : <UserIcon size={14} />}
                        </div>
                        <span className="hidden md:block font-bold text-xs truncate text-left flex-1">{student.full_name}</span>
                    </button>
                ))}

                {/* Fallback for selected but not in list (student side or newly assigned) */}
                {selectedUserId && !students.find(s => s.id === selectedUserId) && (
                    <button
                        onClick={() => setChatMode('private')}
                        className={`p-4 flex items-center gap-3 transition-all ${chatMode === 'private' ? 'bg-indigo-600/10 text-white' : 'text-indigo-200/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <MessageSquare size={20} className={chatMode === 'private' ? 'text-indigo-400' : ''} />
                        <span className="hidden md:block font-bold text-sm truncate">Member</span>
                    </button>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-white uppercase tracking-widest text-xs">
                        {chatMode === 'group' ? 'Global Class Chat' : 'Direct Message'}
                    </h3>
                    <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                    </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-gradient-to-b from-transparent to-black/20">
                    {currentMessages.map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.sender_id === user.id ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${msg.sender_id === user.id ? 'bg-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-white/10'}`}>
                                <UserIcon size={14} />
                            </div>
                            <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.sender_id === user.id
                                ? 'bg-indigo-600 text-white rounded-tr-none shadow-xl shadow-indigo-600/10'
                                : 'bg-white/5 text-indigo-100 rounded-tl-none border border-white/5'
                                }`}>
                                {msg.message_text}
                                <div className={`text-[9px] mt-1 opacity-40 font-bold uppercase tracking-widest ${msg.sender_id === user.id ? 'text-right' : ''}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {currentMessages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-indigo-200/20 space-y-4">
                            <MessageSquare size={48} className="opacity-10" />
                            <p className="font-black text-xs uppercase tracking-widest">No messages yet</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white/5 border-t border-white/10">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={chatMode === 'group' ? "Message class..." : "Send direct message..."}
                            className="w-full bg-[#020617] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-indigo-500/50 transition-all pr-14 shadow-inner"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!input.trim()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-20 translate-y-0.5"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
