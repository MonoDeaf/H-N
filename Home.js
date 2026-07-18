import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { 
    MessageSquare, ArrowRight, Loader2, Eye, EyeOff, ListTodo, Circle, 
    CheckCircle2, ExternalLink, Link as LinkIcon, Heart, Utensils, 
    Plane, Sparkles, CalendarHeart, Gift, RefreshCw 
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import { db, rtdb, storage } from './lib/firebase.js';
import { ref, set, onValue, query as rtdbQuery, limitToLast as rtdbLimitToLast, orderByChild } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { calculateTimeTogether, getDayEvents, calculateTimeDifference, calculateTimeUntilNext } from './lib/utils.js';
import ProfileSidebar from './components/ProfileSidebar.js';
import PasscodeModal from './components/PasscodeModal.js';
import RelationshipModal from './components/RelationshipModal.js';

const html = htm.bind(React.createElement);

const Home = ({ currentUser, onLogout, setActiveTab, onOverlayToggle }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isChangingPasscode, setIsChangingPasscode] = useState(false);
    const [newPasscode, setNewPasscode] = useState('');
    const [passcodeSuccess, setPasscodeSuccess] = useState(false);
    const [hunterImg, setHunterImg] = useState('hunter.png');
    const [nateImg, setNateImg] = useState('nate.png');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef(null);

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (file && currentUser) {
            setIsUploading(true);
            try {
                // 1. Create a reference to the storage location
                const imagePath = `profile_images/${currentUser.id}_${Date.now()}`;
                const fileRef = storageRef(storage, imagePath);

                // 2. Upload the file
                const snapshot = await uploadBytes(fileRef, file);
                
                // 3. Get the download URL
                const downloadURL = await getDownloadURL(snapshot.ref);

                // 4. Update Realtime Database with the URL
                await set(ref(rtdb, `users/${currentUser.id}/profileImage`), downloadURL);
                
                console.log("Profile image uploaded and synced:", downloadURL);
            } catch (err) {
                console.error("Error uploading profile image:", err);
                alert("Failed to upload image. Please try again.");
            } finally {
                setIsUploading(false);
            }
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
        'Curious': 'ph:magnifying-glass-duotone',
        'Hot': 'ph:thermometer-hot-duotone',
        'Cold': 'ph:snowflake-duotone',
        'Comfortable': 'ph:couch-duotone',
        'Horny': 'ph:heartbeat-duotone'
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
    const [lastTrip, setLastTrip] = useState(null);
    const [isTimeExpanded, setIsTimeExpanded] = useState(false);
    const [isRelationshipSettingsOpen, setIsRelationshipSettingsOpen] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState(
        typeof window !== 'undefined' ? Notification.permission : 'default'
    );

    useEffect(() => {
        if (onOverlayToggle) {
            onOverlayToggle(isProfileOpen || isChangingPasscode || isRelationshipSettingsOpen);
        }
    }, [isProfileOpen, isChangingPasscode, isRelationshipSettingsOpen, onOverlayToggle]);

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

        // Sync Last Trip
        const lastTripRef = ref(rtdb, 'settings/lastTrip');
        const unsubLastTrip = onValue(lastTripRef, (snap) => {
            if (snap.val()) setLastTrip(snap.val());
        });

        // Global Event for Settings (Triggered from Sidebar)
        const handleOpenSettings = () => setIsRelationshipSettingsOpen(true);
        window.addEventListener('open-relationship-settings', handleOpenSettings);

        return () => {
            window.removeEventListener('open-relationship-settings', handleOpenSettings);
            unsubHunter();
            unsubNate();
            unsubHunterImg();
            unsubNateImg();
            unsubPresence();
            unsubJournal();
            unsubAnniversary();
            unsubLastTrip();
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
    const detailedDiff = calculateTimeDifference(anniversary);
    const timeUntilAnniversary = calculateTimeUntilNext(anniversary);
    const timeSinceTrip = calculateTimeDifference(lastTrip);

    const handleUpdateRelationshipData = async ({ anniversary: anniv, lastTrip: trip }) => {
        try {
            if (anniv !== undefined) {
                setAnniversary(anniv);
                await set(ref(rtdb, 'settings/anniversary'), anniv);
            }
            if (trip !== undefined) {
                setLastTrip(trip);
                await set(ref(rtdb, 'settings/lastTrip'), trip);
            }
        } catch (err) {
            console.error("Error updating relationship data:", err);
        }
    };

    const handleRequestNotifications = async () => {
        if (!("Notification" in window)) return;
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
    };

    return html`
        <div className="px-6 pt-4 pb-12 animate-in fade-in duration-700 relative isolate">
            <div className="relative isolate mb-16">
                <!-- Header Greeting & Profile -->
            <div className="flex justify-between items-center mb-10 relative z-10">
                <div className="animate-in slide-in-from-left duration-700">
                    <p className="text-zinc-500 text-sm font-light">Good day,</p>
                    <h1 className="text-4xl font-light tracking-tight text-[var(--text-primary)] leading-none">
                        ${currentUser?.name}!
                    </h1>
                </div>
                <button 
                    onClick=${() => setIsProfileOpen(true)}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 py-1.5 pl-1.5 pr-3 rounded-full transition-all active:scale-95 shadow-sm"
                >
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10">
                        <img src=${currentUserImage} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-medium text-[var(--text-primary)]">${currentUser?.name || 'User'}</span>
                </button>
            </div>

            <!-- Profile Pill Section -->
            <div className="relative z-10 flex flex-col items-center mb-16">
                <div className="bg-zinc-800 backdrop-blur-2xl p-1 rounded-full flex items-center gap-1 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] border border-white/5">
                    <!-- Hunter Circle -->
                    <div className=${`w-36 h-36 rounded-full overflow-hidden border-2 relative z-10 bg-zinc-800 transition-colors duration-500 ${presence.hunter === 'online' ? 'border-emerald-500' : 'border-zinc-400'}`}>
                        ${isUploading && currentUser?.id === 'hunter' ? html`
                            <div className="w-full h-full flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                <${Loader2} className="animate-spin text-white/70" size=${32} />
                            </div>
                        ` : html`
                            <img src=${hunterImg} alt="Hunter" className="w-full h-full object-cover" />
                        `}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pt-6 pb-2.5 flex items-center justify-center">
                            <h2 className="text-sm font-light text-white tracking-tight">Hunter</h2>
                        </div>
                    </div>

                    <!-- Nate Circle -->
                    <div className=${`w-36 h-36 rounded-full overflow-hidden border-2 relative z-10 bg-zinc-800 transition-colors duration-500 ${presence.nate === 'online' ? 'border-emerald-500' : 'border-zinc-400'}`}>
                        ${isUploading && currentUser?.id === 'nate' ? html`
                            <div className="w-full h-full flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                <${Loader2} className="animate-spin text-white/70" size=${32} />
                            </div>
                        ` : html`
                            <img src=${nateImg} alt="Nate" className="w-full h-full object-cover" />
                        `}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pt-6 pb-2.5 flex items-center justify-center">
                            <h2 className="text-sm font-light text-white tracking-tight">Nate</h2>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Relationship Details -->
            <div className="flex flex-col items-center relative z-10">
                <${motion.button}
                    layout
                    transition=${{ duration: 0.25 }}
                    onClick=${() => setIsTimeExpanded(!isTimeExpanded)}
                    className=${`bg-[var(--card-bg)] backdrop-blur-md px-6 py-4 rounded-[2rem] border border-[var(--card-border)] flex flex-col items-center gap-1 shadow-lg active:scale-[0.98] transition-all hover:bg-white/10 w-auto min-w-[200px] overflow-hidden`}
                >
                    <span style=${{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.01em', color: '#c1c1c1' }}>Time Together</span>
                    <span className="text-2xl font-light tracking-tight text-[var(--text-primary)]">
                        ${timeTogether || 'Set Anniversary'}
                    </span>
                    
                    <${motion.div} 
                        initial=${false}
                        animate=${{ height: isTimeExpanded ? 'auto' : 0 }}
                        transition=${{ duration: 0.25 }}
                        className="overflow-hidden w-full flex flex-col items-center"
                    >
                        ${anniversary && html`
                            <div className="h-px w-full bg-black/5 my-4" />
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8 w-full">
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Total Days</span>
                                    <span className="text-sm font-bold text-[var(--text-primary)]">${detailedDiff?.days}d</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Next Party</span>
                                    <span className="text-sm font-bold text-[var(--text-primary)]">${timeUntilAnniversary}d</span>
                                </div>
                                ${lastTrip && html`
                                    <div className="flex flex-col items-center col-span-2 pt-2">
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Last Trip Together</span>
                                        <span className="text-sm font-bold text-[var(--text-primary)]">${calculateTimeTogether(lastTrip)} ago</span>
                                    </div>
                                `}
                            </div>
                        `}
                    </${motion.div}>

                    ${!isTimeExpanded && anniversary && html`
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-1 h-1 rounded-full bg-black/10" />
                            <span className="text-[10px] font-medium text-[var(--text-secondary)]">Since ${(() => {
                                const [y, m, d] = anniversary.split('-').map(Number);
                                return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            })()}</span>
                        </div>
                    `}
                </${motion.button}>
            </div>
            </div>

            <div className="space-y-8">
                <section>
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 style=${{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.01em', color: '#c1c1c1' }}>Mood Check-ins</h3>
                        <button 
                            onClick=${() => setActiveTab('mood')} 
                            className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-white/10 transition-all active:scale-90"
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
                        <h3 style=${{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.01em', color: '#c1c1c1' }}>Upcoming Events</h3>
                        <button 
                            onClick=${() => setActiveTab('calendar')} 
                            className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-white/10 transition-all active:scale-90"
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
                        <h3 style=${{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.01em', color: '#c1c1c1' }}>Latest Shared Thoughts</h3>
                        <button 
                            onClick=${() => setActiveTab('journal')} 
                            className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-white/10 transition-all active:scale-90"
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
                        <h3 style=${{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.01em', color: '#c1c1c1' }}>Checklist Snippets</h3>
                        <button 
                            onClick=${() => setActiveTab('checklist')} 
                            className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-white/10 transition-all active:scale-90"
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
                        <h3 style=${{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.01em', color: '#c1c1c1' }}>Bucket List Snippets</h3>
                        <button 
                            onClick=${() => setActiveTab('bucketlist')} 
                            className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-white/10 transition-all active:scale-90"
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
                isUploading=${isUploading}
                anniversary=${anniversary} 
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
            <${RelationshipModal}
                isOpen=${isRelationshipSettingsOpen}
                onClose=${() => setIsRelationshipSettingsOpen(false)}
                anniversary=${anniversary}
                lastTrip=${lastTrip}
                onUpdate=${handleUpdateRelationshipData}
            />
        </div>
    `;
};

export default Home;