import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MessageSquare, HelpCircle, Calendar } from 'lucide-react';
import { rtdb } from '../lib/firebase.js';
import { ref, onValue, query, limitToLast, orderByChild } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const Checkins = ({ currentUser }) => {
    const [checkins, setCheckins] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const historyRef = query(ref(rtdb, 'checkinsHistory'), orderByChild('timestamp'), limitToLast(50));
        const unsubscribe = onValue(historyRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => b.timestamp - a.timestamp);
                setCheckins(list);
            } else {
                setCheckins([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const formatTime = (ts) => {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (ts) => {
        const d = new Date(ts);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Today';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return html`
        <div className="px-6 pt-4 pb-24 text-[var(--text-primary)]">
            <div className="mb-8">
                <h1 className="text-3xl font-light mb-1">Check-ins</h1>
                <p className="text-[var(--text-secondary)] font-light">A history of how we've been.</p>
            </div>

            <div className="space-y-6">
                ${loading ? html`
                    <div className="flex justify-center py-20">
                        <${Loader2} className="animate-spin text-zinc-500" />
                    </div>
                ` : checkins.length === 0 ? html`
                    <div className="text-center py-20 px-10">
                        <div className="w-16 h-16 bg-[var(--card-bg)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--card-border)]">
                            <${Calendar} size=${24} className="text-[var(--text-secondary)]" />
                        </div>
                        <p className="text-[var(--text-secondary)] italic text-sm">No check-ins yet. Use the daily prompt on Home!</p>
                    </div>
                ` : checkins.map((item) => html`
                    <motion.div 
                        initial=${{ opacity: 0, y: 10 }}
                        animate=${{ opacity: 1, y: 0 }}
                        key=${item.id}
                        className="bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--card-border)] overflow-hidden shadow-sm flex flex-col"
                    >
                        <div className="p-6">
                            <!-- Header: User and Meta -->
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-black/5">
                                        <img 
                                            src=${item.userId === 'hunter' ? 'hunter.png' : 'nate.png'} 
                                            className="w-full h-full object-cover" 
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold leading-none">${item.userName}</h3>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mt-1.5">
                                            ${formatDate(item.timestamp)} • ${formatTime(item.timestamp)}
                                        </p>
                                    </div>
                                </div>
                                
                                ${item.mood && html`
                                    <div className="flex items-center gap-2 bg-black/5 px-3 py-1.5 rounded-full border border-black/5">
                                        <${Icon} icon=${item.mood.icon} className="text-lg" style=${{ color: item.mood.base }} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                                            ${item.mood.label}
                                        </span>
                                    </div>
                                `}
                            </div>

                            <!-- Content Sections -->
                            <div className="space-y-5">
                                ${item.journal && html`
                                    <div className="flex gap-4">
                                        <div className="mt-1 shrink-0"><${MessageSquare} size=${16} className="text-[var(--text-secondary)] opacity-40" /></div>
                                        <p className="text-base font-light italic leading-relaxed text-[var(--text-primary)]">
                                            "${item.journal}"
                                        </p>
                                    </div>
                                `}

                                ${item.question && html`
                                    <div className="bg-black/5 rounded-2xl p-4 border border-black/5 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <${HelpCircle} size=${14} className="text-[var(--text-secondary)] opacity-60" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Daily Prompt</span>
                                        </div>
                                        <p className="text-xs font-bold leading-tight text-[var(--text-secondary)]">
                                            ${item.question.text}
                                        </p>
                                        <div className="h-px bg-black/5" />
                                        <p className="text-sm font-medium leading-relaxed text-[var(--text-primary)]">
                                            ${item.question.answer}
                                        </p>
                                    </div>
                                `}
                            </div>
                        </div>
                    </motion.div>
                `)}
            </div>
        </div>
    `;
};

export default Checkins;