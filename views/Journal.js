import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { Plus, Edit3, X, Check, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb } from '../lib/firebase.js';
import { ref, push, onValue, query, limitToLast, orderByChild, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const Journal = ({ currentUser }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    const categories = [
        "What feels good", 
        "What hurts", 
        "What to remember", 
        "Things I Love", 
        "Pleasure", 
        "Gratitude"
    ];

    const [newEntry, setNewEntry] = useState({
        category: categories[0],
        content: '',
        isNSFW: false
    });
    const [revealedNSFW, setRevealedNSFW] = useState({});

    useEffect(() => {
        const journalRef = query(ref(rtdb, 'journal'), orderByChild('createdAt'), limitToLast(50));
        const unsubscribe = onValue(journalRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => b.createdAt - a.createdAt);
                setEntries(list);
            } else {
                setEntries([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!newEntry.content.trim()) return;
        
        try {
            const entryData = {
                author: currentUser?.name || 'Anonymous',
                title: newEntry.category,
                content: newEntry.content,
                isNSFW: newEntry.isNSFW,
                createdAt: Date.now(),
                dateLabel: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };
            
            await push(ref(rtdb, 'journal'), entryData);
            
            // Trigger Alert
            await push(ref(rtdb, 'alerts'), {
                authorId: currentUser.id,
                author: currentUser.name,
                text: `Posted a new journal: ${newEntry.category}`,
                type: 'journal',
                timestamp: serverTimestamp()
            });

            setNewEntry({ category: categories[0], content: '', isNSFW: false });
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error adding entry: ", error);
            alert("Failed to save journal entry. Please check your connection.");
        }
    };

    const toggleNSFW = (id) => {
        setRevealedNSFW(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return html`
        <div className="px-6 pt-4 pb-20 text-[var(--text-primary)]">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Journal</h1>
                    <p className="text-[var(--text-secondary)]">Shared thoughts & check-ins.</p>
                </div>
                <button 
                    onClick=${() => setIsModalOpen(true)}
                    className="bg-[var(--text-primary)] text-[var(--bg-color)] p-3 rounded-2xl active:scale-90 transition-transform"
                >
                    <${Plus} size=${24} />
                </button>
            </div>

            <div className="space-y-4">
                ${loading ? html`
                    <div className="flex justify-center py-12 text-zinc-400">
                        <${Loader2} className="animate-spin" size=${24} />
                    </div>
                ` : entries.length === 0 ? html`
                    <div className="text-center py-12 text-zinc-500 italic">No shared thoughts yet.</div>
                ` : entries.map((entry) => html`
                    <div 
                        key=${entry.id} 
                        className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--card-border)] animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-black/5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                                    ${entry.dateLabel || 'Recently'} • ${entry.author}
                                </span>
                            </div>
                        </div>
                        <h3 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3">${entry.title}</h3>
                        
                        ${entry.isNSFW && !revealedNSFW[entry.id] ? html`
                            <div className="flex items-center gap-3 py-2">
                                <div className="h-6 flex-1 bg-black/5 rounded-lg blur-[8px]" />
                                <button 
                                    onClick=${() => toggleNSFW(entry.id)}
                                    className="p-2 bg-black/5 rounded-full text-[var(--text-secondary)]"
                                >
                                    <${Eye} size=${18} />
                                </button>
                            </div>
                        ` : html`
                            <div className="relative group">
                                <p className="text-[var(--text-primary)] text-lg leading-relaxed font-light">“${entry.content}”</p>
                                ${entry.isNSFW && html`
                                    <button 
                                        onClick=${() => toggleNSFW(entry.id)}
                                        className="absolute top-0 -right-2 p-1 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <${EyeOff} size=${14} />
                                    </button>
                                `}
                            </div>
                        `}
                    </div>
                `)}
            </div>

            <${AnimatePresence}>
                ${isModalOpen && html`
                    <${motion.div}
                        initial=${{ opacity: 0 }}
                        animate=${{ opacity: 1 }}
                        exit=${{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4"
                        onClick=${() => setIsModalOpen(false)}
                    >
                        <${motion.div}
                            initial=${{ y: '100%' }}
                            animate=${{ y: 0 }}
                            exit=${{ y: '100%' }}
                            transition=${{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-[var(--modal-bg)] w-full max-w-lg rounded-[2.5rem] p-8 space-y-6"
                            onClick=${e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-[var(--text-primary)]">New Thought</h2>
                                <button 
                                    onClick=${() => setIsModalOpen(false)}
                                    className="p-2 bg-black/5 rounded-full text-[var(--text-secondary)]"
                                >
                                    <${X} size=${20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        ${categories.map(cat => html`
                                            <button
                                                key=${cat}
                                                onClick=${() => setNewEntry({ ...newEntry, category: cat })}
                                                className=${`px-4 py-2 rounded-full text-xs transition-all ${
                                                    newEntry.category === cat 
                                                    ? 'bg-zinc-800 text-white font-semibold' 
                                                    : 'bg-white/50 text-[var(--text-secondary)]'
                                                }`}
                                            >
                                                ${cat}
                                            </button>
                                        `)}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block">Your message</label>
                                    <textarea
                                        autoFocus
                                        value=${newEntry.content}
                                        onChange=${e => setNewEntry({ ...newEntry, content: e.target.value })}
                                        className="w-full bg-white/50 border border-black/5 rounded-3xl p-5 text-[var(--text-primary)] placeholder-[var(--text-secondary)] min-h-[150px] outline-none"
                                        placeholder="What's on your mind?..."
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/30 rounded-2xl border border-black/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-pink-500/10 text-pink-500 rounded-lg">
                                            <${AlertCircle} size=${18} />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold block">NSFW Content?</span>
                                            <span className="text-[10px] text-[var(--text-secondary)]">Hide this thought from quick view</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick=${() => setNewEntry({ ...newEntry, isNSFW: !newEntry.isNSFW })}
                                        className=${`w-12 h-6 rounded-full relative transition-colors ${newEntry.isNSFW ? 'bg-pink-500' : 'bg-black/10'}`}
                                    >
                                        <div className=${`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newEntry.isNSFW ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <button 
                                    onClick=${handleSubmit}
                                    className="w-full bg-zinc-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                                >
                                    <${Check} size=${20} />
                                    Post to Journal
                                </button>
                            </div>
                        </motion.div>
                    </${motion.div}>
                `}
            </${AnimatePresence}>
        </div>
    `;
};

export default Journal;