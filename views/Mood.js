import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
        { icon: 'ph:sun-duotone', label: 'Great', base: '#5B9FD4', mid: '#93C5FD', light: '#BFDBFE' },
        { icon: 'ph:heart-duotone', label: 'Loved', base: '#E879A0', mid: '#F9A8D4', light: '#FBCFE8' },
        { icon: 'ph:leaf-duotone', label: 'Calm', base: '#34C98A', mid: '#6EE7B7', light: '#A7F3D0' },
        { icon: 'ph:moon-stars-duotone', label: 'Tired', base: '#9170E8', mid: '#C4B5FD', light: '#DDD6FE' },
        { icon: 'ph:cloud-rain-duotone', label: 'Down', base: '#5B9FD4', mid: '#93C5FD', light: '#BAE6FD' },
        { icon: 'ph:fire-duotone', label: 'Angry', base: '#E85B5B', mid: '#FCA5A5', light: '#FECACA' },
        { icon: 'ph:wind-duotone', label: 'Anxious', base: '#3BACD4', mid: '#7DD3FC', light: '#BAE6FD' },
        { icon: 'ph:sparkle-duotone', label: 'Excited', base: '#E879A0', mid: '#F9A8D4', light: '#FDE68A' },
        { icon: 'ph:ghost-duotone', label: 'Lonely', base: '#8A99B0', mid: '#CBD5E1', light: '#E2E8F0' },
        { icon: 'ph:cloud-fog-duotone', label: 'Foggy', base: '#607488', mid: '#94A3B8', light: '#CBD5E1' },
        { icon: 'ph:heart-break-duotone', label: 'Betrayed', base: '#A855F7', mid: '#D8B4FE', light: '#EDE9FE' },
        { icon: 'ph:magnifying-glass-duotone', label: 'Curious', base: '#D4A017', mid: '#FCD34D', light: '#FEF08A' },
        { icon: 'ph:thermometer-hot-duotone', label: 'Hot', base: '#E85B5B', mid: '#FCA5A5', light: '#FDBA74' },
        { icon: 'ph:snowflake-duotone', label: 'Cold', base: '#3BACD4', mid: '#7DD3FC', light: '#BAE6FD' },
        { icon: 'ph:couch-duotone', label: 'Comfortable', base: '#3BAF78', mid: '#A3E6A0', light: '#D1FAE5' },
        { icon: 'ph:heartbeat-duotone', label: 'Horny', base: '#E05C78', mid: '#FDA4AF', light: '#FECDD3' },
    ];

    return html`
        <div className="px-6 pt-4 pb-12 relative text-[var(--text-primary)]">
            ${ReactDOM.createPortal(
                html`
                    <${AnimatePresence}>
                        ${toast && html`
                            <${motion.div}
                                initial=${{ y: 20, x: '-50%', opacity: 0 }}
                                animate=${{ y: 0, x: '-50%', opacity: 1 }}
                                exit=${{ y: 20, x: '-50%', opacity: 0 }}
                                style=${{ position: 'fixed', bottom: '96px', left: '50%', zIndex: 9999 }}
                                className="bg-zinc-900 text-white px-5 py-3 rounded-xl flex items-center gap-3 border border-white/10 whitespace-nowrap shadow-2xl"
                            >
                                <div className="bg-white/10 p-1 rounded-lg">
                                    <${CheckCircle2} size=${14} className="text-white" />
                                </div>
                                <span className="text-[13px] font-semibold tracking-tight">Mood updated to ${toast}</span>
                            </${motion.div}>
                        `}
                    </${AnimatePresence}>
                `,
                document.body
            )}

            <h1 className="text-3xl font-light mb-2">How are you?</h1>
            <p className="text-[var(--text-secondary)] font-light mb-8 tracking-tight">Updating your status for Hunter.</p>

            <div className="grid grid-cols-2 gap-[6px]">
                ${moods.map((mood) => html`
                    <button 
                        key=${mood.label} 
                        onClick=${() => handleSelectMood(mood)}
                        style=${{ 
                            background: mood.base,
                            boxShadow: `inset 0 0 70px 20px ${mood.mid}CC, inset 0 0 40px 12px rgba(255,255,255,0.4)`
                        }}
                        className="aspect-square rounded-full flex flex-col items-center justify-center relative overflow-hidden active:brightness-95 transition-all"
                    >
                        <!-- Grain overlay -->
                        <svg className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none" style=${{ mixBlendMode: 'overlay' }}>
                            <filter id=${'grain-' + mood.label}>
                                <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
                                <feColorMatrix type="saturate" values="0"/>
                            </filter>
                            <rect width="100%" height="100%" filter=${'url(#grain-' + mood.label + ')'}/>
                        </svg>
                        <div className="relative z-10 flex flex-col items-center justify-center gap-1.5">
                            <${Icon} 
                                icon=${mood.icon} 
                                style=${{ fontSize: '52px', color: 'rgba(255,255,255,0.7)' }}
                            />
                            <span className="font-normal text-[13px] text-white/90 tracking-wide leading-tight text-center">
                                ${mood.label}
                            </span>
                        </div>
                    </button>
                `)}
            </div>
        </div>
    `;
};

export default Mood;