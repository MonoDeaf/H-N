import React from 'react';
import htm from 'htm';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Delete } from 'lucide-react';

const html = htm.bind(React.createElement);

const PasscodeModal = ({ isOpen, onClose, onSave }) => {
    const [newPasscode, setNewPasscode] = React.useState('');
    const [passcodeSuccess, setPasscodeSuccess] = React.useState(false);

    const handleSave = () => {
        onSave(newPasscode);
        setPasscodeSuccess(true);
        setTimeout(() => {
            setPasscodeSuccess(false);
            onClose();
            setNewPasscode('');
        }, 1500);
    };

    return html`
        <${AnimatePresence}>
            ${isOpen && html`
                <${motion.div}
                    initial=${{ opacity: 0 }}
                    animate=${{ opacity: 1 }}
                    exit=${{ opacity: 0 }}
                    className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[5000] flex items-center justify-center p-4"
                >
                    <${motion.div}
                        initial=${{ opacity: 0, scale: 0.95, y: 20 }}
                        animate=${{ opacity: 1, scale: 1, y: 0 }}
                        exit=${{ opacity: 0, scale: 0.95, y: 20 }}
                        style=${{ borderRadius: 'var(--modal-radius)', border: '1px solid var(--modal-border)' }}
                        className="bg-[var(--modal-bg)] w-full max-w-xs p-8 flex flex-col items-center shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
                    >
                        <h2 className="text-xl font-bold mb-2 text-[var(--modal-header-text)]">New Passcode</h2>
                        <p className="text-[var(--modal-label-text)] text-sm mb-8 text-center">Set a new 4-digit code for your privacy.</p>

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
                                    className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-xl font-medium active:bg-zinc-800 active:text-white transition-colors border border-white/5 text-white"
                                >
                                    ${num}
                                </button>
                            `)}
                            <button onClick=${onClose} className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Cancel</button>
                            <button 
                                onClick=${() => newPasscode.length < 4 && setNewPasscode(prev => prev + '0')}
                                className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-xl font-medium active:bg-zinc-800 active:text-white transition-colors border border-white/5 text-white"
                            >
                                0
                            </button>
                            <button 
                                onClick=${() => setNewPasscode(prev => prev.slice(0, -1))}
                                className="w-14 h-14 rounded-full flex items-center justify-center text-zinc-600"
                            >
                                <${Delete} size=${20} />
                            </button>
                        </div>

                        <button 
                            disabled=${newPasscode.length !== 4}
                            onClick=${handleSave}
                            className=${`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all ${
                                newPasscode.length === 4 
                                    ? (passcodeSuccess ? 'bg-emerald-500 text-white shadow-lg' : 'bg-zinc-800 text-white shadow-lg') 
                                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            }`}
                        >
                            ${passcodeSuccess ? html`<${Check} size=${20} />` : 'Save New Passcode'}
                        </button>
                    </${motion.div}>
                </${motion.div}>
            `}
        </${AnimatePresence}>
    `;
};

export default PasscodeModal;