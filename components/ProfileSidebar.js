import React from 'react';
import htm from 'htm';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, ChevronRight, Lock, Bell, LogOut, Check, Loader2 } from 'lucide-react';
import { Icon } from '@iconify/react';

const html = htm.bind(React.createElement);

const ProfileSidebar = ({ 
    isOpen, 
    onClose, 
    currentUser, 
    currentUserImage, 
    isUploading,
    anniversary, 
    onUpdateAnniversary, 
    onLogout, 
    onImageClick, 
    onPasscodeClick,
    onNotificationClick,
    notificationPermission,
    theme,
    setTheme
}) => {
    return html`
        <${AnimatePresence}>
            ${isOpen && html`
                <${motion.div}
                    initial=${{ opacity: 0 }}
                    animate=${{ opacity: 1 }}
                    exit=${{ opacity: 0 }}
                    className="fixed inset-0 bg-black/30 backdrop-blur-md z-[5000] flex justify-end"
                    onClick=${onClose}
                >
                    <${motion.div}
                        initial=${{ opacity: 0, x: 20 }}
                        animate=${{ opacity: 1, x: 0 }}
                        exit=${{ opacity: 0, x: 20 }}
                        className="bg-[var(--modal-bg)] w-80 h-full shadow-2xl p-8 flex flex-col overflow-y-auto no-scrollbar"
                        onClick=${e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Profile</h2>
                            <button onClick=${onClose} className="p-2 bg-black/5 rounded-full text-[var(--text-secondary)]">
                                <${X} size=${20} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center mb-10">
                            <div className="relative mb-4">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-black/10 relative">
                                    <img src=${currentUserImage} alt=${currentUser?.name} className="w-full h-full object-cover" />
                                    ${isUploading && html`
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                            <${Loader2} className="animate-spin text-white/70" size=${24} />
                                        </div>
                                    `}
                                </div>
                                <button 
                                    disabled=${isUploading}
                                    onClick=${onImageClick} 
                                    className="absolute bottom-0 right-0 p-2 bg-[var(--text-primary)] text-[var(--bg-color)] rounded-full active:scale-90 transition-transform disabled:opacity-50"
                                >
                                    <${ImageIcon} size=${14} />
                                </button>
                            </div>
                            <h3 className="text-lg font-bold">${currentUser?.name}</h3>
                        </div>

                        <div className="space-y-2">
                            <button onClick=${onImageClick} className="w-full flex items-center justify-between p-4 bg-[var(--input-bg)] hover:bg-white/10 rounded-2xl transition-colors group border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl"><${ImageIcon} size=${18} /></div>
                                    <span className="font-medium text-[var(--text-primary)]">Change Image</span>
                                </div>
                                <${ChevronRight} size=${16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                            </button>

                            <button onClick=${onPasscodeClick} className="w-full flex items-center justify-between p-4 bg-[var(--input-bg)] hover:bg-white/10 rounded-2xl transition-colors group border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-800 text-zinc-400 rounded-xl"><${Lock} size=${18} /></div>
                                    <span className="font-medium text-[var(--text-primary)]">Passcode Options</span>
                                </div>
                                <${ChevronRight} size=${16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                            </button>

                            <button 
                                onClick=${() => {
                                    onClose();
                                    window.dispatchEvent(new CustomEvent('open-relationship-settings'));
                                }} 
                                className="w-full flex items-center justify-between p-4 bg-[var(--input-bg)] hover:bg-white/10 rounded-2xl transition-colors group border border-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                                        <${Icon} icon="ph:calendar-heart-duotone" className="text-lg" />
                                    </div>
                                    <span className="font-medium text-[var(--text-primary)]">Us Details</span>
                                </div>
                                <${ChevronRight} size=${16} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                            </button>

                            <div className="p-4 bg-[var(--input-bg)] rounded-2xl border border-white/5 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><${Bell} size=${18} /></div>
                                    <span className="font-medium text-[var(--text-primary)]">Notifications</span>
                                </div>
                                ${notificationPermission === 'granted' ? html`
                                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                                        <${Check} size=${14} /><span className="text-[11px] font-bold uppercase tracking-wider">Enabled</span>
                                    </div>
                                ` : html`
                                    <button onClick=${onNotificationClick} className="w-full bg-zinc-800 text-white text-[11px] font-bold uppercase tracking-widest py-3 rounded-xl">Enable Push Alerts</button>
                                `}
                            </div>

                            <div className="p-4 bg-[var(--input-bg)] rounded-2xl border border-white/5 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-800 text-zinc-400 rounded-xl">
                                        <${Icon} icon="ph:palette-duotone" className="text-lg" />
                                    </div>
                                    <span className="font-medium text-[var(--text-primary)]">App Theme</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick=${() => setTheme('dark')}
                                        className=${`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                            theme === 'dark' 
                                            ? 'bg-zinc-800 text-white border-transparent' 
                                            : 'bg-white/5 text-[var(--text-secondary)] border-white/5'
                                        }`}
                                    >Dark</button>
                                    <button 
                                        onClick=${() => setTheme('light')}
                                        className=${`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                            theme === 'light' 
                                            ? 'bg-white text-black border-transparent' 
                                            : 'bg-white/5 text-[var(--text-secondary)] border-white/5'
                                        }`}
                                    >Light</button>
                                    <button 
                                        onClick=${() => setTheme('earth')}
                                        className=${`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                            theme === 'earth' 
                                            ? 'bg-[#0c0c09] text-[#abab9c] border-transparent' 
                                            : 'bg-white/5 text-[var(--text-secondary)] border-white/5'
                                        }`}
                                    >Earth</button>
                                </div>
                            </div>

                            <button onClick=${onLogout} className="w-full flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 rounded-2xl transition-colors group border border-red-500/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/10 text-red-500 rounded-xl"><${LogOut} size=${18} /></div>
                                    <span className="font-medium text-red-500">Log Out</span>
                                </div>
                                <${ChevronRight} size=${16} className="text-red-500/30 group-hover:text-red-500/60 transition-colors" />
                            </button>
                        </div>
                    </${motion.div}>
                </${motion.div}>
            `}
        </${AnimatePresence}>
    `;
};

export default ProfileSidebar;