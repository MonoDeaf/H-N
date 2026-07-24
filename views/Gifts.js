import React, { useState, useEffect, useRef } from 'react';
import htm from 'htm';
import { 
    Plus, X, Check, Loader2, Gift, ExternalLink, Trash2, 
    Link as LinkIcon, DollarSign, Image as ImageIcon, ShoppingBag,
    Search, Tag, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb, storage, serverTimestamp } from '../lib/firebase.js';
import { ref, push, onValue, remove, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { CompressionEngine } from '../lib/compression.js';
import { haptic } from '../lib/utils.js';

const html = htm.bind(React.createElement);
const compressor = new CompressionEngine();

const Gifts = ({ currentUser, onOverlayToggle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const [newItem, setNewItem] = useState({
        title: '',
        url: '',
        price: '',
        imageUrl: '',
        category: 'Wishlist'
    });

    const categories = ["Wishlist", "Birthday", "Anniversary", "Holiday", "Just Because"];

    useEffect(() => {
        onOverlayToggle?.(isModalOpen);
    }, [isModalOpen, onOverlayToggle]);

    useEffect(() => {
        const handleClose = () => setIsModalOpen(false);
        window.addEventListener('close-all-overlays', handleClose);
        return () => window.removeEventListener('close-all-overlays', handleClose);
    }, []);

    useEffect(() => {
        const giftsRef = ref(rtdb, 'gifts');
        const unsubscribe = onValue(giftsRef, (snapshot) => {
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

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const result = await compressor.compress(file, 200);
            const filename = `gift_images/${Date.now()}_${file.name}`;
            const storageRef = sRef(storage, filename);
            const snapshot = await uploadBytes(storageRef, result.blob);
            const url = await getDownloadURL(snapshot.ref);
            setNewItem(prev => ({ ...prev, imageUrl: url }));
        } catch (err) {
            console.error("Error uploading gift image:", err);
            alert("Image upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!newItem.title.trim()) return;

        try {
            let finalUrl = newItem.url.trim();
            if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
                finalUrl = 'https://' + finalUrl;
            }

            haptic([10, 50]);
            await push(ref(rtdb, 'gifts'), {
                ...newItem,
                url: finalUrl,
                author: currentUser.name,
                createdAt: Date.now()
            });

            // Alert partner
            await push(ref(rtdb, 'alerts'), {
                authorId: currentUser.id,
                author: currentUser.name,
                text: `Added a gift idea: ${newItem.title}`,
                type: 'gifts',
                timestamp: serverTimestamp()
            });

            setNewItem({ title: '', url: '', price: '', imageUrl: '', category: 'Wishlist' });
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error adding gift:", error);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Remove this gift idea?')) {
            await remove(ref(rtdb, `gifts/${id}`));
        }
    };

    const getStoreIcon = (url) => {
        if (!url) return html`<${ShoppingBag} size=${16} />`;
        if (url.includes('amazon')) return html`<${Icon} icon="simple-icons:amazon" />`;
        if (url.includes('walmart')) return html`<${Icon} icon="simple-icons:walmart" />`;
        if (url.includes('ebay')) return html`<${Icon} icon="simple-icons:ebay" />`;
        if (url.includes('etsy')) return html`<${Icon} icon="simple-icons:etsy" />`;
        if (url.includes('target')) return html`<${Icon} icon="simple-icons:target" />`;
        return html`<${Globe} size=${16} />`;
    };

    return html`
        <div className="px-6 pt-4 pb-24 text-[var(--text-primary)]">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-light mb-1">Gifts</h1>
                    <p className="text-[var(--text-secondary)] font-light">Things we love, saved for later.</p>
                </div>
                <button 
                    onClick=${() => setIsModalOpen(true)}
                    style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                    className="p-3 rounded-2xl active:scale-95 transition-transform"
                >
                    <${Plus} size=${24} />
                </button>
            </div>

            <div className="space-y-4">
                ${loading ? html`
                    <div className="flex justify-center py-12"><${Loader2} className="animate-spin text-zinc-400" /></div>
                ` : items.length === 0 ? html`
                    <div className="text-center py-16 px-10">
                        <div className="w-16 h-16 bg-[var(--card-bg)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--card-border)]">
                            <${Gift} size=${24} className="text-[var(--text-secondary)]" />
                        </div>
                        <p className="text-[var(--text-secondary)] italic text-sm">No gift ideas yet. Add one!</p>
                    </div>
                ` : items.map((item) => html`
                    <motion.div 
                        layout
                        key=${item.id}
                        className="bg-[var(--card-bg)] rounded-[2rem] border border-[var(--card-border)] overflow-hidden flex flex-col shadow-sm"
                    >
                        <div className="flex">
                            ${item.imageUrl && html`
                                <div className="w-28 sm:w-32 aspect-square shrink-0">
                                    <img src=${item.imageUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                            `}
                            <div className="flex-1 p-5 min-w-0 flex flex-col justify-center">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">
                                        ${item.category} • Added by ${item.author}
                                    </span>
                                    <button 
                                        onClick=${() => handleDelete(item.id)}
                                        className="text-[var(--icon-muted)] hover:text-red-400 transition-colors"
                                    >
                                        <${Trash2} size=${14} />
                                    </button>
                                </div>
                                <h3 className="text-lg font-bold leading-tight text-[var(--text-primary)] mb-1 truncate">${item.title}</h3>
                                ${item.price && html`
                                    <p className="text-emerald-600 font-bold text-sm mb-2">$${item.price}</p>
                                `}

                                ${item.url && html`
                                    <a 
                                        href=${item.url} 
                                        target="_blank" 
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-[var(--text-primary)] w-fit border border-black/5"
                                    >
                                        View Item <${ExternalLink} size=${10} />
                                    </a>
                                `}
                            </div>
                        </div>
                    </motion.div>
                `)}
            </div>

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
                                <h2 className="text-2xl font-bold text-[var(--modal-header-text)]">Add Gift Idea</h2>
                                <button 
                                    onClick=${() => setIsModalOpen(false)} 
                                    className="p-2 bg-[var(--surface-muted)] rounded-full text-[var(--icon-muted)]"
                                >
                                    <${X} size=${20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col items-center gap-4">
                                    <div 
                                        onClick=${() => fileInputRef.current?.click()}
                                        className="w-24 h-24 rounded-2xl bg-[var(--input-bg)] border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
                                    >
                                        ${newItem.imageUrl ? html`
                                            <img src=${newItem.imageUrl} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                <${Plus} className="text-white" />
                                            </div>
                                        ` : html`
                                            <${uploading ? Loader2 : ImageIcon} className=${`text-zinc-600 ${uploading ? 'animate-spin' : ''}`} size=${24} />
                                            <span className="text-[8px] font-bold uppercase text-zinc-600 mt-1">Photo</span>
                                        `}
                                    </div>
                                    <input type="file" ref=${fileInputRef} className="hidden" accept="image/*" onChange=${handleImageUpload} />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--modal-label-text)] block mb-2">Item Name</label>
                                    <input
                                        autoFocus
                                        value=${newItem.title}
                                        onChange=${e => setNewItem({ ...newItem, title: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-white/10"
                                        placeholder="e.g. Weighted Blanket"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--modal-label-text)] block mb-2">Price ($)</label>
                                        <input
                                            type="number"
                                            value=${newItem.price}
                                            onChange=${e => setNewItem({ ...newItem, price: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none"
                                            placeholder="50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--modal-label-text)] block mb-2">Occasion</label>
                                        <select 
                                            value=${newItem.category}
                                            onChange=${e => setNewItem({ ...newItem, category: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none"
                                        >
                                            ${categories.map(c => html`<option key=${c} value=${c}>${c}</option>`)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--modal-label-text)] block mb-2">Link</label>
                                    <input
                                        value=${newItem.url}
                                        onChange=${e => setNewItem({ ...newItem, url: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none"
                                        placeholder="https://amazon.com/..."
                                    />
                                </div>



                                <button 
                                    onClick=${handleSubmit}
                                    style=${{ background: 'var(--modal-button-bg)', color: 'var(--modal-button-text)' }}
                                    className="w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                                >
                                    <${Check} size=${20} />
                                    Save Gift Idea
                                </button>
                            </div>
                        </motion.div>
                    </${motion.div}>
                `}
            </${AnimatePresence}>
        </div>
    `;
};

export default Gifts;