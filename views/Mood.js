import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { Icon } from '@iconify/react';
import { CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb } from '../lib/firebase.js';
import { ref, set, push, onValue, limitToLast, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const Mood = ({ currentUser }) => {
    const [history, setHistory] = useState([]);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!currentUser) return;
        const moodHistoryRef = query(ref(rtdb, `moodHistory/${currentUser.id}`), limitToLast(15));
        const unsubscribe = onValue(moodHistoryRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setHistory(Object.values(data).reverse());
            }
        });
        return () => unsubscribe();
    }, [currentUser]);

    const handleSelectMood = async (mood) => {
        if (!currentUser) return;
        
        try {
            // Update current shared state
            await set(ref(rtdb, `users/${currentUser.id}/mood`), {
                label: mood.label,
                icon: mood.icon,
                timestamp: Date.now()
            });

            // Add to history
            await push(ref(rtdb, `moodHistory/${currentUser.id}`), {
                label: mood.label,
                icon: mood.icon,
                timestamp: Date.now()
            });

            setToast(mood.label);
            setTimeout(() => setToast(null), 3000);
        } catch (e) {
            console.error(e);
        }
    };

    const moods = [
        { icon: 'ph:sun-duotone', label: 'Great', colors: ['#4facfe', '#00f2fe', '#ffd700'] },
        { icon: 'ph:heart-duotone', label: 'Loved', colors: ['#ff9a9e', '#fecfef', '#ff6b6b'] },
        { icon: 'ph:leaf-duotone', label: 'Calm', colors: ['#a8e063', '#56ab2f', '#20bf55'] },
        { icon: 'ph:moon-stars-duotone', label: 'Tired', colors: ['#667eea', '#764ba2', '#a18cd1'] },
        { icon: 'ph:cloud-rain-duotone', label: 'Down', colors: ['#30cfd0', '#330867', '#5f72bd'] },
        { icon: 'ph:fire-duotone', label: 'Angry', colors: ['#f83600', '#f9d423', '#ff4e00'] },
        { icon: 'ph:wind-duotone', label: 'Anxious', colors: ['#89f7fe', '#66a6ff', '#4facfe'] },
        { icon: 'ph:sparkle-duotone', label: 'Excited', colors: ['#f093fb', '#f5576c', '#ff0844'] },
        { icon: 'ph:ghost-duotone', label: 'Lonely', colors: ['#757f9a', '#d7dde8', '#bdc3c7'] },
        { icon: 'ph:cloud-fog-duotone', label: 'Foggy', colors: ['#e0e0e0', '#8e9eab', '#abbaba'] },
        { icon: 'ph:heart-break-duotone', label: 'Betrayed', colors: ['#4b0082', '#000000', '#800000'] },
        { icon: 'ph:magnifying-glass-duotone', label: 'Curious', colors: ['#F7971E', '#FFD200', '#00c6ff'] },
    ];

    return html`
        <div className="px-6 pt-4 pb-12 relative">
            <!-- Toast Notification -->
            <${AnimatePresence}>
                ${toast && html`
                    <${motion.div}
                        initial=${{ y: -20, opacity: 0 }}
                        animate=${{ y: 0, opacity: 1 }}
                        exit=${{ y: -20, opacity: 0 }}
                        className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
                    >
                        <${CheckCircle2} size=${18} className="text-emerald-500" />
                        <span className="text-sm font-bold tracking-tight">Mood updated to ${toast}</span>
                    </${motion.div}>
                `}
            </${AnimatePresence}>

            <h1 className="text-3xl font-bold mb-2 text-white">How are you?</h1>
            <p className="text-zinc-500 mb-10 tracking-tight">Updating your status for Hunter.</p>

            <div className="grid grid-cols-2 gap-3">
                ${moods.map((mood) => html`
                    <button 
                        key=${mood.label} 
                        onClick=${() => handleSelectMood(mood)}
                        className="h-40 rounded-[2rem] flex flex-col items-start justify-between p-6 active:scale-[0.98] transition-all duration-500 overflow-hidden relative group border border-white/5 bg-zinc-900/40"
                    >
                        <!-- Mesh Gradient Blobs -->
                        <div className="absolute inset-0 overflow-hidden opacity-50 pointer-events-none">
                            <div 
                                className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-[40px] transition-transform duration-1000 group-hover:scale-125" 
                                style=${{ background: mood.colors[0] }} 
                            />
                            <div 
                                className="absolute -top-5 -right-5 w-24 h-24 rounded-full blur-[35px] transition-transform duration-1000 group-hover:scale-150 delay-75" 
                                style=${{ background: mood.colors[1] }} 
                            />
                            <div 
                                className="absolute -bottom-10 left-1/4 w-40 h-40 rounded-full blur-[45px] transition-transform duration-1000 group-hover:translate-y-4" 
                                style=${{ background: mood.colors[2] }} 
                            />
                        </div>

                        <!-- Subtle Noise/Glass Overlay -->
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-500" />
                        
                        <span className="font-bold text-xl text-white relative z-10 tracking-tight">
                            ${mood.label}
                        </span>
                        
                        <div className="w-full flex justify-end relative z-10">
                            <div className="p-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-colors">
                                <${Icon} 
                                    icon=${mood.icon} 
                                    className="text-3xl text-white drop-shadow-2xl transition-transform duration-500 group-hover:scale-110" 
                                />
                            </div>
                        </div>
                    </button>
                `)}
            </div>

            <div className="mt-12 bg-white/5 p-6 rounded-3xl border border-white/5">
                <h3 className="text-[10px] font-bold mb-4 text-zinc-500 uppercase tracking-widest">Your Previous Check-ins</h3>
                <div className="flex flex-wrap gap-3">
                    ${history.length === 0 ? html`
                        <p className="text-zinc-600 text-xs italic">No history yet.</p>
                    ` : history.map((m, i) => html`
                        <div key=${i} className="w-12 h-12 rounded-2xl bg-zinc-800 border border-white/5 flex items-center justify-center">
                            <${Icon} icon=${m.icon} className="text-2xl text-white/50" />
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;
};

export default Mood;