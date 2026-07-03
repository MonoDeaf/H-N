import React, { useState } from 'react';
import htm from 'htm';
import { 
    Home, Smile, BookOpen, Calendar, MessageCircle, 
    ChevronUp, ChevronDown, Settings, Heart, Bell, List,
    Music, Globe, ListTodo
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const html = htm.bind(React.createElement);

const Navigation = ({ activeTab, setActiveTab, isExpanded, setIsExpanded }) => {
    const primaryTabs = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'mood', icon: Smile, label: 'Mood' },
        { id: 'chat', icon: MessageCircle, label: 'Chat' },
    ];

    const secondaryTabs = [
        { id: 'journal', icon: BookOpen, label: 'Journal' },
        { id: 'calendar', icon: Calendar, label: 'Events' },
        { id: 'checklist', icon: ListTodo, label: 'To-do' },
        { id: 'bucketlist', icon: List, label: 'Bucket' },
        { id: 'music', icon: Music, label: 'Music' },
        { id: 'profiles', icon: Globe, label: 'Profiles' },
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
                                    isActive ? 'text-[var(--text-primary)]' : 'text-zinc-500'
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
                            isExpanded ? 'text-[var(--text-primary)]' : 'text-zinc-500'
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
                            className="overflow-hidden"
                        >
                            <div className="px-8 pb-10 pt-2">
                                <div className="grid grid-cols-3 gap-y-8 gap-x-4 mb-10">
                                    ${secondaryTabs.map((tab) => {
                                        const Icon = tab.icon;
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
                                                    <${Icon} size=${24} />
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">${tab.label}</span>
                                            </button>
                                        `;
                                    })}
                                </div>
                                
                                <div className="pt-6 border-t border-black/5">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Partner Tools</span>
                                        <div className="flex gap-4">
                                            <${Bell} size=${14} className="text-zinc-300" />
                                            <${Heart} size=${14} className="text-zinc-300" />
                                        </div>
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