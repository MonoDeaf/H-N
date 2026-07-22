import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { Link as LinkIcon, Plus, X, Check, Loader2, Globe, ExternalLink, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb } from '../lib/firebase.js';
import { ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const Profiles = ({ currentUser, onOverlayToggle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        onOverlayToggle?.(isModalOpen);
    }, [isModalOpen, onOverlayToggle]);

    useEffect(() => {
        const handleClose = () => setIsModalOpen(false);
        window.addEventListener('close-all-overlays', handleClose);
        return () => window.removeEventListener('close-all-overlays', handleClose);
    }, []);
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newLink, setNewLink] = useState({ title: '', url: '' });

    useEffect(() => {
        const linksRef = ref(rtdb, 'profiles');
        const unsubscribe = onValue(linksRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).reverse();
                setLinks(list);
            } else {
                setLinks([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async () => {
        if (!newLink.title.trim() || !newLink.url.trim()) return;
        
        let url = newLink.url.trim();
        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
        }

        try {
            await push(ref(rtdb, 'profiles'), {
                title: newLink.title,
                url: url,
                author: currentUser?.name || 'Anonymous',
                createdAt: Date.now()
            });
            setNewLink({ title: '', url: '' });
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error adding link:", error);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this link?')) {
            await remove(ref(rtdb, `profiles/${id}`));
        }
    };

    return html`
        <div className="px-6 pt-4 pb-24 text-[var(--text-primary)]">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-light mb-1">Links</h1>
                    <p className="text-[var(--text-secondary)] font-light">Shared links & quick-links.</p>
                </div>
                <button 
                    onClick=${() => setIsModalOpen(true)}
                    style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                    className="p-3 rounded-2xl active:scale-95 transition-transform"
                >
                    <${Plus} size=${24} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
                ${loading ? html`
                    <div className="flex justify-center py-12"><${Loader2} className="animate-spin text-zinc-400" /></div>
                ` : links.length === 0 ? html`
                    <div className="text-center py-12 text-zinc-500 italic">No shared links yet.</div>
                ` : links.map((link) => html`
                    <div 
                        key=${link.id} 
                        className="bg-[var(--card-bg)] p-5 rounded-[2rem] border border-[var(--card-border)] flex items-center justify-between group"
                    >
                        <a 
                            href=${link.url} 
                            target="_blank" 
                            className="flex items-center gap-4 flex-1 min-w-0"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-zinc-800/5 flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                                <${Globe} size=${20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg leading-tight truncate">${link.title}</h3>
                                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Added by ${link.author}</p>
                            </div>
                            <${ExternalLink} size=${16} className="text-[var(--icon-muted)] mr-2" />
                        </a>
                        <button 
                            onClick=${() => handleDelete(link.id)}
                            className="p-2 text-[var(--icon-muted)] hover:text-red-400 transition-colors"
                        >
                            <${Trash2} size=${16} />
                        </button>
                    </div>
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
                                <h2 className="text-2xl font-bold text-[var(--modal-header-text)]">Add Link</h2>
                                <button onClick=${() => setIsModalOpen(false)} className="p-2 bg-[var(--surface-muted)] rounded-full text-[var(--icon-muted)]"><${X} size=${20} /></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--modal-label-text)] block mb-3">Title</label>
                                    <input
                                        autoFocus
                                        value=${newLink.title}
                                        onChange=${e => setNewLink({ ...newLink, title: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-white/10"
                                        placeholder="e.g. Nate's Instagram"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">URL</label>
                                    <input
                                        value=${newLink.url}
                                        onChange=${e => setNewLink({ ...newLink, url: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-white/10"
                                        placeholder="instagram.com/..."
                                    />
                                </div>

                                <button 
                                    onClick=${handleSubmit}
                                    style=${{ background: 'var(--modal-button-bg)', color: 'var(--modal-button-text)' }}
                                    className="w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                                >
                                    <${Check} size=${20} />
                                    Save Link
                                </button>
                            </div>
                        </motion.div>
                    </${motion.div}>
                `}
            </${AnimatePresence}>
        </div>
    `;
};

export default Profiles;