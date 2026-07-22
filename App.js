import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Icon } from '@iconify/react';
import { rtdb, serverTimestamp, messaging } from './lib/firebase.js';
import { ref, set, onDisconnect, onValue, query, limitToLast, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";
import { db } from './lib/firebase.js';
import { doc, setDoc, serverTimestamp as fsServerTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const html = htm.bind(React.createElement);

import Home from './Home.js';
import Checkins from './views/Checkins.js';
import Journal from './views/Journal.js';
import Calendar from './views/Calendar.js';
import Chat from './views/Chat.js';
import BucketList from './views/BucketList.js';
import Checklist from './views/Checklist.js';
import Photos from './views/Photos.js';
import Music from './views/Music.js';
import Profiles from './views/Profiles.js';
import Questions from './views/Questions.js';
import Cards from './views/Cards.js';
import Timeline from './views/Timeline.js';
import Gifts from './views/Gifts.js';
import Auth from './views/Auth.js';
import Navigation from './components/Navigation.js';
import { themes } from './lib/themes.js';

/**
 * H+N App - Draft Checkpoint
 * Current Features: Mood, Journal, Calendar, Chat, Bucket List, Checklist, Photos, Music, Profiles, Cards, Timeline.
 */
const App = () => {
    const [activeTab, setActiveTab] = useState('home');
    const mainRef = React.useRef(null);
    const [theme, setTheme] = useState(localStorage.getItem('us_app_theme') || 'dark');

    useEffect(() => {
        const themeConfig = themes[theme] || themes.dark;
        const root = document.documentElement;
        
        // Apply CSS variables to root
        Object.entries(themeConfig).forEach(([key, value]) => {
            if (key.startsWith('--')) {
                root.style.setProperty(key, value);
            }
        });

        // Set color scheme and meta theme color
        root.style.colorScheme = themeConfig['color-scheme'];
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', themeConfig['theme-color']);
        }

        localStorage.setItem('us_app_theme', theme);
    }, [theme]);

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
    const [showInstallScreen, setShowInstallScreen] = useState(false);

    // PWA Install Prompt Logic & Standalone Detection
    useEffect(() => {
        const checkStandalone = () => {
            return window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator.standalone === true) ||
                   window.location.search.includes('mode=standalone');
        };

        const standalone = checkStandalone();
        setIsStandalone(standalone);
        
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIos(ios);

        // Show install screen if not standalone and hasn't been dismissed this session
        const dismissed = sessionStorage.getItem('install_dismissed');
        if (!standalone && !dismissed) {
            setShowInstallScreen(true);
        }

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

    // Notification Permission and Token Management
    useEffect(() => {
        if (!isAuthenticated || !currentUser) return;

        const setupFCM = async () => {
            if (!("Notification" in window) || !messaging) return;
            
            // Only request if not already granted/denied
            let permission = Notification.permission;
            if (permission === 'default') {
                permission = await Notification.requestPermission();
            }

            if (permission === 'granted') {
                try {
                    /**
                     * ⚠️  TO GET YOUR VAPID KEY:
                     * 1. Go to Firebase Console → Project Settings → Cloud Messaging tab
                     * 2. Scroll to "Web Push certificates"
                     * 3. Click "Generate key pair" if none exists
                     * 4. Copy the "Key pair" value and replace the string below
                     */
                    const VAPID_KEY = 'BOWLhAozaIU9sZ2pP2nryiYbVGd9nNcHvauBTLWNYe9MDR7y00DmwTPc0D-_Z_2_2BvPwWtExghJ8nO4EpyK_9E';

                    const swReg = await navigator.serviceWorker.ready;
                    const token = await getToken(messaging, { 
                        vapidKey: VAPID_KEY,
                        serviceWorkerRegistration: swReg
                    });
                    
                    if (token) {
                        // Store in Realtime Database (for presence/quick access)
                        await set(ref(rtdb, `users/${currentUser.id}/fcmToken`), token);
                        
                        // Also store in Firestore (for server-side Cloud Functions to query)
                        await setDoc(doc(db, 'fcmTokens', currentUser.id), {
                            token,
                            userId: currentUser.id,
                            name: currentUser.name,
                            updatedAt: fsServerTimestamp()
                        }, { merge: true });

                        console.log('✅ FCM Token registered for', currentUser.id, 'in RTDB + Firestore');
                    }
                } catch (err) {
                    console.error('FCM token error (check VAPID key):', err);
                }
            }
        };

        setupFCM();

        // Foreground notification listener (app is open)
        const notificationsRef = query(ref(rtdb, 'alerts'), limitToLast(1));
        const unsubscribe = onValue(notificationsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const key = Object.keys(data)[0];
                const alert = data[key];
                
                // Only show if alert is recent (< 8s) and not from self
                const isNew = Date.now() - alert.timestamp < 8000;
                if (isNew && alert.authorId !== currentUser.id) {
                    if (Notification.permission === "granted") {
                        new Notification(`${alert.author} • H+N`, {
                            body: alert.text,
                            icon: alert.authorId === 'hunter' ? 'hunter.png' : 'nate.png',
                            tag: 'hn-foreground',
                            renotify: true
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

    // Hardware back button support for Android and PWA navigation
    useEffect(() => {
        if (!isAuthenticated) return;

        // Ensure we have a state to pop from
        if (window.history.state !== 'app-running') {
            window.history.replaceState('app-running', '');
            window.history.pushState('app-running', '');
        }

        const handlePopState = (e) => {
            // We want to intercept back if:
            // 1. Navigation menu is expanded
            // 2. A modal/overlay is open (isNavHidden is our signal)
            // 3. We are not on the home tab
            const hasActiveOverlay = isNavExpanded || isNavHidden;
            const isNotHome = activeTab !== 'home';

            if (hasActiveOverlay || isNotHome) {
                // Push state back so we don't exit the app on the next back press
                window.history.pushState('app-running', '');

                if (isNavExpanded) {
                    setIsNavExpanded(false);
                } else if (isNavHidden) {
                    // Dispatch global event to close any active modals in child views
                    window.dispatchEvent(new CustomEvent('close-all-overlays'));
                } else if (isNotHome) {
                    setActiveTab('home');
                }
            }
            // If no overlays and we are on home, we let the default back behavior 
            // happen, which might close the PWA/exit browser.
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isAuthenticated, activeTab, isNavExpanded, isNavHidden]);

    if (!isInitialized) return null;

    if (showInstallScreen && !isStandalone) {
        return html`
            <div className="fixed inset-0 z-[1000] bg-[var(--bg-color)] flex flex-col items-center justify-center p-8 text-center">
                <motion.div 
                    initial=${{ opacity: 0, scale: 0.9 }}
                    animate=${{ opacity: 1, scale: 1 }}
                    className="max-w-sm w-full space-y-8"
                >
                    <div className="relative mx-auto w-32 h-32">
                        <div className="absolute inset-0 bg-white rounded-[2.5rem] shadow-xl rotate-6"></div>
                        <img 
                            src="extension_icon (1).png" 
                            className="relative z-10 w-full h-full rounded-[2.5rem] shadow-2xl border-4 border-white object-cover"
                        />
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold tracking-tight">H+N</h1>
                        <p className="text-[var(--text-secondary)] text-lg leading-relaxed px-4">
                            Install this app for the best experience with Nate and Hunter.
                        </p>
                    </div>

                    <div className="pt-8 space-y-4">
                        ${isIos ? html`
                            <div className="bg-white/50 p-6 rounded-[2rem] border border-black/5 space-y-4 text-sm font-medium">
                                <div className="flex items-center gap-4 text-left">
                                    <div className="bg-zinc-800 text-white p-2 rounded-xl">
                                        <${Icon} icon="material-symbols:ios-share" className="text-xl" />
                                    </div>
                                    <span>1. Tap the Share button in Safari</span>
                                </div>
                                <div className="flex items-center gap-4 text-left">
                                    <div className="bg-zinc-800 text-white p-2 rounded-xl">
                                        <${Icon} icon="material-symbols:add-box-outline" className="text-xl" />
                                    </div>
                                    <span>2. Select "Add to Home Screen"</span>
                                </div>
                            </div>
                        ` : html`
                            <button 
                                onClick=${handleInstallClick}
                                className="w-full bg-zinc-800 text-white py-5 rounded-[2rem] font-bold text-lg shadow-xl active:scale-95 transition-transform"
                            >
                                Install App
                            </button>
                        `}

                        <button 
                            onClick=${() => {
                                setShowInstallScreen(false);
                                sessionStorage.setItem('install_dismissed', 'true');
                            }}
                            className="w-full text-[var(--text-secondary)] font-bold uppercase tracking-widest text-xs py-4 hover:text-[var(--text-primary)] transition-colors"
                        >
                            Continue in Browser
                        </button>
                    </div>
                </motion.div>
            </div>
        `;
    }

    if (!isAuthenticated) {
        return html`<${Auth} onLogin=${handleLogin} initialUser=${currentUser} />`;
    }

    const renderView = () => {
        const props = { currentUser, onOverlayToggle: setIsNavHidden };
        switch (activeTab) {
            case 'home': return html`<${Home} ...${props} onLogout=${handleLogout} setActiveTab=${setActiveTab} theme=${theme} setTheme=${setTheme} />`;
            case 'checkins': return html`<${Checkins} ...${props} />`;
            case 'journal': return html`<${Journal} ...${props} />`;
            case 'calendar': return html`<${Calendar} ...${props} />`;
            case 'chat': return html`<${Chat} ...${props} />`;
            case 'bucketlist': return html`<${BucketList} ...${props} />`;
            case 'checklist': return html`<${Checklist} ...${props} />`;
            case 'photos': return html`<${Photos} ...${props} />`;
            case 'music': return html`<${Music} ...${props} />`;
            case 'profiles': return html`<${Profiles} ...${props} />`;
            case 'questions': return html`<${Questions} ...${props} />`;
            case 'cards': return html`<${Cards} ...${props} />`;
            case 'timeline': return html`<${Timeline} ...${props} />`;
            case 'gifts': return html`<${Gifts} ...${props} />`;
            default: return html`<${Home} ...${props} />`;
        }
    };

    return html`
        <div 
            style=${{ backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' }}
            className="flex flex-col h-full overflow-hidden"
        >
            <${motion.main} 
                ref=${mainRef} 
                animate=${isNavExpanded ? {
                    scale: 0.95,
                    filter: 'blur(12px) brightness(1)',
                    borderRadius: '2.5rem',
                    y: -20
                } : {
                    scale: 1,
                    filter: 'blur(0px) brightness(1)',
                    borderRadius: '0rem',
                    y: 0
                }}
                transition=${{ type: 'spring', damping: 25, stiffness: 200 }}
                style=${{ backgroundColor: 'var(--bg-color)' }}
                className=${`flex-1 no-scrollbar pb-32 origin-bottom ${isNavHidden ? 'overflow-hidden !transform-none' : 'overflow-y-auto'}`}
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
                            currentUser=${currentUser}
                        />
                    </${motion.div}>
                `}
            </${AnimatePresence}>
        </div>
    `;
};

const root = createRoot(document.getElementById('root'));
root.render(html`<${App} />`);