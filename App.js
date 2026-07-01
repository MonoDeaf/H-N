import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Icon } from '@iconify/react';
import { rtdb, serverTimestamp } from './lib/firebase.js';
import { ref, set, onDisconnect, onValue, query, limitToLast, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

import Home from './Home.js';
import Mood from './views/Mood.js';
import Journal from './views/Journal.js';
import Calendar from './views/Calendar.js';
import Chat from './views/Chat.js';
import BucketList from './views/BucketList.js';
import Checklist from './views/Checklist.js';
import Music from './views/Music.js';
import Profiles from './views/Profiles.js';
import Auth from './views/Auth.js';
import Navigation from './components/Navigation.js';

const App = () => {
    const [activeTab, setActiveTab] = useState('home');
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIos, setIsIos] = useState(false);

    // PWA Install Prompt Logic & Standalone Detection
    useEffect(() => {
        const checkStandalone = () => {
            return window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator.standalone === true) ||
                   window.location.search.includes('mode=standalone');
        };

        setIsStandalone(checkStandalone());
        
        const userAgent = window.navigator.userAgent.toLowerCase();
        setIsIos(/iphone|ipad|ipod/.test(userAgent));

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            // Standalone check will likely trigger on reload/re-entry
        }
    };

    // Notification Permission and Listener
    useEffect(() => {
        if (!isAuthenticated || !currentUser) return;

        // Request Browser Notification Permission
        if ("Notification" in window) {
            Notification.requestPermission();
        }

        // Global Alert Listener
        const notificationsRef = query(ref(rtdb, 'alerts'), limitToLast(1));
        const unsubscribe = onValue(notificationsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const key = Object.keys(data)[0];
                const alert = data[key];
                
                // Only notify if alert is new and not from self
                const isNew = Date.now() - alert.timestamp < 10000;
                if (isNew && alert.authorId !== currentUser.id) {
                    if (Notification.permission === "granted") {
                        new Notification(`Update from ${alert.author}`, {
                            body: alert.text,
                            icon: alert.authorId === 'hunter' ? 'hunter.png' : 'nate.png'
                        });
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [isAuthenticated, currentUser]);

    useEffect(() => {
        const savedUser = localStorage.getItem('us_app_user');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }
        setIsInitialized(true);
    }, []);

    const handleLogin = (user) => {
        setCurrentUser(user);
        localStorage.setItem('us_app_user', JSON.stringify(user));
        setIsAuthenticated(true);
    };

    // Presence Management
    useEffect(() => {
        if (!isAuthenticated || !currentUser) return;

        const userStatusRef = ref(rtdb, `status/${currentUser.id}`);
        const connectedRef = ref(rtdb, '.info/connected');

        const unsub = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // We are connected (or reconnected)!
                onDisconnect(userStatusRef).set({
                    state: 'offline',
                    last_changed: serverTimestamp()
                }).then(() => {
                    set(userStatusRef, {
                        state: 'online',
                        last_changed: serverTimestamp()
                    });
                });
            }
        });

        return () => {
            unsub();
            set(userStatusRef, {
                state: 'offline',
                last_changed: serverTimestamp()
            });
        };
    }, [isAuthenticated, currentUser]);

    const handleLogout = () => {
        localStorage.removeItem('us_app_user');
        setCurrentUser(null);
        setIsAuthenticated(false);
    };

    if (!isInitialized) return null;

    // Force Install Overlay if not standalone
    if (!isStandalone) {
        return html`
            <div className="fixed inset-0 z-[2000] bg-[var(--bg-color)] flex flex-col items-center justify-center p-8 text-center overflow-hidden">
                <${motion.div}
                    initial=${{ opacity: 0, scale: 0.9 }}
                    animate=${{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm flex flex-col items-center"
                >
                    <div className="w-28 h-28 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-10 relative">
                        <img src="extension_icon (1).png" className="w-20 h-20 object-contain" alt="App Icon" />
                        <div className="absolute -bottom-2 -right-2 bg-zinc-800 text-white p-2 rounded-full shadow-lg">
                            <${Lock} size=${16} />
                        </div>
                    </div>
                    
                    <h1 className="text-3xl font-bold mb-4 tracking-tight">H+N</h1>
                    <p className="text-[var(--text-secondary)] text-sm mb-12 leading-relaxed">
                        To maintain privacy and real-time updates, "H+N" must be installed as an application on your home screen.
                    </p>

                    ${deferredPrompt ? html`
                        <button 
                            onClick=${handleInstallClick}
                            className="w-full bg-zinc-800 text-white font-bold py-5 rounded-[1.5rem] active:scale-[0.98] transition-transform shadow-xl mb-6"
                        >
                            Install Now
                        </button>
                    ` : isIos ? html`
                        <div className="w-full bg-white/50 backdrop-blur-sm border border-black/5 rounded-3xl p-6 space-y-4 text-left">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">How to install on iOS</p>
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                    <Icon icon="ph:share-network-duotone" className="text-xl text-zinc-600" />
                                </div>
                                <p className="text-xs font-medium">1. Tap the <span className="font-bold">Share</span> button below</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                    <Icon icon="ph:plus-square-duotone" className="text-xl text-zinc-600" />
                                </div>
                                <p className="text-xs font-medium">2. Select <span className="font-bold">Add to Home Screen</span></p>
                            </div>
                        </div>
                    ` : html`
                        <div className="w-full bg-white/40 border border-dashed border-black/10 rounded-3xl p-8">
                            <p className="text-sm text-zinc-500 italic">
                                Please open your browser menu and select <br/><span className="font-bold not-italic">"Install App"</span> or <span className="font-bold not-italic">"Add to Home Screen"</span>.
                            </p>
                        </div>
                    `}

                    <p className="mt-12 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                        Private • Encrypted • Ours
                    </p>
                </${motion.div}>
            </div>
        `;
    }

    if (!isAuthenticated) {
        return html`<${Auth} onLogin=${handleLogin} initialUser=${currentUser} />`;
    }

    const renderView = () => {
        switch (activeTab) {
            case 'home': return html`<${Home} currentUser=${currentUser} onLogout=${handleLogout} setActiveTab=${setActiveTab} />`;
            case 'mood': return html`<${Mood} currentUser=${currentUser} />`;
            case 'journal': return html`<${Journal} currentUser=${currentUser} />`;
            case 'calendar': return html`<${Calendar} currentUser=${currentUser} />`;
            case 'chat': return html`<${Chat} currentUser=${currentUser} />`;
            case 'bucketlist': return html`<${BucketList} currentUser=${currentUser} />`;
            case 'checklist': return html`<${Checklist} currentUser=${currentUser} />`;
            case 'music': return html`<${Music} currentUser=${currentUser} />`;
            case 'profiles': return html`<${Profiles} currentUser=${currentUser} />`;
            default: return html`<${Home} currentUser=${currentUser} />`;
        }
    };

    return html`
        <div className="flex flex-col h-full bg-[var(--bg-color)] text-[var(--text-primary)] overflow-hidden">
            <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
                ${renderView()}
            </main>
            <${Navigation} activeTab=${activeTab} setActiveTab=${setActiveTab} />


        </div>
    `;
};

const root = createRoot(document.getElementById('root'));
root.render(html`<${App} />`);