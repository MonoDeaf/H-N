import React, { useState, useEffect, useRef } from 'react';
import htm from 'htm';
import { Send, Mic, Loader2 } from 'lucide-react';
import { rtdb, increment, update } from '../lib/firebase.js';
import { ref, push, onValue, limitToLast, query, serverTimestamp, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;
        const currentMsgText = inputText; // Capture text before clearing input
        const messagesRef = ref(rtdb, 'messages');
        const msgData = {
            sender: currentUser?.name || 'Unknown',
            text: currentMsgText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now()
        };
        
        try {
            await push(messagesRef, msgData);

            // Award 1 Point
            const pointsUpdate = {};
            pointsUpdate[`settings/points/${currentUser.id}`] = increment(1);
            await update(ref(rtdb), pointsUpdate);

            // Trigger Alert
            await push(ref(rtdb, 'alerts'), {
                authorId: currentUser?.id,
                author: currentUser?.name,
                text: currentMsgText,
                type: 'chat',
                timestamp: serverTimestamp()
            });

            // Trigger Make.com Webhook for Push Notifications
            const recipientId = currentUser?.id === 'hunter' ? 'nate' : 'hunter';
            const recipientName = currentUser?.id === 'hunter' ? 'Nate' : 'Hunter';

            // Fetch the recipient's FCM token from RTDB for Make.com to use
            const tokenSnap = await get(ref(rtdb, `users/${recipientId}/fcmToken`));
            const recipientFcmToken = tokenSnap.val();

            fetch('https://hook.us1.make.com/gv8mwbk06nzc82nceyounxd2gw37g1we', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderUid: currentUser?.id,
                    senderName: currentUser?.name,
                    recipientUid: recipientId,
                    recipientName: recipientName,
                    recipientFcmToken: recipientFcmToken,
                    text: currentMsgText,
                    timestamp: Date.now(),
                    eventType: 'chat_message'
                })
            }).catch(err => console.error("Webhook notification error:", err));

            setInputText('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const partnerName = currentUser?.name === 'Hunter' ? 'Nate' : 'Hunter';

    const formatRelativeTime = (timestamp) => {
        if (!timestamp) return '';
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return html`
        <div className="flex flex-col h-full bg-[var(--bg-color)]">
            <div className="px-6 pt-8 pb-4 border-b border-black/5 flex items-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-black/5">
                        <img src=${partnerImg} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div 
                        className=${`absolute bottom-0 right-0 w-3 h-3 border-2 border-[var(--bg-color)] rounded-full transition-colors duration-500 ${isPartnerOnline ? 'bg-emerald-500' : ''}`}
                        style=${!isPartnerOnline ? { backgroundColor: 'var(--indicator-inactive)' } : {}}
                    ></div>
                </div>
                <div>
                    <h2 className="font-medium text-[var(--text-primary)]">${partnerName}</h2>
                    <p className=${`text-[10px] uppercase font-light tracking-[0.15em] transition-colors ${isPartnerOnline ? 'text-emerald-600' : 'text-[var(--text-secondary)]'}`}>
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
                                isMe ? 'bg-[var(--bubble-me)] text-white rounded-tr-none' : 'bg-[var(--bubble-them)] text-[var(--text-primary)] rounded-tl-none border border-[var(--card-border)]'
                            }`}>
                                ${msg.text}
                            </div>
                            <span className="text-[10px] text-[var(--text-secondary)] opacity-60 mt-1 px-1">
                                ${formatRelativeTime(msg.timestamp)} • ${msg.time}
                            </span>
                        </div>
                    `;
                })}
            </div>

            <div className="px-4 pt-4 pb-1 bg-[var(--bg-color)] border-t border-white/5">
                <div className="bg-[var(--input-bg)] p-2 rounded-3xl flex items-center gap-2 border border-white/5">
                    <div className="pl-2" />
                    <input 
                        type="text" 
                        value=${inputText}
                        onChange=${e => setInputText(e.target.value)}
                        onKeyPress=${e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Say something..." 
                        className="flex-1 bg-transparent border-0 focus:ring-0 text-sm py-2 px-1 text-[var(--text-primary)] outline-none placeholder-zinc-600"
                    />
                    <button 
                        onClick=${handleSendMessage}
                        style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                        className="p-2 border border-white/10 rounded-full active:scale-95 transition-transform"
                    >
                        <${Send} size=${18}/>
                    </button>
                </div>
            </div>
        </div>
    `;
};

export default Chat;