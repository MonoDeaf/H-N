import React, { useState, useEffect, useRef } from 'react';
import htm from 'htm';
import { 
    Plus, X, Check, Loader2, Trash2, Calendar, MapPin,
    Utensils, Heart, Plane, Star, Music, Camera, Home, Coffee, Gift
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb } from '../lib/firebase.js';
import { ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const CATEGORIES = [
    { id: 'romantic', label: 'Romantic', icon: 'ph:heart-duotone', base: '#E879A0', mid: '#F9A8D4', border: '#f472b6' },
    { id: 'dinner', label: 'Dinner', icon: 'ph:fork-knife-duotone', base: '#D4A017', mid: '#FCD34D', border: '#fb923c' },
    { id: 'travel', label: 'Travel', icon: 'ph:airplane-duotone', base: '#3BACD4', mid: '#7DD3FC', border: '#38bdf8' },
    { id: 'milestone', label: 'Milestone', icon: 'ph:star-duotone', base: '#5B9FD4', mid: '#93C5FD', border: '#fbbf24' },
    { id: 'adventure', label: 'Adventure', icon: 'ph:mountains-duotone', base: '#34C98A', mid: '#6EE7B7', border: '#34d399' },
    { id: 'music', label: 'Music', icon: 'ph:music-notes-duotone', base: '#9170E8', mid: '#C4B5FD', border: '#a78bfa' },
    { id: 'home', label: 'Home', icon: 'ph:house-duotone', base: '#607488', mid: '#94A3B8', border: '#94a3b8' },
    { id: 'memory', label: 'Memory', icon: 'ph:camera-duotone', base: '#E879A0', mid: '#F9A8D4', border: '#e879f9' },
    { id: 'gift', label: 'Gift', icon: 'ph:gift-duotone', base: '#E85B5B', mid: '#FCA5A5', border: '#f87171' },
    { id: 'coffee', label: 'Coffee', icon: 'ph:coffee-duotone', base: '#D4A017', mid: '#FCD34D', border: '#d97706' },
];

// Card palettes now derived from categories to match Mood style

const Timeline = ({ currentUser, onOverlayToggle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef(null);
    const scrollTimeout = useRef(null);

    const [newItem, setNewItem] = useState({
        title: '',
        location: '',
        notes: '',
        category: 'romantic',
        date: new Date().toISOString().split('T')[0],
        approxYear: new Date().getFullYear(),
        approxPeriod: 'mid',
        isApproximate: false
    });

    useEffect(() => {
        onOverlayToggle?.(isModalOpen);
    }, [isModalOpen, onOverlayToggle]);

    useEffect(() => {
        const timelineRef = ref(rtdb, 'timeline');
        const unsubscribe = onValue(timelineRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => new Date(a.date) - new Date(b.date));
                setItems(list);
            } else {
                setItems([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const CARD_WIDTH = Math.min(window.innerWidth * 0.68, 280);
    const GAP = 20;

    const handleScroll = (e) => {
        clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => {
            const scrollLeft = e.target.scrollLeft;
            const index = Math.round(scrollLeft / (CARD_WIDTH + GAP));
            setActiveIndex(Math.max(0, Math.min(index, items.length - 1)));
        }, 50);
    };

    const handleSubmit = async () => {
        if (!newItem.title.trim()) return;
        try {
            let finalDate = newItem.date;
            if (newItem.isApproximate) {
                const month = newItem.approxPeriod === 'early' ? '01' : newItem.approxPeriod === 'mid' ? '06' : '12';
                finalDate = `${newItem.approxYear}-${month}-01`;
            }
            await push(ref(rtdb, 'timeline'), {
                ...newItem,
                date: finalDate,
                author: currentUser?.name || 'Anonymous',
                createdAt: Date.now()
            });
            setIsModalOpen(false);
            setNewItem({
                title: '',
                location: '',
                notes: '',
                category: 'romantic',
                date: new Date().toISOString().split('T')[0],
                approxYear: new Date().getFullYear(),
                approxPeriod: 'mid',
                isApproximate: false
            });
        } catch (error) {
            console.error("Error adding timeline item:", error);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Remove this memory?')) {
            await remove(ref(rtdb, `timeline/${id}`));
        }
    };

    const formatDate = (item) => {
        const date = new Date(item.date);
        if (item.isApproximate) {
            const period = item.approxPeriod ? item.approxPeriod.charAt(0).toUpperCase() + item.approxPeriod.slice(1) : 'Mid';
            return `${period} ${date.getFullYear()}`;
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getCat = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[0];

    return html`
        <div className="h-full flex flex-col bg-[var(--bg-color)] overflow-hidden">
            <!-- Header -->
            <div className="px-6 pt-4 pb-4 flex justify-between items-end shrink-0">
                <div>
                    <h1 className="text-3xl font-light mb-1">Timeline</h1>
                    <p className="text-[var(--text-secondary)] text-sm font-light">Our journey, card by card.</p>
                </div>
                <button 
                    onClick=${() => setIsModalOpen(true)}
                    className="bg-zinc-800 text-white p-3 rounded-2xl active:scale-95 transition-transform"
                >
                    <${Plus} size=${24} />
                </button>
            </div>

            <!-- Main Content -->
            <div className="flex-1 flex flex-col justify-center min-h-0">
                ${loading ? html`
                    <div className="flex justify-center py-12"><${Loader2} className="animate-spin text-zinc-400" /></div>
                ` : items.length === 0 ? html`
                    <div className="text-center py-12 px-10">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <${Calendar} size=${24} className="text-zinc-500" />
                        </div>
                        <p className="text-zinc-500 italic mb-2">The timeline is empty.</p>
                        <p className="text-zinc-600 text-xs">Add your first memory together.</p>
                    </div>
                ` : html`
                    <!-- Slider -->
                    <div 
                        ref=${scrollRef}
                        onScroll=${handleScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
                        style=${{ 
                            paddingLeft: `calc(50% - ${CARD_WIDTH / 2}px)`,
                            paddingRight: `calc(50% - ${CARD_WIDTH / 2}px)`,
                            gap: `${GAP}px`,
                            paddingTop: '12px',
                            paddingBottom: '24px',
                            scrollBehavior: 'smooth',
                        }}
                    >
                        ${items.map((item, index) => {
                            const cat = getCat(item.category);
                            const isActive = index === activeIndex;

                            return html`
                                <div 
                                    key=${item.id}
                                    style=${{ 
                                        width: `${CARD_WIDTH}px`,
                                        flexShrink: 0,
                                    }}
                                    className="snap-center"
                                >
                                    <${motion.div}
                                        animate=${{ 
                                            scale: isActive ? 1 : 0.92,
                                            opacity: isActive ? 1 : 0.55
                                        }}
                                        transition=${{ type: 'spring', stiffness: 300, damping: 28 }}
                                        style=${{
                                            background: cat.base,
                                            boxShadow: `inset 0 0 100px 25px ${cat.mid}CC, inset 0 0 50px 15px rgba(255,255,255,0.4)`,
                                            border: `1.5px solid rgba(255,255,255,0.2)`,
                                            borderRadius: '2rem',
                                            height: `${CARD_WIDTH * 1.45}px`,
                                        }}
                                        className="w-full flex flex-col p-5 relative overflow-hidden"
                                    >
                                        <!-- Grain overlay -->
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none" style=${{ opacity: 0.18, mixBlendMode: 'overlay' }}>
                                            <filter id=${'tl-grain-' + index}>
                                                <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
                                                <feColorMatrix type="saturate" values="0"/>
                                            </filter>
                                            <rect width="100%" height="100%" filter=${'url(#tl-grain-' + index + ')'}/>
                                        </svg>

                                        <!-- Large faint background icon -->
                                        <div 
                                            className="absolute pointer-events-none"
                                            style=${{ 
                                                bottom: '-10px', 
                                                right: '-10px', 
                                                opacity: 0.1,
                                                fontSize: '160px',
                                                lineHeight: 1,
                                                color: '#fff'
                                            }}
                                        >
                                            <${Icon} icon=${cat.icon} style=${{ fontSize: '160px' }} />
                                        </div>

                                        <!-- Top stripe accent -->
                                        <div style=${{ height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '999px', marginBottom: '14px' }} />

                                        <div className="relative z-10 h-full flex flex-col">
                                            <!-- Header row -->
                                            <div className="flex items-start justify-between mb-3">
                                                <div 
                                                    style=${{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: `1px solid rgba(255,255,255,0.2)`, borderRadius: '999px' }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest"
                                                >
                                                    <${Icon} icon=${cat.icon} style=${{ fontSize: '10px' }} />
                                                    ${cat.label}
                                                </div>
                                                <button 
                                                    onClick=${() => handleDelete(item.id)}
                                                    style=${{ color: 'rgba(255,255,255,0.4)' }}
                                                    className="p-1 hover:text-red-400 transition-colors"
                                                >
                                                    <${Trash2} size=${14} />
                                                </button>
                                            </div>

                                            <!-- Date -->
                                            <p style=${{ color: 'rgba(255,255,255,0.7)' }} className="text-[10px] font-black uppercase tracking-widest mb-2">
                                                ${formatDate(item)}
                                            </p>

                                            <!-- Title -->
                                            <h2 style=${{ color: '#fff' }} className="text-2xl font-black leading-tight mb-2 tracking-tight">
                                                ${item.title}
                                            </h2>

                                            ${item.location && html`
                                                <div className="flex items-center gap-1 mb-3" style=${{ color: 'rgba(255,255,255,0.8)' }}>
                                                    <${MapPin} size=${11} />
                                                    <span style=${{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>${item.location}</span>
                                                </div>
                                            `}

                                            <!-- Divider -->
                                            <div style=${{ height: '1px', background: 'rgba(255,255,255,0.15)', marginBottom: '12px' }} />

                                            <!-- Notes -->
                                            <div className="flex-1 overflow-hidden">
                                                <p style=${{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: 1.6, fontStyle: 'italic' }}>
                                                    "${item.notes || 'No details added.'}"
                                                </p>
                                            </div>

                                            <!-- Footer -->
                                            <div className="flex items-center justify-between mt-3 pt-3" style=${{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                                                <p style=${{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                    ${item.author}
                                                </p>
                                                <p style=${{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                    ${index + 1} / ${items.length}
                                                </p>
                                            </div>
                                        </div>
                                    </${motion.div}>
                                </div>
                            `;
                        })}
                    </div>

                    <!-- Progress Indicators -->
                    <div className="flex justify-center gap-1.5 mb-4 shrink-0">
                        ${items.map((_, i) => html`
                            <div 
                                key=${i}
                                style=${{ background: 'white', opacity: activeIndex === i ? 1 : 0.2 }}
                                className=${`h-1 rounded-full transition-all duration-300 ${activeIndex === i ? 'w-6' : 'w-1.5'}`}
                            />
                        `)}
                    </div>
                `}
            </div>

            <!-- Modal -->
            <${AnimatePresence}>
                ${isModalOpen && html`
                    <${motion.div}
                        initial=${{ opacity: 0 }}
                        animate=${{ opacity: 1 }}
                        exit=${{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[5000] flex items-center justify-center p-4"
                        onClick=${() => setIsModalOpen(false)}
                    >
                        <${motion.div}
                            initial=${{ opacity: 0, scale: 0.95, y: 20 }}
                            animate=${{ opacity: 1, scale: 1, y: 0 }}
                            exit=${{ opacity: 0, scale: 0.95, y: 20 }}
                            style=${{ borderRadius: 'var(--modal-radius)', border: '1px solid var(--modal-border)' }}
                            className="bg-[var(--modal-bg)] w-full max-w-lg p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar"
                            onClick=${e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-[var(--modal-header-text)]">New Memory</h2>
                                <button onClick=${() => setIsModalOpen(false)} className="p-2 bg-black/5 rounded-full text-zinc-400"><${X} size=${20} /></button>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--modal-label-text)] block mb-3">What happened?</label>
                                    <input
                                        autoFocus
                                        value=${newItem.title}
                                        onChange=${e => setNewItem({ ...newItem, title: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-white/10"
                                        placeholder="e.g. Our First Kiss"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">Category</label>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                        ${CATEGORIES.map(cat => html`
                                            <button
                                                key=${cat.id}
                                                onClick=${() => setNewItem({ ...newItem, category: cat.id })}
                                                style=${{ 
                                                    border: newItem.category === cat.id ? `2px solid ${cat.border}` : '2px solid transparent',
                                                    background: newItem.category === cat.id ? cat.border + '22' : 'rgba(255,255,255,0.05)',
                                                    borderRadius: '1rem',
                                                }}
                                                className="flex flex-col items-center gap-1 py-2 px-1 transition-all"
                                            >
                                                <${Icon} icon=${cat.icon} style=${{ fontSize: '20px', color: cat.border }} />
                                                <span style=${{ fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: newItem.category === cat.id ? cat.border : '#888' }}>
                                                    ${cat.label}
                                                </span>
                                            </button>
                                        `)}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Date</label>
                                        <button 
                                            onClick=${() => setNewItem({ ...newItem, isApproximate: !newItem.isApproximate })}
                                            className=${`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full transition-colors ${
                                                newItem.isApproximate ? 'bg-zinc-100 text-black' : 'bg-white/10 text-zinc-400'
                                            }`}
                                        >
                                            Approximate?
                                        </button>
                                    </div>
                                    ${!newItem.isApproximate ? html`
                                        <input
                                            type="date"
                                            value=${newItem.date}
                                            onChange=${e => setNewItem({ ...newItem, date: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none"
                                        />
                                    ` : html`
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                ${['early', 'mid', 'late'].map(p => html`
                                                    <button
                                                        key=${p}
                                                        onClick=${() => setNewItem({ ...newItem, approxPeriod: p })}
                                                        className=${`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                                            newItem.approxPeriod === p 
                                                            ? 'bg-zinc-100 text-black border-transparent' 
                                                            : 'bg-white/10 text-zinc-400 border-white/5'
                                                        }`}
                                                    >${p}</button>
                                                `)}
                                            </div>
                                            <input
                                                type="number"
                                                placeholder="Year (e.g. 2025)"
                                                value=${newItem.approxYear}
                                                onChange=${e => setNewItem({ ...newItem, approxYear: e.target.value })}
                                                className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none"
                                            />
                                        </div>
                                    `}
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">Where was it?</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"><${MapPin} size=${16} /></div>
                                        <input
                                            value=${newItem.location}
                                            onChange=${e => setNewItem({ ...newItem, location: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl py-4 pl-11 pr-4 text-[var(--text-primary)] outline-none"
                                            placeholder="e.g. Central Park"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">Notes & Details</label>
                                    <textarea
                                        value=${newItem.notes}
                                        onChange=${e => setNewItem({ ...newItem, notes: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none min-h-[90px]"
                                        placeholder="What made this moment special?"
                                    />
                                </div>

                                <button 
                                    onClick=${handleSubmit}
                                    style=${{ background: 'var(--modal-button-bg)', color: 'var(--modal-button-text)' }}
                                    className="w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                                >
                                    <${Check} size=${20} />
                                    Add to Timeline
                                </button>
                            </div>
                        </${motion.div}>
                    </${motion.div}>
                `}
            </${AnimatePresence}>
        </div>
    `;
};

export default Timeline;