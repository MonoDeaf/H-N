import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { Plus, Edit3, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb } from '../lib/firebase.js';
import { ref, push, onValue, query, limitToLast, orderByChild } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
        content: ''
    });

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
                createdAt: Date.now(),
                dateLabel: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };
            
            await push(ref(rtdb, 'journal'), entryData);
            setNewEntry({ category: categories[0], content: '' });
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error adding entry: ", error);
            alert("Failed to save journal entry. Please check your connection.");
        }
    };

    return html`
        <div className="px-6 pt-4 pb-20">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Journal</h1>
                    <p className="text-zinc-500">Shared thoughts & check-ins.</p>
                </div>
                <button 
                    onClick=${() => setIsModalOpen(true)}
                    className="bg-white text-black p-3 rounded-2xl active:scale-90 transition-transform shadow-lg"
                >
                    <${Plus} size=${24} />
                </button>
            </div>

            <div className="space-y-4">
                ${loading ? html`
                    <div className="flex justify-center py-12 text-zinc-500">
                        <${Loader2} className="animate-spin" size=${24} />
                    </div>
                ` : entries.length === 0 ? html`
                    <div className="text-center py-12 text-zinc-600 italic">No shared thoughts yet.</div>
                ` : entries.map((entry) => html`
                    <div 
                        key=${entry.id} 
                        className="bg-white/5 p-6 rounded-[2rem] border border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    ${entry.dateLabel || 'Recently'} • ${entry.author}
                                </span>
                            </div>
                        </div>
                        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">${entry.title}</h3>
                        <p className="text-zinc-100 text-lg leading-relaxed font-light">“${entry.content}”</p>
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
                            className="bg-zinc-900 w-full max-w-lg rounded-[2.5rem] p-8 space-y-6"
                            onClick=${e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold">New Thought</h2>
                                <button 
                                    onClick=${() => setIsModalOpen(false)}
                                    className="p-2 bg-zinc-800 rounded-full text-zinc-400"
                                >
                                    <${X} size=${20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-3">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        ${categories.map(cat => html`
                                            <button
                                                key=${cat}
                                                onClick=${() => setNewEntry({ ...newEntry, category: cat })}
                                                className=${`px-4 py-2 rounded-full text-xs transition-all ${
                                                    newEntry.category === cat 
                                                    ? 'bg-white text-black font-semibold' 
                                                    : 'bg-zinc-800 text-zinc-400'
                                                }`}
                                            >
                                                ${cat}
                                            </button>
                                        `)}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">Your message</label>
                                    <textarea
                                        autoFocus
                                        value=${newEntry.content}
                                        onChange=${e => setNewEntry({ ...newEntry, content: e.target.value })}
                                        className="w-full bg-zinc-800/50 border-0 rounded-3xl p-5 text-white placeholder-zinc-600 focus:ring-1 focus:ring-white/20 min-h-[150px] outline-none"
                                        placeholder="What's on your mind?..."
                                    />
                                </div>

                                <button 
                                    onClick=${handleSubmit}
                                    className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
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