import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { Plus, X, Check, Loader2, Eye, EyeOff, List, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb } from '../lib/firebase.js';
import { ref, push, onValue, query, limitToLast, orderByChild, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const BucketList = ({ currentUser }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [revealedNSFW, setRevealedNSFW] = useState({});

    const categories = ["Adventure", "Travel", "Date Night", "Skill", "Food", "NSFW", "Other"];

    const [newItem, setNewItem] = useState({
        title: '',
        category: categories[0],
        isNSFW: false
    });

    useEffect(() => {
        const bucketRef = query(ref(rtdb, 'bucketlist'), orderByChild('createdAt'), limitToLast(100));
        const unsubscribe = onValue(bucketRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => b.createdAt - a.createdAt);
                setItems(list);
            } else {
                setItems([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async () => {
        if (!newItem.title.trim()) return;
        
        try {
            const itemData = {
                author: currentUser?.name || 'Anonymous',
                title: newItem.title,
                category: newItem.category,
                isNSFW: newItem.isNSFW,
                createdAt: Date.now()
            };
            
            await push(ref(rtdb, 'bucketlist'), itemData);

            // Trigger Alert
            await push(ref(rtdb, 'alerts'), {
                authorId: currentUser.id,
                author: currentUser.name,
                text: `Added to the bucket list: ${newItem.title}`,
                type: 'bucketlist',
                timestamp: serverTimestamp()
            });

            setNewItem({ title: '', category: categories[0], isNSFW: false });
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error adding bucket item: ", error);
        }
    };

    const toggleNSFW = (id) => {
        setRevealedNSFW(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return html`
        <div className="px-6 pt-4 pb-20 text-[var(--text-primary)]">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Bucket List</h1>
                    <p className="text-[var(--text-secondary)]">Dreams for us to catch.</p>
                </div>
                <button 
                    onClick=${() => setIsModalOpen(true)}
                    className="bg-zinc-800 text-white p-3 rounded-2xl active:scale-95 transition-transform"
                >
                    <${Plus} size=${24} />
                </button>
            </div>

            <div className="space-y-3">
                ${loading ? html`
                    <div className="flex justify-center py-12">
                        <${Loader2} className="animate-spin text-zinc-400" />
                    </div>
                ` : items.length === 0 ? html`
                    <div className="text-center py-12 text-zinc-500 italic">Our bucket list is empty. Add something!</div>
                ` : items.map((item) => html`
                    <div 
                        key=${item.id} 
                        className="bg-[var(--card-bg)] p-5 rounded-[2rem] border border-[var(--card-border)] animate-in fade-in slide-in-from-bottom-2 flex items-center gap-4"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-zinc-800/5 flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                            <${List} size=${20} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                                    ${item.category}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest bg-black/5 px-2 py-0.5 rounded-full text-[var(--text-secondary)]">
                                    Added by ${item.author}
                                </span>
                            </div>
                            
                            ${item.isNSFW && !revealedNSFW[item.id] ? html`
                                <div className="flex items-center gap-3">
                                    <div className="h-5 w-3/4 bg-black/5 rounded-lg blur-[6px]" />
                                    <button 
                                        onClick=${() => toggleNSFW(item.id)}
                                        className="p-1.5 bg-black/5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    >
                                        <${Eye} size=${16} />
                                    </button>
                                </div>
                            ` : html`
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-lg font-medium leading-tight">${item.title}</p>
                                    ${item.isNSFW && html`
                                        <button 
                                            onClick=${() => toggleNSFW(item.id)}
                                            className="p-1.5 text-zinc-300"
                                        >
                                            <${EyeOff} size=${16} />
                                        </button>
                                    `}
                                </div>
                            `}
                        </div>
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
                                <h2 className="text-2xl font-bold">New Goal</h2>
                                <button onClick=${() => setIsModalOpen(false)} className="p-2 bg-black/5 rounded-full"><${X} size=${20} /></button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">Goal</label>
                                    <input
                                        autoFocus
                                        value=${newItem.title}
                                        onChange=${e => setNewItem({ ...newItem, title: e.target.value })}
                                        className="w-full bg-white/50 border border-black/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none"
                                        placeholder="What do you want to do?"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        ${categories.map(cat => html`
                                            <button
                                                key=${cat}
                                                onClick=${() => setNewItem({ ...newItem, category: cat })}
                                                className=${`px-4 py-2 rounded-full text-xs transition-all ${
                                                    newItem.category === cat 
                                                    ? 'bg-zinc-800 text-white font-semibold' 
                                                    : 'bg-white/50 text-[var(--text-secondary)]'
                                                }`}
                                            >
                                                ${cat}
                                            </button>
                                        `)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/30 rounded-2xl border border-black/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-pink-500/10 text-pink-500 rounded-lg">
                                            <${AlertCircle} size=${18} />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold block">NSFW Content?</span>
                                            <span className="text-[10px] text-[var(--text-secondary)]">Hide this goal from quick view</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick=${() => setNewItem({ ...newItem, isNSFW: !newItem.isNSFW })}
                                        className=${`w-12 h-6 rounded-full relative transition-colors ${newItem.isNSFW ? 'bg-pink-500' : 'bg-black/10'}`}
                                    >
                                        <div className=${`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newItem.isNSFW ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <button 
                                    onClick=${handleSubmit}
                                    className="w-full bg-zinc-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                                >
                                    <${Check} size=${20} />
                                    Add to Bucket List
                                </button>
                            </div>
                        </motion.div>
                    </${motion.div}>
                `}
            </${AnimatePresence}>
        </div>
    `;
};

export default BucketList;