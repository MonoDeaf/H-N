import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import htm from 'htm';
import { 
    Plus, X, Loader2, Camera, Trash2, Maximize2, 
    Download, Calendar, User as UserIcon, Image as ImageIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb, storage } from '../lib/firebase.js';
import { ref as rRef, push, onValue, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { CompressionEngine } from '../lib/compression.js';

const html = htm.bind(React.createElement);
const compressor = new CompressionEngine();

const Photos = ({ currentUser, onOverlayToggle }) => {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        onOverlayToggle?.(!!selectedPhoto);
    }, [selectedPhoto, onOverlayToggle]);

    useEffect(() => {
        const photosRef = rRef(rtdb, 'photos');
        const unsubscribe = onValue(photosRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => b.timestamp - a.timestamp);
                setPhotos(list);
            } else {
                setPhotos([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            // Compress image to ~200kb before upload
            const result = await compressor.compress(file, 200);
            const compressedBlob = result.blob;

            const filename = `${Date.now()}_${file.name.split('.')[0]}.jpg`;
            const storagePath = `shared_photos/${filename}`;
            const fileRef = sRef(storage, storagePath);

            const snapshot = await uploadBytes(fileRef, compressedBlob);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await push(rRef(rtdb, 'photos'), {
                url: downloadURL,
                author: currentUser?.name || 'Anonymous',
                authorId: currentUser?.id,
                timestamp: Date.now(),
                filename: filename
            });

            // Alert partner
            await push(rRef(rtdb, 'alerts'), {
                authorId: currentUser.id,
                author: currentUser.name,
                text: `Uploaded a new photo!`,
                type: 'photos',
                timestamp: serverTimestamp()
            });

        } catch (error) {
            console.error("Error uploading photo:", error);
            alert("Failed to upload photo.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (e, photo) => {
        e.stopPropagation();
        if (confirm('Delete this photo for everyone?')) {
            try {
                await remove(rRef(rtdb, `photos/${photo.id}`));
            } catch (error) {
                console.error("Error deleting photo:", error);
            }
        }
    };

    const formatDate = (ts) => {
        return new Date(ts).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    return html`
        <div className="px-6 pt-4 pb-24 text-[var(--text-primary)]">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-light mb-1">Photos</h1>
                    <p className="text-[var(--text-secondary)] font-light">Capturing our moments.</p>
                </div>
                <button 
                    onClick=${() => fileInputRef.current?.click()}
                    disabled=${uploading}
                    className="bg-zinc-800 text-white p-3 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
                >
                    ${uploading ? html`<${Loader2} className="animate-spin" size=${24} />` : html`<${Plus} size=${24} />`}
                </button>
            </div>

            <input 
                type="file" 
                ref=${fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange=${handleFileSelect} 
            />

            <div className="flex flex-col gap-6">
                ${loading ? html`
                    <div className="flex justify-center py-20"><${Loader2} className="animate-spin text-zinc-500" /></div>
                ` : photos.length === 0 ? html`
                    <div className="text-center py-20 px-10">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <${ImageIcon} size=${32} className="text-zinc-600" />
                        </div>
                        <p className="text-zinc-500 italic">No photos shared yet.</p>
                        <p className="text-zinc-600 text-xs mt-2">Upload your first memory together.</p>
                    </div>
                ` : photos.map((photo) => html`
                    <motion.div 
                        layoutId=${photo.id}
                        key=${photo.id}
                        onClick=${() => setSelectedPhoto(photo)}
                        className="bg-[var(--card-bg)] rounded-[2.5rem] overflow-hidden border border-[var(--card-border)] shadow-sm active:scale-[0.98] transition-transform"
                    >
                        <div className="aspect-[4/5] relative">
                            <img 
                                src=${photo.url} 
                                alt="" 
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button 
                                    onClick=${(e) => handleDelete(e, photo)}
                                    className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white/70 hover:text-red-400 transition-colors"
                                >
                                    <${Trash2} size=${16} />
                                </button>
                            </div>
                        </div>
                        <div className="p-5 flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                                    <${UserIcon} size=${10} />
                                    <span>${photo.author}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                    <${Calendar} size=${10} />
                                    <span>${formatDate(photo.timestamp)}</span>
                                </div>
                            </div>
                            <div className="text-zinc-400">
                                <${Maximize2} size=${18} />
                            </div>
                        </div>
                    </motion.div>
                `)}
            </div>

            ${ReactDOM.createPortal(
                html`
                    <${AnimatePresence}>
                        ${selectedPhoto && html`
                            <${motion.div}
                                initial=${{ opacity: 0 }}
                                animate=${{ opacity: 1 }}
                                exit=${{ opacity: 0 }}
                                className="fixed inset-0 bg-black z-[2000] flex flex-col"
                                onClick=${() => setSelectedPhoto(null)}
                            >
                                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
                                    <div className="flex flex-col">
                                        <span className="text-white font-bold text-sm">Shared by ${selectedPhoto.author}</span>
                                        <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">${formatDate(selectedPhoto.timestamp)}</span>
                                    </div>
                                    <button className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white">
                                        <${X} size=${24} />
                                    </button>
                                </div>

                                <div className="flex-1 flex items-center justify-center p-2">
                                    <${motion.img} 
                                        layoutId=${selectedPhoto.id}
                                        src=${selectedPhoto.url} 
                                        className="max-w-full max-h-full object-contain rounded-xl"
                                        onClick=${(e) => e.stopPropagation()}
                                    />
                                </div>

                                <div className="p-8 flex justify-center bg-gradient-to-t from-black/60 to-transparent">
                                    <a 
                                        href=${selectedPhoto.url} 
                                        download 
                                        target="_blank"
                                        onClick=${(e) => e.stopPropagation()}
                                        className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full text-white font-bold text-sm border border-white/10 active:scale-95 transition-transform"
                                    >
                                        <${Download} size=${18} />
                                        Save Photo
                                    </a>
                                </div>
                            </${motion.div}>
                        `}
                    </${AnimatePresence}>
                `,
                document.body
            )}
        </div>
    `;
};

export default Photos;