import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { rtdb } from './lib/firebase.js';
import { ref, set, onDisconnect, serverTimestamp, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

import Home from './Home.js';
import Mood from './views/Mood.js';
import Journal from './views/Journal.js';
import Calendar from './views/Calendar.js';
import Chat from './views/Chat.js';
import Auth from './views/Auth.js';
import Navigation from './components/Navigation.js';

const App = () => {
    const [activeTab, setActiveTab] = useState('home');
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

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
        switch (activeTab) {
            case 'home': return html`<${Home} currentUser=${currentUser} onLogout=${handleLogout} />`;
            case 'mood': return html`<${Mood} currentUser=${currentUser} />`;
            case 'journal': return html`<${Journal} currentUser=${currentUser} />`;
            case 'calendar': return html`<${Calendar} currentUser=${currentUser} />`;
            case 'chat': return html`<${Chat} currentUser=${currentUser} />`;
            default: return html`<${Home} currentUser=${currentUser} />`;
        }
    };

    return html`
        <div className="flex flex-col h-full bg-black text-white overflow-hidden">
            <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
                ${renderView()}
            </main>
            <${Navigation} activeTab=${activeTab} setActiveTab=${setActiveTab} />
        </div>
    `;
};

const root = createRoot(document.getElementById('root'));
root.render(html`<${App} />`);