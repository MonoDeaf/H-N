import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { 
    Home, Smile, BookOpen, Calendar, MessageCircle, 
    ChevronUp, ChevronDown, Settings, Heart, Bell, List,
    Music, Globe, ListTodo, Layers, Camera, HelpCircle, Gift, Activity
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';

const html = htm.bind(React.createElement);

import { rtdb } from '../lib/firebase.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const Navigation = ({ activeTab, setActiveTab, isExpanded, setIsExpanded, currentUser }) => {
    const [userPoints, setUserPoints] = useState(0);

    useEffect(() => {
        if (!currentUser?.id) return;
        const pointsRef = ref(rtdb, `settings/points/${currentUser.id}`);
        return onValue(pointsRef, (snap) => {
            setUserPoints(snap.val() || 0);
        });
    }, [currentUser?.id]);

    const primaryTabs = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'checkins', icon: Smile, label: 'Check-ins' },
        { id: 'chat', icon: MessageCircle, label: 'Chat' },
    ];

    const secondaryTabs = [
        { id: 'journal', icon: BookOpen, label: 'Journal' },
        { id: 'questions', icon: HelpCircle, label: 'Questions' },
        { id: 'calendar', icon: Calendar, label: 'Events' },
        { id: 'timeline', icon: Layers, label: 'Timeline' },
        { id: 'checklist', icon: ListTodo, label: 'To-do' },
        { id: 'photos', icon: Camera, label: 'Photos' },
        { id: 'bucketlist', icon: List, label: 'Bucket' },
        { id: 'music', icon: Music, label: 'Music' },
        { id: 'gifts', icon: Gift, label: 'Gifts' },
        { id: 'profiles', icon: Globe, label: 'Links' },
    ];

    const gameTabs = [
        { id: 'cards', icon: 'ph:coins-duotone', label: 'Points', description: 'Rewards & rules', points: userPoints }
    ];

    const handleTabClick = (id) => {
        setActiveTab(id);
        setIsExpanded(false);
    };

    return html`
        <div className="relative pointer-events-none">
            <${motion.div}
                layout
                transition=${{ 
                    type: 'spring', 
                    damping: 30, 
                    stiffness: 250
                }}
                className="bg-[var(--nav-bg)] backdrop-blur-2xl border-t border-black/5 rounded-t-[2.5rem] overflow-hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pointer-events-auto"
            >
                <!-- Main Navigation Row (Always at the top of the menu) -->
                <nav className="px-8 flex justify-between items-center h-[88px] relative z-10">
                    ${primaryTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return html`
                            <button
                                key=${tab.id}
                                onClick=${() => handleTabClick(tab.id)}
                                className=${`flex flex-col items-center gap-1 transition-all duration-300 relative ${
                                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                                }`}
                            >
                                <div className=${`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                                    <${Icon} size=${22} strokeWidth=${isActive ? 2.5 : 2} />
                                </div>
                                <span className="text-[10px] font-bold tracking-wide uppercase">${tab.label}</span>
                                ${isActive && html`
                                    <${motion.div} 
                                        layoutId="active-dot"
                                        className="w-1 h-1 bg-[var(--text-primary)] rounded-full mt-0.5" 
                                    />
                                `}
                            </button>
                        `;
                    })}

                    <!-- Expand Toggle Button -->
                    <button
                        onClick=${() => setIsExpanded(!isExpanded)}
                        className=${`flex flex-col items-center gap-1 transition-all duration-300 ${
                            isExpanded ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                        }`}
                    >
                        <${motion.div} 
                            animate=${{ rotate: isExpanded ? 180 : 0 }}
                            className="p-0.5 flex items-center justify-center"
                        >
                            <${ChevronUp} size=${22} />
                        </${motion.div}>
                        <span className="text-[10px] font-bold tracking-wide uppercase">${isExpanded ? 'Less' : 'More'}</span>
                    </button>
                </nav>

                <!-- Expanded Content (Now below the main nav row) -->
                <${AnimatePresence} initial=${false}>
                    ${isExpanded && html`
                        <${motion.div}
                            key="expanded-content"
                            layout
                            className="max-h-[60vh] overflow-y-auto no-scrollbar"
                        >
                            <div className="px-8 pb-12 pt-2">
                                <!-- Tools Section -->
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span style=${{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.01em', color: 'var(--eyebrow-text)' }}>Tools</span>
                                    </div>
                                    <div className="h-px w-full bg-black/5 mb-6" />
                                    <div className="grid grid-cols-3 gap-y-8 gap-x-4">
                                        ${secondaryTabs.map((tab) => {
                                            const IconComp = tab.icon;
                                            const isActive = activeTab === tab.id;
                                            return html`
                                                <button
                                                    key=${tab.id}
                                                    onClick=${() => !tab.disabled && handleTabClick(tab.id)}
                                                    className=${`flex flex-col items-center gap-3 transition-all ${
                                                        isActive ? 'text-[var(--text-primary)]' : (tab.disabled ? 'text-zinc-400' : 'text-[var(--text-secondary)]')
                                                    }`}
                                                >
                                                    <div className=${`p-4 rounded-2xl transition-colors ${
                                                        isActive ? 'bg-black/10' : 'bg-black/5'
                                                    }`}>
                                                        <${IconComp} size=${24} />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">${tab.label}</span>
                                                </button>
                                            `;
                                        })}
                                    </div>
                                </div>

                                <!-- Games Section -->
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span style=${{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.01em', color: 'var(--eyebrow-text)' }}>Games</span>
                                    </div>
                                    <div className="h-px w-full bg-black/5 mb-6" />
                                    <div className="space-y-4">
                                        ${gameTabs.map(game => html`
                                            <button
                                                key=${game.id}
                                                onClick=${() => handleTabClick(game.id)}
                                                className="w-full bg-[var(--card-bg)] rounded-[1.5rem] flex items-stretch text-[var(--text-primary)] active:scale-[0.98] transition-all relative overflow-hidden group border border-[var(--card-border)]"
                                            >
                                                <div className="flex-1 p-6 text-left flex flex-col justify-center">
                                                    <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">${game.description}</div>
                                                    <div className="text-3xl font-bold tracking-tight">${game.label}</div>
                                                </div>
                                                <div className="w-24 bg-black/[0.03] flex flex-col items-center justify-center border-l border-black/5 relative overflow-hidden">
                                                    <${Icon} icon="ph:ticket-duotone" style=${{ fontSize: '140px', color: 'var(--text-primary)', opacity: 0.07, position: 'absolute', bottom: '-40px', right: '-40px', transform: 'rotate(15deg)' }} />
                                                    <span className="text-4xl font-light tracking-tighter text-[var(--text-primary)] relative z-10">${game.points || 0}</span>
                                                </div>
                                            </button>
                                        `)}
                                    </div>
                                </div>
                            </div>
                        </${motion.div}>
                    `}
                </${AnimatePresence}>
            </${motion.div}>
        </div>
    `;
};

export default Navigation;