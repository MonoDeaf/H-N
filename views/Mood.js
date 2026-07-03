import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { Icon } from '@iconify/react';
import { CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb } from '../lib/firebase.js';
import { ref, set, push, onValue, limitToLast, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const Mood = ({ currentUser }) => {
    const [toast, setToast] = useState(null);

    const handleSelectMood = async (mood) => {
        if (!currentUser) return;
        
        try {
            // Update current shared state
            await set(ref(rtdb, `users/${currentUser.id}/mood`), {
                label: mood.label,
                icon: mood.icon,
                timestamp: Date.now()
            });

            // Trigger Alert
            await push(ref(rtdb, 'alerts'), {
                authorId: currentUser.id,
                author: currentUser.name,
                text: `Feeling ${mood.label}`,
                type: 'mood',
                timestamp: serverTimestamp()
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
        <div className="px-6 pt-4 pb-12 relative text-[var(--text-primary)]">
            <!-- Toast Notification -->
            <${AnimatePresence}>
                ${toast && html`
                    <${motion.div}
                        initial=${{ y: 20, x: '-50%', opacity: 0 }}
                        animate=${{ y: 0, x: '-50%', opacity: 1 }}
                        exit=${{ y: 20, x: '-50%', opacity: 0 }}
                        className="fixed bottom-24 left-1/2 z-[100] bg-[#333] text-[#e8e8e8] px-5 py-3 rounded-xl flex items-center gap-3 border border-white/10 whitespace-nowrap shadow-2xl"
                    >
                        <div className="bg-white/10 p-1 rounded-lg">
                            <${CheckCircle2} size=${14} className="text-white" />
                        </div>
                        <span className="text-[13px] font-semibold tracking-tight">Mood updated to ${toast}</span>
                    </${motion.div}>
                `}
            </${AnimatePresence}>

            <h1 className="text-3xl font-bold mb-2">How are you?</h1>
            <p className="text-[var(--text-secondary)] mb-10 tracking-tight">Updating your status for Hunter.</p>

            <div className="grid grid-cols-2 gap-3">
                ${moods.map((mood) => html`
                    <button 
                        key=${mood.label} 
                        onClick=${() => handleSelectMood(mood)}
                        className="h-40 rounded-[2rem] flex flex-col items-start justify-between p-6 active:scale-[0.98] overflow-hidden relative group border border-[var(--card-border)] bg-white/70"
                    >
                        <!-- Mesh Gradient Blobs -->
                        <div className="absolute inset-0 overflow-hidden opacity-75 pointer-events-none">
                            <div 
                                className="absolute -top-10 -left-10 w-32 h-32 rounded-full blur-[40px]" 
                                style=${{ background: mood.colors[0] }} 
                            />
                            <div 
                                className="absolute -top-5 -right-5 w-24 h-24 rounded-full blur-[35px]" 
                                style=${{ background: mood.colors[1] }} 
                            />
                            <div 
                                className="absolute -bottom-10 left-1/4 w-40 h-40 rounded-full blur-[45px]" 
                                style=${{ background: mood.colors[2] }} 
                            />
                        </div>

                        <!-- Subtle Noise/Glass Overlay -->
                        <div className="absolute inset-0 bg-black/20" />
                        
                        <span className="font-bold text-xl text-white relative z-10 tracking-tight">
                            ${mood.label}
                        </span>
                        
                        <div className="w-full flex justify-end relative z-10">
                            <div className="p-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
                                <${Icon} 
                                    icon=${mood.icon} 
                                    className="text-3xl text-white drop-shadow-2xl" 
                                />
                            </div>
                        </div>
                    </button>
                `)}
            </div>


        </div>
    `;
};

export default Mood;