import React, { useState } from 'react';
import htm from 'htm';
import { 
    Home, Smile, BookOpen, Calendar, MessageCircle, 
    ChevronUp, ChevronDown, Settings, Heart, Bell, List,
    Music, Globe, ListTodo
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const html = htm.bind(React.createElement);

const Navigation = ({ activeTab, setActiveTab }) => {
    const [isExpanded, setIsExpanded] = useState(false);

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
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
            <${motion.div}
                initial=${false}
                animate=${{
                    height: isExpanded ? 'auto' : '88px', // Fixed height for primary row
                }}
                transition=${{ 
                    type: 'spring', 
                    damping: 30, 
                    stiffness: 250, 
                    mass: 1
                }}
                className="bg-[var(--nav-bg)] backdrop-blur-2xl border-t border-black/5 rounded-t-[2.5rem] overflow-hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pointer-events-auto"
            >
                <!-- Expanded Content -->
                <${AnimatePresence}>
                    ${isExpanded && html`
                        <${motion.div}
                            key="expanded-content"
                            initial=${{ opacity: 0, y: 20 }}
                            animate=${{ opacity: 1, y: 0 }}
                            exit=${{ opacity: 0, y: 10 }}
                            transition=${{ 
                                duration: 0.2
                            }}
                            className="px-8 pt-10 pb-6"
                        >
                            <div className="grid grid-cols-3 gap-8 mb-8">
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
                        </${motion.div}>
                    `}
                </${AnimatePresence}>

                <!-- Main Navigation Row -->
                <nav className="px-8 flex justify-between items-center h-[88px]">
                    ${primaryTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id && !isExpanded;
                        return html`
                            <button
                                key=${tab.id}
                                onClick=${() => handleTabClick(tab.id)}
                                className=${`flex flex-col items-center gap-1 transition-all duration-300 relative ${
                                    isActive ? 'text-[var(--text-primary)] scale-110' : 'text-zinc-500'
                                }`}
                            >
                                <${Icon} size=${22} strokeWidth=${isActive ? 2.5 : 2} />
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
            </${motion.div}>
        </div>
    `;
};

export default Navigation;