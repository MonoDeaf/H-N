import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { MessageSquare, Image as ImageIcon, ChevronRight, X, Lock, Check, Delete, Loader2, LogOut } from 'lucide-react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb } from './lib/firebase.js';
import { ref, set, onValue, query, limitToLast, orderByChild } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const Home = ({ currentUser, onLogout }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isChangingPasscode, setIsChangingPasscode] = useState(false);
    const [newPasscode, setNewPasscode] = useState('');
    const [passcodeSuccess, setPasscodeSuccess] = useState(false);
    const [hunterImg, setHunterImg] = useState('hunter.png');
    const [nateImg, setNateImg] = useState('nate.png');
    const fileInputRef = React.useRef(null);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file && currentUser) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Image = reader.result;
                try {
                    await set(ref(rtdb, `users/${currentUser.id}/profileImage`), base64Image);
                } catch (err) {
                    console.error("Error updating profile image:", err);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const moodIcons = {
        'Great': 'ph:sun-duotone',
        'Loved': 'ph:heart-duotone',
        'Calm': 'ph:leaf-duotone',
        'Tired': 'ph:moon-stars-duotone',
        'Down': 'ph:cloud-rain-duotone',
        'Angry': 'ph:fire-duotone',
        'Anxious': 'ph:wind-duotone',
        'Excited': 'ph:sparkle-duotone',
        'Lonely': 'ph:ghost-duotone',
        'Foggy': 'ph:cloud-fog-duotone',
        'Betrayed': 'ph:heart-break-duotone',
        'Curious': 'ph:magnifying-glass-duotone'
    };

    const [hunterMood, setHunterMood] = useState({ label: 'Calm', icon: moodIcons['Calm'] });
    const [nateMood, setNateMood] = useState({ label: 'Calm', icon: moodIcons['Calm'] });
    const [presence, setPresence] = useState({ hunter: 'offline', nate: 'offline' });
    const [latestJournals, setLatestJournals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Sync Moods
        const hunterRef = ref(rtdb, 'users/hunter/mood');
        const nateRef = ref(rtdb, 'users/nate/mood');

        const unsubHunter = onValue(hunterRef, (snap) => snap.val() && setHunterMood(snap.val()));
        const unsubNate = onValue(nateRef, (snap) => snap.val() && setNateMood(snap.val()));

        // Sync Profile Images
        const hunterImgRef = ref(rtdb, 'users/hunter/profileImage');
        const nateImgRef = ref(rtdb, 'users/nate/profileImage');
        const unsubHunterImg = onValue(hunterImgRef, (snap) => snap.val() && setHunterImg(snap.val()));
        const unsubNateImg = onValue(nateImgRef, (snap) => snap.val() && setNateImg(snap.val()));

        // Presence Logic
        const presenceRef = ref(rtdb, 'status');
        const unsubPresence = onValue(presenceRef, (snap) => {
            const data = snap.val();
            if (data) {
                setPresence({
                    hunter: data.hunter?.state || 'offline',
                    nate: data.nate?.state || 'offline'
                });
            }
        });

        // Sync Latest Journals
        const journalRef = query(ref(rtdb, 'journal'), orderByChild('createdAt'), limitToLast(3));
        const unsubJournal = onValue(journalRef, (snap) => {
            const data = snap.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => b.createdAt - a.createdAt);
                setLatestJournals(list);
            } else {
                setLatestJournals([]);
            }
            setLoading(false);
        });

        return () => {
            unsubHunter();
            unsubNate();
            unsubHunterImg();
            unsubNateImg();
            unsubPresence();
            unsubJournal();
        };
    }, []);

    const currentUserImage = currentUser?.id === 'hunter' ? hunterImg : nateImg;

    return html`
        <div className="px-6 pt-4 pb-12 animate-in fade-in duration-700 relative">
            <!-- Profile Pill -->
            <div className="flex justify-end mb-2">
                <button 
                    onClick=${() => setIsProfileOpen(true)}
                    className="flex items-center gap-2 bg-zinc-900/50 hover:bg-zinc-800/80 border border-white/5 py-1.5 pl-1.5 pr-3 rounded-full transition-all active:scale-95"
                >
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10">
                        <img src=${currentUserImage} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-medium text-zinc-300">${currentUser?.name || 'User'}</span>
                </button>
            </div>

            <div className="flex justify-center items-center mb-8 relative">
                <div className="relative flex items-center">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-black shadow-2xl relative z-10 translate-x-4">
                        <img src=${hunterImg} alt="Hunter" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-black shadow-2xl relative z-0 -translate-x-4">
                        <img src=${nateImg} alt="Nate" className="w-full h-full object-cover grayscale-[0.2]" />
                    </div>
                </div>
            </div>

            <div className="flex justify-between px-10 mb-12">
                <div className="text-center flex flex-col items-center">
                    <h2 className="text-xl font-semibold mb-1">Hunter</h2>
                    <div className="flex items-center gap-1.5">
                        <div className=${`w-1.5 h-1.5 rounded-full ${presence.hunter === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-zinc-600'}`} />
                        <p className=${`text-[10px] font-bold uppercase tracking-widest ${presence.hunter === 'online' ? 'text-emerald-500' : 'text-zinc-600'}`}>
                            ${presence.hunter === 'online' ? 'Online' : 'Away'}
                        </p>
                    </div>
                </div>
                <div className="text-center flex flex-col items-center">
                    <h2 className="text-xl font-semibold mb-1">Nate</h2>
                    <div className="flex items-center gap-1.5">
                        <div className=${`w-1.5 h-1.5 rounded-full ${presence.nate === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-zinc-600'}`} />
                        <p className=${`text-[10px] font-bold uppercase tracking-widest ${presence.nate === 'online' ? 'text-emerald-500' : 'text-zinc-600'}`}>
                            ${presence.nate === 'online' ? 'Online' : 'Away'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <section>
                    <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest px-1 mb-4">Mood Check-ins</h3>
                    <div className="space-y-4">
                        <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                        <img src=${hunterImg} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-medium">Hunter <span className="text-zinc-500">is</span> ${hunterMood.label}</span>
                                </div>
                                <${Icon} icon=${hunterMood.icon} className="text-2xl text-white" />
                            </div>
                        </div>

                        <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                        <img src=${nateImg} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-medium">Nate <span className="text-zinc-500">is</span> ${nateMood.label}</span>
                                </div>
                                <${Icon} icon=${nateMood.icon} className="text-2xl text-white" />
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest px-1 mb-4">Latest Shared Thoughts</h3>
                    <div className="space-y-3">
                        ${loading ? html`
                            <div className="flex justify-center py-6"><${Loader2} className="animate-spin text-zinc-700" /></div>
                        ` : latestJournals.length === 0 ? html`
                            <p className="text-center text-zinc-600 italic text-sm">No thoughts shared yet.</p>
                        ` : latestJournals.map(journal => html`
                            <div className="bg-white/5 p-4 rounded-3xl flex items-start gap-4 border border-white/5 animate-in fade-in slide-in-from-bottom-2">
                                <div className="mt-1"><${MessageSquare} size=${18} className="text-zinc-600" /></div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-zinc-400 text-[10px] font-bold uppercase">${journal.author} • ${journal.title}</h4>
                                        <span className="text-zinc-600 text-[10px] uppercase">${journal.dateLabel || 'Today'}</span>
                                    </div>
                                    <p className="text-zinc-200 text-sm italic leading-relaxed">"${journal.content}"</p>
                                </div>
                            </div>
                        `)}
                    </div>
                </section>
            </div>

            <!-- Profile Sidebar/Modal -->
            <${AnimatePresence}>
                ${isProfileOpen && html`
                    <${motion.div}
                        initial=${{ opacity: 0 }}
                        animate=${{ opacity: 1 }}
                        exit=${{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex justify-end"
                        onClick=${() => setIsProfileOpen(false)}
                    >
                        <${motion.div}
                            initial=${{ x: '100%' }}
                            animate=${{ x: 0 }}
                            exit=${{ x: '100%' }}
                            transition=${{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-zinc-900 w-80 h-full shadow-2xl p-8 flex flex-col"
                            onClick=${e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-xl font-bold">Profile</h2>
                                <button 
                                    onClick=${() => setIsProfileOpen(false)}
                                    className="p-2 bg-white/5 rounded-full text-zinc-400"
                                >
                                    <${X} size=${20} />
                                </button>
                            </div>

                            <div className="flex flex-col items-center mb-10">
                                <div className="relative mb-4">
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10">
                                        <img src=${currentUserImage} alt=${currentUser?.name} className="w-full h-full object-cover" />
                                    </div>
                                    <button 
                                        onClick=${() => fileInputRef.current.click()}
                                        className="absolute bottom-0 right-0 p-2 bg-white text-black rounded-full shadow-lg active:scale-90 transition-transform"
                                    >
                                        <${ImageIcon} size=${14} />
                                    </button>
                                </div>
                                <h3 className="text-lg font-bold">${currentUser?.name}</h3>
                                <p className="text-zinc-500 text-sm">Joined May 2024</p>
                            </div>

                            <div className="space-y-2">
                                <input 
                                    type="file" 
                                    ref=${fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange=${handleImageChange}
                                />
                                <button 
                                    onClick=${() => fileInputRef.current.click()}
                                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                                            <${ImageIcon} size=${18} />
                                        </div>
                                        <span className="font-medium">Change Image</span>
                                    </div>
                                    <${ChevronRight} size=${16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                </button>

                                <button 
                                    onClick=${() => setIsChangingPasscode(true)}
                                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-zinc-800 text-zinc-400 rounded-xl">
                                            <${Lock} size=${18} />
                                        </div>
                                        <span className="font-medium">Passcode Options</span>
                                    </div>
                                    <${ChevronRight} size=${16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                </button>

                                <button 
                                    onClick=${onLogout}
                                    className="w-full flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 rounded-2xl transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                                            <${LogOut} size=${18} />
                                        </div>
                                        <span className="font-medium text-red-500">Log Out</span>
                                    </div>
                                    <${ChevronRight} size=${16} className="text-red-500/30 group-hover:text-red-500/60 transition-colors" />
                                </button>
                            </div>
                        </motion.div>
                    </${motion.div}>
                `}
            </${AnimatePresence}>

            <!-- Passcode Settings Modal -->
            <${AnimatePresence}>
                ${isChangingPasscode && html`
                    <${motion.div}
                        initial=${{ opacity: 0 }}
                        animate=${{ opacity: 1 }}
                        exit=${{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
                    >
                        <${motion.div}
                            initial=${{ scale: 0.9, opacity: 0 }}
                            animate=${{ scale: 1, opacity: 1 }}
                            className="bg-zinc-900 w-full max-w-xs rounded-[2.5rem] p-8 flex flex-col items-center"
                        >
                            <h2 className="text-xl font-bold mb-2">New Passcode</h2>
                            <p className="text-zinc-500 text-sm mb-8 text-center">Set a new 4-digit code for your privacy.</p>

                            <div className="flex gap-4 mb-10">
                                ${[0, 1, 2, 3].map(i => html`
                                    <div 
                                        key=${i}
                                        className=${`w-3 h-3 rounded-full border-2 transition-all ${
                                            newPasscode.length > i ? 'bg-white border-white scale-110' : 'border-white/20'
                                        }`}
                                    />
                                `)}
                            </div>

                            <div className="grid grid-cols-3 gap-4 w-full mb-8">
                                ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => html`
                                    <button 
                                        key=${num}
                                        onClick=${() => newPasscode.length < 4 && setNewPasscode(prev => prev + num)}
                                        className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-xl font-medium active:bg-white active:text-black transition-colors"
                                    >
                                        ${num}
                                    </button>
                                `)}
                                <button onClick=${() => setIsChangingPasscode(false)} className="text-zinc-500 text-sm">Cancel</button>
                                <button 
                                    onClick=${() => newPasscode.length < 4 && setNewPasscode(prev => prev + '0')}
                                    className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-xl font-medium active:bg-white active:text-black transition-colors"
                                >
                                    0
                                </button>
                                <button 
                                    onClick=${() => setNewPasscode(prev => prev.slice(0, -1))}
                                    className="w-14 h-14 rounded-full flex items-center justify-center text-zinc-500"
                                >
                                    <${Delete} size=${20} />
                                </button>
                            </div>

                            <button 
                                disabled=${newPasscode.length !== 4}
                                onClick=${() => {
                                    localStorage.setItem('us_app_passcode', newPasscode);
                                    setPasscodeSuccess(true);
                                    setTimeout(() => {
                                        setPasscodeSuccess(false);
                                        setIsChangingPasscode(false);
                                        setNewPasscode('');
                                    }, 1500);
                                }}
                                className=${`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all ${
                                    newPasscode.length === 4 
                                        ? (passcodeSuccess ? 'bg-emerald-500 text-white' : 'bg-white text-black') 
                                        : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                }`}
                            >
                                ${passcodeSuccess ? html`<${Check} size=${20} />` : 'Save New Passcode'}
                            </button>
                        </${motion.div}>
                    </${motion.div}>
                `}
            </${AnimatePresence}>
        </div>
    `;
};

export default Home;