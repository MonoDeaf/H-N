import React, { useState } from 'react';
import htm from 'htm';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Calendar, Plane } from 'lucide-react';

const html = htm.bind(React.createElement);

const RelationshipModal = ({ isOpen, onClose, anniversary, lastTrip, onUpdate }) => {
    const [localAnniv, setLocalAnniv] = useState(anniversary || '');
    const [localTrip, setLocalTrip] = useState(lastTrip || '');

    const handleSave = () => {
        onUpdate({ anniversary: localAnniv, lastTrip: localTrip });
        onClose();
    };

    return html`
        <${AnimatePresence}>
            ${isOpen && html`
                <${motion.div}
                    initial=${{ opacity: 0 }}
                    animate=${{ opacity: 1 }}
                    exit=${{ opacity: 0 }}
                    className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[5000] flex items-center justify-center p-4"
                    onClick=${onClose}
                >
                    <${motion.div}
                        initial=${{ opacity: 0, scale: 0.95, y: 20 }}
                        animate=${{ opacity: 1, scale: 1, y: 0 }}
                        exit=${{ opacity: 0, scale: 0.95, y: 20 }}
                        style=${{ 
                            borderRadius: '2rem', 
                            border: '1px solid var(--modal-border)',
                            backgroundColor: 'var(--modal-bg)'
                        }}
                        className="w-full max-w-[90%] sm:max-w-lg p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto no-scrollbar relative"
                        onClick=${e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold text-[var(--modal-header-text)] tracking-tight">Us Details</h2>
                                <p className="text-[var(--modal-label-text)] text-xs font-medium">Update our milestones</p>
                            </div>
                            <button 
                                onClick=${onClose} 
                                className="p-2.5 bg-white/5 rounded-full text-zinc-400 active:scale-90 transition-transform"
                            >
                                <${X} size=${18} />
                            </button>
                        </div>

                        <div className="space-y-6 pt-2">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--modal-label-text)] ml-1">
                                    <${Calendar} size=${14} /> Anniversary Date
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value=${localAnniv}
                                        onChange=${e => setLocalAnniv(e.target.value)}
                                        className="w-full bg-[var(--input-bg)] border border-white/10 rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:border-white/20 transition-all min-h-[56px]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--modal-label-text)] ml-1">
                                    <${Plane} size=${14} /> Last Trip Together
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value=${localTrip}
                                        onChange=${e => setLocalTrip(e.target.value)}
                                        className="w-full bg-[var(--input-bg)] border border-white/10 rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:border-white/20 transition-all min-h-[56px]"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick=${handleSave}
                                style=${{ backgroundColor: 'var(--modal-button-bg)', color: 'var(--modal-button-text)' }}
                                className="w-full font-bold py-5 rounded-[1.25rem] flex items-center justify-center gap-3 active:scale-[0.97] transition-all mt-4 shadow-xl border border-white/5"
                            >
                                <${Check} size=${22} />
                                <span className="text-base tracking-tight">Update Milestones</span>
                            </button>
                        </div>
                    </${motion.div}>
                </${motion.div}>
            `}
        </${AnimatePresence}>
    `;
};

export default RelationshipModal;