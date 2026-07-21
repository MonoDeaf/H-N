import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, ArrowRight, Delete } from 'lucide-react';
const html = htm.bind(React.createElement);

const Auth = ({ onLogin, initialUser }) => {
    const [step, setStep] = useState(initialUser ? 'passcode' : 'select'); 
    const [selectedUser, setSelectedUser] = useState(initialUser || null);
    const [passcode, setPasscode] = useState('');
    const [isSettingMode, setIsSettingMode] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        const savedPasscode = localStorage.getItem('us_app_passcode');
        if (!savedPasscode) {
            setIsSettingMode(true);
        }
    }, []);

    // If initialUser changes externally (unlikely but good for safety)
    useEffect(() => {
        if (initialUser && !selectedUser) {
            setSelectedUser(initialUser);
            setStep('passcode');
        }
    }, [initialUser]);

    const users = [
        { id: 'hunter', name: 'Hunter', image: 'hunter.png' },
        { id: 'nate', name: 'Nate', image: 'nate.png' }
    ];

    const handleUserSelect = (user) => {
        setSelectedUser(user);
        setStep('passcode');
    };

    const handleKeyPress = (num) => {
        if (passcode.length < 4) {
            setPasscode(prev => prev + num);
            setError(false);
        }
    };

    const handleDelete = () => {
        setPasscode(prev => prev.slice(0, -1));
    };

    useEffect(() => {
        if (passcode.length === 4) {
            const savedPasscode = localStorage.getItem('us_app_passcode');
            
            if (isSettingMode) {
                // First time setting up
                localStorage.setItem('us_app_passcode', passcode);
                onLogin(selectedUser);
            } else {
                // Checking existing passcode
                if (passcode === savedPasscode) {
                    onLogin(selectedUser);
                } else {
                    setError(true);
                    setTimeout(() => setPasscode(''), 500);
                }
            }
        }
    }, [passcode, isSettingMode, selectedUser, onLogin]);

    return html`
        <div className="fixed inset-0 bg-[var(--bg-color)] z-[200] flex flex-col overflow-y-auto no-scrollbar text-[var(--text-primary)]">
            <AnimatePresence mode="wait">
                ${step === 'select' ? html`
                    <${motion.div} 
                        key="select"
                        initial=${{ opacity: 0, y: 20 }}
                        animate=${{ opacity: 1, y: 0 }}
                        exit=${{ opacity: 0, y: -20 }}
                        className="flex-1 flex flex-col items-center pt-24 pb-12 px-6"
                    >
                        <div className="mb-16 text-center">
                            <h1 className="text-4xl font-bold mb-4 tracking-tight">Welcome</h1>
                            <p className="text-[var(--text-secondary)]">Who is using the app today?</p>
                        </div>

                        <div className="grid grid-cols-2 gap-10 w-full max-w-sm">
                            ${users.map(user => html`
                                <button 
                                    key=${user.id}
                                    onClick=${() => handleUserSelect(user)}
                                    className="flex flex-col items-center gap-4 group"
                                >
                                    <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-black/5 group-active:scale-95 transition-all group-active:border-black/20">
                                        <img src=${user.image} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-xl font-medium">${user.name}</span>
                                </button>
                            `)}
                        </div>
                    </${motion.div}>
                ` : html`
                    <${motion.div} 
                        key="passcode"
                        initial=${{ opacity: 0, x: 50 }}
                        animate=${{ opacity: 1, x: 0 }}
                        exit=${{ opacity: 0, x: -50 }}
                        className="flex-1 flex flex-col items-center pt-20 pb-12 px-6"
                    >
                        <div className="mb-12 text-center">
                            <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-6 border-2 border-white/10">
                                <img src=${selectedUser.image} className="w-full h-full object-cover" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">
                                ${isSettingMode ? 'Set a Passcode' : `Welcome back, ${selectedUser.name}`}
                            </h2>
                            <p className=${`text-sm ${error ? 'text-red-500' : 'text-zinc-500'}`}>
                                ${error ? 'Incorrect passcode' : (isSettingMode ? 'Create a 4-digit code for your privacy' : 'Enter your 4-digit passcode')}
                            </p>
                        </div>

                        <div className="flex gap-4 mb-16">
                            ${[0, 1, 2, 3].map(i => html`
                                <div 
                                    key=${i}
                                    style=${{
                                        backgroundColor: passcode.length > i ? 'var(--passcode-dot-active)' : 'transparent',
                                        borderColor: passcode.length > i ? 'var(--passcode-dot-active)' : 'var(--passcode-dot-inactive)'
                                    }}
                                    className=${`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                                        passcode.length > i ? 'scale-110' : ''
                                    } ${error ? '!border-red-500 !bg-red-500 animate-bounce' : ''}`}
                                />
                            `)}
                        </div>

                        <div className="grid grid-cols-3 gap-x-8 gap-y-6 max-w-[280px] w-full">
                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => html`
                                <button 
                                    key=${num}
                                    onClick=${() => handleKeyPress(num.toString())}
                                    style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium active:opacity-80 transition-all"
                                >
                                    ${num}
                                </button>
                            `)}
                            <div />
                            <button 
                                onClick=${() => handleKeyPress('0')}
                                style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium active:opacity-80 transition-all"
                            >
                                0
                            </button>
                            <button 
                                onClick=${handleDelete}
                                className="w-16 h-16 rounded-full flex items-center justify-center text-zinc-500 active:text-zinc-800 transition-colors"
                            >
                                <${Delete} size=${24} />
                            </button>
                        </div>

                        <button 
                            onClick=${() => {
                                localStorage.removeItem('us_app_user');
                                setStep('select');
                            }}
                            className="mt-12 text-zinc-500 text-sm font-medium hover:text-white transition-colors"
                        >
                            Not ${selectedUser.name}?
                        </button>
                    </${motion.div}>
                `}
            </AnimatePresence>
        </div>
    `;
};

export default Auth;