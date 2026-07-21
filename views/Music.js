import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { Music as MusicIcon, Save, Loader2, Play, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { rtdb } from '../lib/firebase.js';
import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const Music = () => {
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [savedUrl, setSavedUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const musicRef = ref(rtdb, 'settings/spotifyPlaylist');
        const unsubscribe = onValue(musicRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
                setSavedUrl(val);
                setPlaylistUrl(val);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await set(ref(rtdb, 'settings/spotifyPlaylist'), playlistUrl);
            setSavedUrl(playlistUrl);
        } catch (error) {
            console.error("Error saving playlist:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const getEmbedUrl = (url) => {
        if (!url) return null;
        try {
            // Handle different Spotify link formats
            const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
            if (match && match[1]) {
                return `https://open.spotify.com/embed/playlist/${match[1]}?utm_source=generator&theme=0`;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    const embedUrl = getEmbedUrl(savedUrl);

    return html`
        <div className="px-6 pt-4 pb-24 text-[var(--text-primary)]">
            <div className="mb-8">
                <h1 className="text-3xl font-light mb-1">Our Music</h1>
                <p className="text-[var(--text-secondary)] font-light">The soundtrack to us.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--card-border)] space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                            <${MusicIcon} size=${20} />
                        </div>
                        <h3 className="font-bold">Playlist Link</h3>
                    </div>
                    
                    <input
                        type="text"
                        value=${playlistUrl}
                        onChange=${e => setPlaylistUrl(e.target.value)}
                        placeholder="Paste Spotify playlist URL..."
                        className="w-full bg-white/50 border border-black/5 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    
                    <button 
                        onClick=${handleSave}
                        disabled=${isSaving || playlistUrl === savedUrl}
                        style=${playlistUrl !== savedUrl ? { backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' } : {}}
                        className=${`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all ${
                            playlistUrl !== savedUrl 
                            ? '' 
                            : 'bg-black/10 text-zinc-400 cursor-not-allowed'
                        }`}
                    >
                        ${isSaving ? html`<${Loader2} className="animate-spin" size=${20} />` : html`<${Save} size=${20} />`}
                        Update Playlist
                    </button>
                </div>

                ${loading ? html`
                    <div className="flex justify-center py-12"><${Loader2} className="animate-spin text-zinc-400" /></div>
                ` : embedUrl ? html`
                    <div className="bg-black rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-500 aspect-[4/5] sm:aspect-square">
                        <iframe 
                            src=${embedUrl} 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            allowFullScreen="" 
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                            loading="lazy"
                        ></iframe>
                    </div>
                ` : savedUrl && html`
                    <div className="p-8 text-center bg-[var(--card-bg)] rounded-[2rem] border border-dashed border-[var(--card-border)]">
                        <p className="text-[var(--text-secondary)] text-sm mb-4">We couldn't generate an embed for this link, but you can still open it:</p>
                        <a href=${savedUrl} target="_blank" className="inline-flex items-center gap-2 text-emerald-600 font-bold">
                            Open in Spotify <${ExternalLink} size=${16} />
                        </a>
                    </div>
                `}

                ${!savedUrl && !loading && html`
                    <div className="p-12 text-center bg-[var(--card-bg)] rounded-[2rem] border border-dashed border-[var(--card-border)]">
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
                            <${Play} size=${32} />
                        </div>
                        <p className="text-[var(--text-secondary)] text-sm">Add a shared Spotify playlist to see it here.</p>
                    </div>
                `}
            </div>
        </div>
    `;
};

export default Music;