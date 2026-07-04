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
    const mainRef = React.useRef(null);

    // Reset scroll position when switching tabs
    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTo(0, 0);
        }
    }, [activeTab]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isNavHidden, setIsNavHidden] = useState(false);
    const [isNavExpanded, setIsNavExpanded] = useState(false);
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



    if (!isAuthenticated) {
        return html`<${Auth} onLogin=${handleLogin} initialUser=${currentUser} />`;
    }

    const renderView = () => {
        const props = { currentUser, onOverlayToggle: setIsNavHidden };
        switch (activeTab) {
            case 'home': return html`<${Home} ...${props} onLogout=${handleLogout} setActiveTab=${setActiveTab} />`;
            case 'mood': return html`<${Mood} ...${props} />`;
            case 'journal': return html`<${Journal} ...${props} />`;
            case 'calendar': return html`<${Calendar} ...${props} />`;
            case 'chat': return html`<${Chat} ...${props} />`;
            case 'bucketlist': return html`<${BucketList} ...${props} />`;
            case 'checklist': return html`<${Checklist} ...${props} />`;
            case 'music': return html`<${Music} ...${props} />`;
            case 'profiles': return html`<${Profiles} ...${props} />`;
            case 'cards': return html`
                <div className="px-6 pt-12 text-center">
                    <h1 className="text-3xl font-bold mb-4">Cards</h1>
                    <p className="text-[var(--text-secondary)] italic">Game is coming soon...</p>
                </div>
            `;
            default: return html`<${Home} ...${props} />`;
        }
    };

    return html`
        <div className="flex flex-col h-full bg-[#e8e8e8] text-[var(--text-primary)] overflow-hidden">
            <${motion.main} 
                ref=${mainRef} 
                animate=${{
                    scale: isNavExpanded ? 0.95 : 1,
                    filter: isNavExpanded ? 'blur(12px) brightness(1)' : 'blur(0px) brightness(1)',
                    borderRadius: isNavExpanded ? '2.5rem' : '0rem',
                    y: isNavExpanded ? -20 : 0
                }}
                transition=${{ type: 'spring', damping: 25, stiffness: 200 }}
                className="flex-1 overflow-y-auto no-scrollbar pb-32 bg-[var(--bg-color)] origin-bottom"
            >
                ${renderView()}
            </${motion.main}>
            
            <${AnimatePresence}>
                ${!isNavHidden && html`
                    <${motion.div}
                        key="navigation"
                        initial=${{ y: 100 }}
                        animate=${{ y: 0 }}
                        exit=${{ y: 100 }}
                        transition=${{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-50"
                    >
                        <${Navigation} 
                            activeTab=${activeTab} 
                            setActiveTab=${setActiveTab} 
                            isExpanded=${isNavExpanded}
                            setIsExpanded=${setIsNavExpanded}
                        />
                    </${motion.div}>
                `}
            </${AnimatePresence}>
        </div>
    `;
};

const root = createRoot(document.getElementById('root'));
root.render(html`<${App} />`);