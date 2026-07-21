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
                                    style=${{
                                        backgroundColor: newPasscode.length > i ? 'var(--passcode-dot-active)' : 'transparent',
                                        borderColor: newPasscode.length > i ? 'var(--passcode-dot-active)' : 'var(--passcode-dot-inactive)'
                                    }}
                                    className=${`w-3 h-3 rounded-full border-2 transition-all ${
                                        newPasscode.length > i ? 'scale-110' : ''
                                    }`}
                                />
                            `)}
                        </div>

                        <div className="grid grid-cols-3 gap-4 w-full mb-8">
                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => html`
                                <button 
                                    key=${num}
                                    onClick=${() => newPasscode.length < 4 && setNewPasscode(prev => prev + num)}
                                    style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-medium active:opacity-70 transition-all shadow-sm"
                                >
                                    ${num}
                                </button>
                            `)}
                            <button onClick=${onClose} className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Cancel</button>
                            <button 
                                onClick=${() => newPasscode.length < 4 && setNewPasscode(prev => prev + '0')}
                                style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-medium active:opacity-70 transition-all shadow-sm"
                            >
                                0
                            </button>
                            <button 
                                onClick=${() => setNewPasscode(prev => prev.slice(0, -1))}
                                className="w-14 h-14 rounded-full flex items-center justify-center text-[var(--text-secondary)]"
                            >
                                <${Delete} size=${20} />
                            </button>
                        </div>

                        <button 
                            disabled=${newPasscode.length !== 4}
                            onClick=${handleSave}
                            style=${newPasscode.length === 4 && !passcodeSuccess ? { backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' } : {}}
                            className=${`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all ${
                                newPasscode.length === 4 
                                    ? (passcodeSuccess ? 'bg-emerald-500 text-white shadow-lg' : 'shadow-lg') 
                                    : 'bg-[var(--input-bg)] text-[var(--text-secondary)] cursor-not-allowed opacity-50'
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