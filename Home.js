import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { MessageSquare, Image as ImageIcon, ChevronRight, X, Lock, Check, Delete, Loader2, LogOut, Eye, EyeOff, List, Bell } from 'lucide-react';
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
    const [latestBucketItems, setLatestBucketItems] = useState([]);
    const [revealedNSFW, setRevealedNSFW] = useState({});
    const [loading, setLoading] = useState(true);
    const [anniversary, setAnniversary] = useState(null);
    const [notificationPermission, setNotificationPermission] = useState(
        typeof window !== 'undefined' ? Notification.permission : 'default'
    );

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

        // Sync Anniversary
        const anniversaryRef = ref(rtdb, 'settings/anniversary');
        const unsubAnniversary = onValue(anniversaryRef, (snap) => {
            if (snap.val()) setAnniversary(snap.val());
        });

        return () => {
            unsubHunter();
            unsubNate();
            unsubHunterImg();
            unsubNateImg();
            unsubPresence();
            unsubJournal();
            unsubAnniversary();
        };
    }, []);

    useEffect(() => {
        const bucketRef = query(ref(rtdb, 'bucketlist'), orderByChild('createdAt'), limitToLast(3));
        const unsubBucket = onValue(bucketRef, (snap) => {
            const data = snap.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => b.createdAt - a.createdAt);
                setLatestBucketItems(list);
            } else {
                setLatestBucketItems([]);
            }
        });
        return () => unsubBucket();
    }, []);

    const toggleNSFW = (id) => {
        setRevealedNSFW(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const currentUserImage = currentUser?.id === 'hunter' ? hunterImg : nateImg;

    const calculateTimeTogether = (dateString) => {
        if (!dateString) return null;
        const [year, month, day] = dateString.split('-').map(Number);
        const start = new Date(year, month - 1, day);
        const now = new Date();
        
        let years = now.getFullYear() - start.getFullYear();
        let months = now.getMonth() - start.getMonth();
        let days = now.getDate() - start.getDate();

        if (days < 0) {
            months -= 1;
            days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years -= 1;
            months += 12;
        }

        const parts = [];
        if (years > 0) parts.push(`${years}y`);
        if (months > 0) parts.push(`${months}m`);
        if (days > 0) parts.push(`${days}d`);
        
        return parts.length > 0 ? parts.join(' ') : '0d';
    };

    const timeTogether = calculateTimeTogether(anniversary);

    const handleUpdateAnniversary = async (e) => {
        const date = e.target.value;
        setAnniversary(date);
        try {
            await set(ref(rtdb, 'settings/anniversary'), date);
        } catch (err) {
            console.error("Error updating anniversary:", err);
        }
    };

    const handleRequestNotifications = async () => {
        if (!("Notification" in window)) return;
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
            // Send a test one to confirm
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                registration.showNotification('Notifications Enabled!', {
                    body: 'You will now receive updates from your partner.',
                    icon: currentUser?.id === 'hunter' ? 'hunter.png' : 'nate.png',
                    vibrate: [200, 100, 200]
                });
            }
        }
    };

    const sendTestNotification = async () => {
        if (Notification.permission !== 'granted') {
            handleRequestNotifications();
            return;
        }
        
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification('Test Alert', {
            body: 'This is how updates will appear on your device.',
            icon: currentUser?.id === 'hunter' ? 'hunter.png' : 'nate.png',
            vibrate: [200, 100, 200]
        });
    };

    return html`
        <div className="px-6 pt-4 pb-12 animate-in fade-in duration-700 relative">
            <!-- Profile Pill -->
            <div className="flex justify-end mb-2">
                <button 
                    onClick=${() => setIsProfileOpen(true)}
                    className="flex items-center gap-2 bg-[var(--card-bg)] hover:bg-white/50 border border-[var(--card-border)] py-1.5 pl-1.5 pr-3 rounded-full transition-all active:scale-95"
                >
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-black/10">
                        <img src=${currentUserImage} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-primary)]">${currentUser?.name || 'User'}</span>
                </button>
            </div>

            <div className="flex justify-center items-center mb-10 relative">
                <div className="relative flex items-center">
                    <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-black relative z-10 translate-x-6">
                        <img src=${hunterImg} alt="Hunter" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-black relative z-0 -translate-x-6">
                        <img src=${nateImg} alt="Nate" className="w-full h-full object-cover grayscale-[0.2]" />
                    </div>
                </div>
            </div>

            <div className="flex justify-between px-10 mb-12">
                <div className="text-center flex flex-col items-center">
                    <h2 className="text-xl font-semibold mb-1 text-[var(--text-primary)]">Hunter</h2>
                    <div className="flex items-center gap-1.5">
                        <div className=${`w-1.5 h-1.5 rounded-full ${presence.hunter === 'online' ? 'bg-emerald-600' : 'bg-zinc-400'}`} />
                        <p className=${`text-[10px] font-bold uppercase tracking-widest ${presence.hunter === 'online' ? 'text-emerald-600' : 'text-zinc-500'}`}>
                            ${presence.hunter === 'online' ? 'Online' : 'Away'}
                        </p>
                    </div>
                </div>
                <div className="text-center flex flex-col items-center">
                    <h2 className="text-xl font-semibold mb-1 text-[var(--text-primary)]">Nate</h2>
                    <div className="flex items-center gap-1.5">
                        <div className=${`w-1.5 h-1.5 rounded-full ${presence.nate === 'online' ? 'bg-emerald-600' : 'bg-zinc-400'}`} />
                        <p className=${`text-[10px] font-bold uppercase tracking-widest ${presence.nate === 'online' ? 'text-emerald-600' : 'text-zinc-500'}`}>
                            ${presence.nate === 'online' ? 'Online' : 'Away'}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Relationship Details -->
            <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-4 duration-1000">
                <div className="bg-white/40 backdrop-blur-md px-6 py-4 rounded-[2rem] border border-black/5 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-60">Time Together</span>
                    <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                        ${timeTogether || 'Set Anniversary'}
                    </span>
                    ${anniversary && html`
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-1 h-1 rounded-full bg-black/10" />
                            <span className="text-[10px] font-medium text-[var(--text-secondary)]">Since ${(() => {
                                const [y, m, d] = anniversary.split('-').map(Number);
                                return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                            })()}</span>
                        </div>
                    `}
                </div>
            </div>

            <div className="space-y-8">
                <section>
                    <h3 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest px-1 mb-4">Mood Check-ins</h3>
                    <div className="space-y-4">
                        <div className="bg-[var(--card-bg)] p-5 rounded-3xl border border-[var(--card-border)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                        <img src=${hunterImg} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-medium text-[var(--text-primary)]">Hunter <span className="text-[var(--text-secondary)]">is</span> ${hunterMood.label}</span>
                                </div>
                                <${Icon} icon=${hunterMood.icon} className="text-2xl text-[var(--text-primary)]" />
                            </div>
                        </div>

                        <div className="bg-[var(--card-bg)] p-5 rounded-3xl border border-[var(--card-border)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                        <img src=${nateImg} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-medium text-[var(--text-primary)]">Nate <span className="text-[var(--text-secondary)]">is</span> ${nateMood.label}</span>
                                </div>
                                <${Icon} icon=${nateMood.icon} className="text-2xl text-[var(--text-primary)]" />
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest px-1 mb-4">Latest Shared Thoughts</h3>
                    <div className="space-y-3">
                        ${loading ? html`
                            <div className="flex justify-center py-6"><${Loader2} className="animate-spin text-zinc-500" /></div>
                        ` : latestJournals.length === 0 ? html`
                            <p className="text-center text-[var(--text-secondary)] italic text-sm">No thoughts shared yet.</p>
                        ` : latestJournals.map(journal => html`
                            <div className="bg-[var(--card-bg)] p-4 rounded-3xl flex items-start gap-4 border border-[var(--card-border)] animate-in fade-in slide-in-from-bottom-2">
                                <div className="mt-1"><${MessageSquare} size=${18} className="text-[var(--text-secondary)]" /></div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase">${journal.author} • ${journal.title}</h4>
                                        <span className="text-[var(--text-secondary)] text-[10px] opacity-50 uppercase">${journal.dateLabel || 'Today'}</span>
                                    </div>
                                    ${journal.isNSFW && !revealedNSFW[journal.id] ? html`
                                        <div className="flex items-center gap-2 py-1">
                                            <div className="h-3 flex-1 bg-black/10 rounded-full blur-[4px]" />
                                            <button onClick=${() => toggleNSFW(journal.id)} className="text-[var(--text-secondary)]">
                                                <${Eye} size=${14} />
                                            </button>
                                        </div>
                                    ` : html`
                                        <div className="flex items-start gap-2">
                                            <p className="text-[var(--text-primary)] text-sm italic leading-relaxed flex-1">"${journal.content}"</p>
                                            ${journal.isNSFW && html`
                                                <button onClick=${() => toggleNSFW(journal.id)} className="text-zinc-400">
                                                    <${EyeOff} size=${14} />
                                                </button>
                                            `}
                                        </div>
                                    `}
                                </div>
                            </div>
                        `)}
                    </div>
                </section>

                <section>
                    <h3 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest px-1 mb-4">Bucket List Snippets</h3>
                    <div className="space-y-3">
                        ${latestBucketItems.length === 0 ? html`
                            <p className="text-center text-[var(--text-secondary)] italic text-sm">No bucket list items yet.</p>
                        ` : latestBucketItems.map(item => html`
                            <div className="bg-[var(--card-bg)] p-4 rounded-3xl flex items-center gap-4 border border-[var(--card-border)]">
                                <div className="w-10 h-10 rounded-2xl bg-zinc-800/5 flex items-center justify-center text-[var(--text-secondary)]">
                                    <${List} size=${18} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h4 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider truncate">${item.category}</h4>
                                        <span className="text-[9px] font-bold uppercase text-[var(--text-secondary)] opacity-40">${item.author}</span>
                                    </div>
                                    ${item.isNSFW && !revealedNSFW[item.id] ? html`
                                        <div className="flex items-center gap-2 py-1">
                                            <div className="h-4 w-24 bg-black/10 rounded-full blur-[4px]" />
                                            <button onClick=${() => toggleNSFW(item.id)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                                                <${Eye} size=${14} />
                                            </button>
                                        </div>
                                    ` : html`
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[var(--text-primary)] text-sm font-medium truncate">${item.title}</p>
                                            ${item.isNSFW && html`
                                                <button onClick=${() => toggleNSFW(item.id)} className="text-zinc-400">
                                                    <${EyeOff} size=${14} />
                                                </button>
                                            `}
                                        </div>
                                    `}
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
                        className="fixed inset-0 bg-black/30 backdrop-blur-md z-[100] flex justify-end"
                        onClick=${() => setIsProfileOpen(false)}
                    >
                        <${motion.div}
                            initial=${{ x: '100%' }}
                            animate=${{ x: 0 }}
                            exit=${{ x: '100%' }}
                            transition=${{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="bg-[var(--modal-bg)] w-80 h-full shadow-2xl p-8 flex flex-col overflow-y-auto no-scrollbar"
                            onClick=${e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Profile</h2>
                                <button 
                                    onClick=${() => setIsProfileOpen(false)}
                                    className="p-2 bg-black/5 rounded-full text-[var(--text-secondary)]"
                                >
                                    <${X} size=${20} />
                                </button>
                            </div>

                            <div className="flex flex-col items-center mb-10">
                                <div className="relative mb-4">
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-black/10">
                                        <img src=${currentUserImage} alt=${currentUser?.name} className="w-full h-full object-cover" />
                                    </div>
                                    <button 
                                        onClick=${() => fileInputRef.current.click()}
                                        className="absolute bottom-0 right-0 p-2 bg-[var(--text-primary)] text-[var(--bg-color)] rounded-full active:scale-90 transition-transform"
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
                                    className="w-full flex items-center justify-between p-4 bg-white/50 hover:bg-white/80 rounded-2xl transition-colors group border border-black/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                                            <${ImageIcon} size=${18} />
                                        </div>
                                        <span className="font-medium text-[var(--text-primary)]">Change Image</span>
                                    </div>
                                    <${ChevronRight} size=${16} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                                </button>

                                <button 
                                    onClick=${() => setIsChangingPasscode(true)}
                                    className="w-full flex items-center justify-between p-4 bg-white/50 hover:bg-white/80 rounded-2xl transition-colors group border border-black/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-zinc-200 text-zinc-600 rounded-xl">
                                            <${Lock} size=${18} />
                                        </div>
                                        <span className="font-medium text-[var(--text-primary)]">Passcode Options</span>
                                    </div>
                                    <${ChevronRight} size=${16} className="text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                                </button>

                                <div className="p-4 bg-white/50 rounded-2xl border border-black/5 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
                                            <${Icon} icon="ph:calendar-heart-duotone" className="text-lg" />
                                        </div>
                                        <span className="font-medium text-[var(--text-primary)]">Anniversary</span>
                                    </div>
                                    <input 
                                        type="date" 
                                        value=${anniversary || ''}
                                        onChange=${handleUpdateAnniversary}
                                        className="w-full bg-white/50 border border-black/10 rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-purple-200"
                                    />
                                </div>

                                <div className="p-4 bg-white/50 rounded-2xl border border-black/5 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                                            <${Bell} size=${18} />
                                        </div>
                                        <span className="font-medium text-[var(--text-primary)]">Notifications</span>
                                    </div>
                                    
                                    ${notificationPermission === 'granted' ? html`
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                                                <${Check} size=${14} />
                                                <span className="text-[11px] font-bold uppercase tracking-wider">Notifications Active</span>
                                            </div>
                                            <button 
                                                onClick=${sendTestNotification}
                                                className="w-full bg-white/50 text-zinc-600 text-[10px] font-bold uppercase tracking-widest py-2 rounded-xl border border-black/5 active:bg-white"
                                            >
                                                Send Test Notification
                                            </button>
                                        </div>
                                    ` : notificationPermission === 'denied' ? html`
                                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-xl border border-red-100">
                                            <${X} size=${14} />
                                            <span className="text-[11px] font-bold uppercase tracking-wider">Permission Blocked</span>
                                        </div>
                                    ` : html`
                                        <button 
                                            onClick=${handleRequestNotifications}
                                            className="w-full bg-zinc-800 text-white text-[11px] font-bold uppercase tracking-widest py-3 rounded-xl active:scale-[0.98] transition-transform"
                                        >
                                            Enable Push Alerts
                                        </button>
                                    `}
                                </div>

                                <button 
                                    onClick=${onLogout}
                                    className="w-full flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 rounded-2xl transition-colors group border border-red-500/5"
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