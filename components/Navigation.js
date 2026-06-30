import React from 'react';
import htm from 'htm';
import { Home, Smile, BookOpen, Calendar, MessageCircle } from 'lucide-react';
const html = htm.bind(React.createElement);

const Navigation = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'mood', icon: Smile, label: 'Mood' },
        { id: 'journal', icon: BookOpen, label: 'Journal' },
        { id: 'calendar', icon: Calendar, label: 'Events' },
        { id: 'chat', icon: MessageCircle, label: 'Chat' },
    ];

    return html`
        <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md pb-8 pt-4 px-4 border-t border-white/5 flex justify-around items-center z-50">
            ${tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return html`
                    <button
                        key=${tab.id}
                        onClick=${() => setActiveTab(tab.id)}
                        className=${`flex flex-col items-center gap-1.5 transition-all duration-300 ${
                            isActive ? 'text-white' : 'text-zinc-600'
                        }`}
                    >
                        <${Icon} size=${22} strokeWidth=${isActive ? 2.5 : 2} />
                        <span className="text-[10px] font-medium tracking-wide uppercase">${tab.label}</span>
                        ${isActive && html`<div className="w-1 h-1 bg-white rounded-full mt-0.5" />`}
                    </button>
                `;
            })}
        </nav>
    `;
};

export default Navigation;