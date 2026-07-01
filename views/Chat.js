import React, { useState, useEffect, useRef } from 'react';
import htm from 'htm';
import { Send, Mic, Loader2 } from 'lucide-react';
import { rtdb } from '../lib/firebase.js';
import { ref, push, onValue, limitToLast, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const Chat = ({ currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isPartnerOnline, setIsPartnerOnline] = useState(false);
    const [partnerImg, setPartnerImg] = useState(currentUser?.id === 'hunter' ? 'nate.png' : 'hunter.png');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

    useEffect(() => {
        const partnerId = currentUser?.id === 'hunter' ? 'nate' : 'hunter';
        const partnerStatusRef = ref(rtdb, `status/${partnerId}`);
        const unsubStatus = onValue(partnerStatusRef, (snap) => {
            const status = snap.val();
            setIsPartnerOnline(status?.state === 'online');
        });

        const partnerImgRef = ref(rtdb, `users/${partnerId}/profileImage`);
        const unsubImg = onValue(partnerImgRef, (snap) => {
            if (snap.val()) setPartnerImg(snap.val());
        });

        const messagesRef = query(ref(rtdb, 'messages'), limitToLast(50));
        const unsubscribe = onValue(messagesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                setMessages(list);
            }
            setLoading(false);
        });
        return () => {
            unsubscribe();
            unsubStatus();
            unsubImg();
        };
    }, [currentUser]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = () => {
        if (!inputText.trim()) return;
        const messagesRef = ref(rtdb, 'messages');
        const msgData = {
            sender: currentUser?.name || 'Unknown',
            text: inputText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        push(messagesRef, msgData);

        // Trigger Alert
        push(ref(rtdb, 'alerts'), {
            authorId: currentUser?.id,
            author: currentUser?.name,
            text: inputText,
            type: 'chat',
            timestamp: serverTimestamp()
        });

        setInputText('');
    };

    const partnerName = currentUser?.name === 'Hunter' ? 'Nate' : 'Hunter';

    return html`
        <div className="flex flex-col h-full bg-[var(--bg-color)]">
            <div className="px-6 pt-8 pb-4 border-b border-black/5 flex items-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-black/5">
                        <img src=${partnerImg} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className=${`absolute bottom-0 right-0 w-3 h-3 border-2 border-[var(--bg-color)] rounded-full transition-colors duration-500 ${isPartnerOnline ? 'bg-emerald-500' : 'bg-zinc-400'}`}></div>
                </div>
                <div>
                    <h2 className="font-bold text-[var(--text-primary)]">${partnerName}</h2>
                    <p className=${`text-[10px] uppercase font-bold transition-colors ${isPartnerOnline ? 'text-emerald-600' : 'text-[var(--text-secondary)]'}`}>
                        ${isPartnerOnline ? 'Online' : 'In-app'}
                    </p>
                </div>
            </div>

            <div ref=${scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                ${loading ? html`
                    <div className="flex justify-center py-12"><${Loader2} className="animate-spin text-zinc-400" /></div>
                ` : messages.map((msg) => {
                    const isMe = msg.sender === currentUser?.name;
                    return html`
                        <div key=${msg.id} className=${`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className=${`max-w-[80%] p-4 rounded-3xl text-sm shadow-sm ${
                                isMe ? 'bg-white text-[var(--text-primary)] rounded-tr-none' : 'bg-white/70 text-[var(--text-primary)] rounded-tl-none border border-black/5'
                            }`}>
                                ${msg.text}
                            </div>
                            <span className="text-[10px] text-[var(--text-secondary)] opacity-60 mt-1 px-1">${msg.time}</span>
                        </div>
                    `;
                })}
            </div>

            <div className="px-4 pt-4 pb-1 bg-[var(--bg-color)] border-t border-black/5">
                <div className="bg-white/40 p-2 rounded-3xl flex items-center gap-2 border border-black/5">
                    <div className="pl-2" />
                    <input 
                        type="text" 
                        value=${inputText}
                        onChange=${e => setInputText(e.target.value)}
                        onKeyPress=${e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Say something..." 
                        className="flex-1 bg-transparent border-0 focus:ring-0 text-sm py-2 px-1 text-[var(--text-primary)] outline-none"
                    />
                    <button 
                        onClick=${handleSendMessage}
                        className="p-2 text-white bg-zinc-800 rounded-full active:scale-95 transition-transform"
                    >
                        <${Send} size=${18}/>
                    </button>
                </div>
            </div>
        </div>
    `;
};

export default Chat;