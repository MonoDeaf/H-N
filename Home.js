import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { 
    MessageSquare, ArrowRight, Loader2, Eye, EyeOff, ListTodo, Circle, 
    CheckCircle2, ExternalLink, Link as LinkIcon, Heart, Utensils, 
    Plane, Sparkles, CalendarHeart, Gift, RefreshCw 
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { db, rtdb } from './lib/firebase.js';
import { ref, set, onValue, query as rtdbQuery, limitToLast as rtdbLimitToLast, orderByChild } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { calculateTimeTogether, getDayEvents } from './lib/utils.js';
import ProfileSidebar from './components/ProfileSidebar.js';
import PasscodeModal from './components/PasscodeModal.js';

const html = htm.bind(React.createElement);

const Home = ({ currentUser, onLogout, setActiveTab, onOverlayToggle }) => {
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
    const [latestTasks, setLatestTasks] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [revealedNSFW, setRevealedNSFW] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [anniversary, setAnniversary] = useState(null);
    const [notificationPermission, setNotificationPermission] = useState(
        typeof window !== 'undefined' ? Notification.permission : 'default'
    );

    useEffect(() => {
        if (onOverlayToggle) {
            onOverlayToggle(isProfileOpen || isChangingPasscode);
        }
    }, [isProfileOpen, isChangingPasscode, onOverlayToggle]);

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
        const journalRef = rtdbQuery(ref(rtdb, 'journal'), orderByChild('createdAt'), rtdbLimitToLast(3));
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
        const bucketRef = rtdbQuery(ref(rtdb, 'bucketlist'), orderByChild('createdAt'), rtdbLimitToLast(5));
        const unsubBucket = onValue(bucketRef, (snap) => {
            const data = snap.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => {
                    if (a.completed !== b.completed) return a.completed ? 1 : -1;
                    return b.createdAt - a.createdAt;
                }).slice(0, 3);
                setLatestBucketItems(list);
            } else {
                setLatestBucketItems([]);
            }
        });

        const checklistRef = rtdbQuery(ref(rtdb, 'checklists'), orderByChild('createdAt'), rtdbLimitToLast(5));
        const unsubChecklist = onValue(checklistRef, (snap) => {
            const data = snap.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => {
                    if (a.completed !== b.completed) return a.completed ? 1 : -1;
                    return b.createdAt - a.createdAt;
                }).slice(0, 3);
                setLatestTasks(list);
            } else {
                setLatestTasks([]);
            }
        });

        return () => {
            unsubBucket();
            unsubChecklist();
        };
    }, []);

    useEffect(() => {
        const q = query(collection(db, "events"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allEvents = [];
            snapshot.forEach(doc => allEvents.push({ id: doc.id, ...doc.data() }));
            const today = new Date();
            const instances = [];
            for (let i = 0; i < 60; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(today.getDate() + i);
                const d = checkDate.getDate(), m = checkDate.getMonth(), y = checkDate.getFullYear();
                const dayEvs = getDayEvents({ d, m, y, events: allEvents, anniversary, showMilestones: true, showHolidays: true });
                dayEvs.forEach(e => instances.push({ ...e, instanceDate: new Date(y, m, d) }));
            }
            const sorted = instances.sort((a, b) => a.instanceDate - b.instanceDate).slice(0, 3);
            setUpcomingEvents(sorted);
            setLoadingEvents(false);
        });
        return () => unsubscribe();
    }, [anniversary]);

    const toggleBucketComplete = async (item) => {
        try {
            await set(ref(rtdb, `bucketlist/${item.id}/completed`), !item.completed);
            await set(ref(rtdb, `bucketlist/${item.id}/completedAt`), !item.completed ? Date.now() : null);
        } catch (error) {
            console.error("Error toggling bucket item:", error);
        }
    };

    const toggleTaskComplete = async (task) => {
        try {
            await set(ref(rtdb, `checklists/${task.id}/completed`), !task.completed);
            await set(ref(rtdb, `checklists/${task.id}/completedBy`), !task.completed ? currentUser.name : null);
            await set(ref(rtdb, `checklists/${task.id}/completedAt`), !task.completed ? Date.now() : null);
        } catch (error) {
            console.error("Error toggling task:", error);
        }
    };

    const toggleNSFW = (id) => {
        setRevealedNSFW(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const currentUserImage = currentUser?.id === 'hunter' ? hunterImg : nateImg;

    // removed function calculateTimeTogether() {}

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
    };

    return html`
        <div className="px-6 pt-4 pb-12 animate-in fade-in duration-700 relative isolate">
            <!-- Hero Wrapper for Gradient -->
            <div className="relative isolate mb-16">
                <!-- Background Gradient Divider -->
                <div className="absolute inset-x-[-1.5rem] top-[-2rem] bottom-[-4rem] pointer-events-none -z-10" 
                     style=${{ 
                         background: 'radial-gradient(circle at 50% 25%, #ffffff 0%, #ccccfa 50%, rgba(204, 204, 250, 0) 30%)'
                     }} 
                />

                <!-- Profile Pill -->
            <div className="flex justify-end mb-2 relative z-10">
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

            <div className="relative z-10">
                <div className="flex justify-center items-center mb-10 relative z-10">
                    <div className="relative flex items-center">
                        <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-black relative z-10 translate-x-6 bg-[#333]">
                            <img src=${hunterImg} alt="Hunter" className="w-full h-full object-cover" />
                        </div>
                        <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-black relative z-0 -translate-x-6 bg-[#333]">
                            <img src=${nateImg} alt="Nate" className="w-full h-full object-cover grayscale-[0.2]" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between px-10 mb-12 relative z-10">
                <div className="text-center flex flex-col items-center">
                    <h2 className="text-3xl font-bold mb-1 text-[var(--text-primary)] tracking-tight">Hunter</h2>
                    <div className="flex items-center gap-1.5">
                        <div className=${`w-1.5 h-1.5 rounded-full ${presence.hunter === 'online' ? 'bg-emerald-600' : 'bg-zinc-400'}`} />
                        <p className=${`text-[10px] font-bold uppercase tracking-widest ${presence.hunter === 'online' ? 'text-emerald-600' : 'text-zinc-500'}`}>
                            ${presence.hunter === 'online' ? 'Online' : 'Away'}
                        </p>
                    </div>
                </div>
                <div className="text-center flex flex-col items-center">
                    <h2 className="text-3xl font-bold mb-1 text-[var(--text-primary)] tracking-tight">Nate</h2>
                    <div className="flex items-center gap-1.5">
                        <div className=${`w-1.5 h-1.5 rounded-full ${presence.nate === 'online' ? 'bg-emerald-600' : 'bg-zinc-400'}`} />
                        <p className=${`text-[10px] font-bold uppercase tracking-widest ${presence.nate === 'online' ? 'text-emerald-600' : 'text-zinc-500'}`}>
                            ${presence.nate === 'online' ? 'Online' : 'Away'}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Relationship Details -->
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000 relative z-10">
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
            </div>

            <div className="space-y-8">
                <section>
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Mood Check-ins</h3>
                        <button 
                            onClick=${() => setActiveTab('mood')} 
                            className="w-8 h-8 rounded-full bg-white/40 border border-black/5 flex items-center justify-center text-[var(--text-secondary)] hover:bg-white/60 transition-all active:scale-90"
                        >
                            <${ArrowRight} size=${16} />
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div className="bg-[var(--card-bg)] p-5 rounded-3xl border border-[var(--card-border)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                        <img src=${hunterImg} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-medium text-[var(--text-primary)]">Hunter <span className="text-[var(--text-secondary)]">is currently</span> ${hunterMood.label}</span>
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
                                    <span className="font-medium text-[var(--text-primary)]">Nate <span className="text-[var(--text-secondary)]">is currently</span> ${nateMood.label}</span>
                                </div>
                                <${Icon} icon=${nateMood.icon} className="text-2xl text-[var(--text-primary)]" />
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Upcoming Events</h3>
                        <button 
                            onClick=${() => setActiveTab('calendar')} 
                            className="w-8 h-8 rounded-full bg-white/40 border border-black/5 flex items-center justify-center text-[var(--text-secondary)] hover:bg-white/60 transition-all active:scale-90"
                        >
                            <${ArrowRight} size=${16} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        ${loadingEvents ? html`
                            <div className="flex justify-center py-6"><${Loader2} className="animate-spin text-zinc-400" /></div>
                        ` : upcomingEvents.length === 0 ? html`
                            <p className="text-center text-[var(--text-secondary)] italic text-sm">No upcoming events.</p>
                        ` : upcomingEvents.map(event => {
                            const categories = {
                                'date': { icon: Heart, color: 'bg-pink-500' },
                                'home': { icon: Utensils, color: 'bg-yellow-500' },
                                'travel': { icon: Plane, color: 'bg-sky-500' },
                                'other': { icon: Sparkles, color: 'bg-purple-500' },
                                'milestone': { icon: CalendarHeart, color: 'bg-indigo-500' },
                                'holiday': { icon: Gift, color: 'bg-rose-500' },
                            };
                            const cat = categories[event.type] || categories['date'];
                            const IconComp = cat.icon;
                            return html`
                                <div className="bg-[var(--card-bg)] p-4 rounded-3xl flex items-center gap-4 border border-[var(--card-border)] animate-in fade-in slide-in-from-right-4">
                                    <div className=${`w-10 h-10 rounded-2xl ${cat.color} flex items-center justify-center relative shrink-0`}>
                                        <${IconComp} size=${18} className="text-white" />
                                        ${event.recurrence && event.recurrence !== 'none' && html`
                                            <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                                <${RefreshCw} size=${8} className="text-zinc-600" />
                                            </div>
                                        `}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-[var(--text-primary)] font-bold text-sm truncate pr-2">${event.title}</h4>
                                            <div className="flex flex-col items-end shrink-0">
                                                <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap">
                                                    ${event.instanceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">
                                                    ${(() => {
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);
                                                        const eventDate = new Date(event.instanceDate);
                                                        eventDate.setHours(0, 0, 0, 0);
                                                        const diffTime = eventDate - today;
                                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                        if (diffDays === 0) return 'Today';
                                                        if (diffDays === 1) return 'Tomorrow';
                                                        return `In ${diffDays} days`;
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-[var(--text-secondary)] text-[10px] uppercase tracking-wider font-bold">
                                            ${event.type} ${event.recurrence && event.recurrence !== 'none' ? `• ${event.recurrence}` : ''}
                                        </p>
                                    </div>
                                </div>
                            `;
                        })}
                    </div>
                </section>

                <section>
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Latest Shared Thoughts</h3>
                        <button 
                            onClick=${() => setActiveTab('journal')} 
                            className="w-8 h-8 rounded-full bg-white/40 border border-black/5 flex items-center justify-center text-[var(--text-secondary)] hover:bg-white/60 transition-all active:scale-90"
                        >
                            <${ArrowRight} size=${16} />
                        </button>
                    </div>
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
                                        <h4 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider">${journal.author} • ${journal.title}</h4>
                                        <span className="text-zinc-500 text-[10px] font-bold uppercase whitespace-nowrap">${journal.dateLabel || 'Today'}</span>
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
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Checklist Snippets</h3>
                        <button 
                            onClick=${() => setActiveTab('checklist')} 
                            className="w-8 h-8 rounded-full bg-white/40 border border-black/5 flex items-center justify-center text-[var(--text-secondary)] hover:bg-white/60 transition-all active:scale-90"
                        >
                            <${ArrowRight} size=${16} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        ${latestTasks.length === 0 ? html`
                            <p className="text-center text-[var(--text-secondary)] italic text-sm">No tasks yet.</p>
                        ` : latestTasks.map(task => html`
                            <div className=${`bg-[var(--card-bg)] p-4 rounded-3xl flex items-center gap-4 border border-[var(--card-border)] transition-opacity ${task.completed ? 'opacity-50' : ''}`}>
                                <button onClick=${() => toggleTaskComplete(task)} className=${task.completed ? 'text-emerald-500' : 'text-zinc-300'}>
                                    ${task.completed ? html`<${CheckCircle2} size=${20} />` : html`<${Circle} size=${20} />`}
                                </button>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h4 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider truncate">${task.author} ASSIGNED TO: ${task.assignedTo}</h4>
                                    </div>
                                    <div className="flex flex-col gap-1 overflow-hidden">
                                        <p className=${`text-[var(--text-primary)] text-sm font-medium truncate ${task.completed ? 'line-through' : ''}`}>${task.title}</p>
                                        ${task.link && html`
                                            <div className="flex">
                                                <a 
                                                    href=${task.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    onClick=${e => e.stopPropagation()}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 hover:bg-black/10 rounded-xl text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)] transition-colors shrink-0 border border-black/5 max-w-full"
                                                >
                                                    <${LinkIcon} size=${10} />
                                                    <span className="truncate max-w-[120px]">
                                                        ${task.link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                                    </span>
                                                    <${ExternalLink} size=${10} className="opacity-40" />
                                                </a>
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </div>
                        `)}
                    </div>
                </section>

                <section>
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Bucket List Snippets</h3>
                        <button 
                            onClick=${() => setActiveTab('bucketlist')} 
                            className="w-8 h-8 rounded-full bg-white/40 border border-black/5 flex items-center justify-center text-[var(--text-secondary)] hover:bg-white/60 transition-all active:scale-90"
                        >
                            <${ArrowRight} size=${16} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        ${latestBucketItems.length === 0 ? html`
                            <p className="text-center text-[var(--text-secondary)] italic text-sm">No bucket list items yet.</p>
                        ` : latestBucketItems.map(item => html`
                            <div className=${`bg-[var(--card-bg)] p-4 rounded-3xl flex items-center gap-4 border border-[var(--card-border)] transition-opacity ${item.completed ? 'opacity-50' : ''}`}>
                                <button onClick=${() => toggleBucketComplete(item)} className=${item.completed ? 'text-emerald-500' : 'text-zinc-300'}>
                                    ${item.completed ? html`<${CheckCircle2} size=${20} />` : html`<${Circle} size=${20} />`}
                                </button>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h4 className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider truncate">${item.author} • ${item.category}</h4>
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
                                            <p className=${`text-[var(--text-primary)] text-sm font-medium truncate ${item.completed ? 'line-through' : ''}`}>${item.title}</p>
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

            <input type="file" ref=${fileInputRef} className="hidden" accept="image/*" onChange=${handleImageChange} />
            <${ProfileSidebar} 
                isOpen=${isProfileOpen} 
                onClose=${() => setIsProfileOpen(false)} 
                currentUser=${currentUser} 
                currentUserImage=${currentUserImage} 
                anniversary=${anniversary} 
                onUpdateAnniversary=${handleUpdateAnniversary} 
                onLogout=${onLogout} 
                onImageClick=${() => fileInputRef.current.click()} 
                onPasscodeClick=${() => setIsChangingPasscode(true)}
                onNotificationClick=${handleRequestNotifications}
                notificationPermission=${notificationPermission}
            />
            <${PasscodeModal} 
                isOpen=${isChangingPasscode} 
                onClose=${() => setIsChangingPasscode(false)} 
                onSave=${(code) => localStorage.setItem('us_app_passcode', code)}
            />
        </div>
    `;
};

export default Home;