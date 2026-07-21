import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { Plus, X, Check, Loader2, ListTodo, Trash2, UserPlus, Circle, CheckCircle2, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb } from '../lib/firebase.js';
import { ref, push, onValue, query, limitToLast, update, remove, serverTimestamp, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const Checklist = ({ currentUser, onOverlayToggle }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        onOverlayToggle?.(isModalOpen);
    }, [isModalOpen, onOverlayToggle]);

    useEffect(() => {
        const handleClose = () => setIsModalOpen(false);
        window.addEventListener('close-all-overlays', handleClose);
        return () => window.removeEventListener('close-all-overlays', handleClose);
    }, []);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [newTask, setNewTask] = useState({
        title: '',
        assignedTo: 'both', // 'hunter', 'nate', 'both'
        link: ''
    });

    useEffect(() => {
        const tasksRef = query(ref(rtdb, 'checklists'), limitToLast(100));
        const unsubscribe = onValue(tasksRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => {
                    // Show incomplete tasks first, then sort by date
                    if (a.completed !== b.completed) return a.completed ? 1 : -1;
                    return b.createdAt - a.createdAt;
                });
                setTasks(list);
            } else {
                setTasks([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async () => {
        if (!newTask.title.trim()) return;
        
        try {
            let link = newTask.link.trim();
            if (link && !/^https?:\/\//i.test(link)) {
                link = 'https://' + link;
            }

            const taskData = {
                author: currentUser?.name || 'Anonymous',
                authorId: currentUser?.id,
                title: newTask.title,
                assignedTo: newTask.assignedTo,
                link: link,
                completed: false,
                createdAt: Date.now()
            };
            
            await push(ref(rtdb, 'checklists'), taskData);

            // Alert partner
            const partnerId = currentUser?.id === 'hunter' ? 'nate' : 'hunter';
            const partnerName = currentUser?.id === 'hunter' ? 'Nate' : 'Hunter';
            const alertText = `Added a task for ${newTask.assignedTo === 'both' ? 'us' : (newTask.assignedTo === currentUser.id ? 'themselves' : partnerName)}: ${newTask.title}`;
            
            await push(ref(rtdb, 'alerts'), {
                authorId: currentUser.id,
                author: currentUser.name,
                text: alertText,
                type: 'checklist',
                timestamp: serverTimestamp()
            });

            // Trigger Make.com Webhook for Push Notifications
            const tokenSnap = await get(ref(rtdb, `users/${partnerId}/fcmToken`));
            const recipientFcmToken = tokenSnap.val();

            fetch('https://hook.us1.make.com/gv8mwbk06nzc82nceyounxd2gw37g1we', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderUid: currentUser.id,
                    senderName: currentUser.name,
                    recipientUid: partnerId,
                    recipientName: partnerName,
                    recipientFcmToken: recipientFcmToken,
                    text: alertText,
                    timestamp: Date.now(),
                    eventType: 'checklist_added'
                })
            }).catch(err => console.error("Webhook notification error:", err));

            setNewTask({ title: '', assignedTo: 'both', link: '' });
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error adding task:", error);
        }
    };

    const toggleComplete = async (task) => {
        try {
            await update(ref(rtdb, `checklists/${task.id}`), {
                completed: !task.completed,
                completedAt: !task.completed ? Date.now() : null,
                completedBy: !task.completed ? currentUser.name : null
            });
        } catch (error) {
            console.error("Error toggling task:", error);
        }
    };

    const deleteTask = async (id) => {
        if (confirm('Delete this task?')) {
            await remove(ref(rtdb, `checklists/${id}`));
        }
    };

    const completedCount = tasks.filter(t => t.completed).length;
    const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    return html`
        <div className="px-6 pt-4 pb-24 text-[var(--text-primary)]">
            <div className="mb-8 flex flex-col gap-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-light mb-1">Checklist</h1>
                        <p className="text-[var(--text-secondary)] font-light">Things to do for each other.</p>
                    </div>
                    <button 
                        onClick=${() => setIsModalOpen(true)}
                        style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                        className="p-3 rounded-2xl active:scale-95 transition-transform"
                    >
                        <${Plus} size=${24} />
                    </button>
                </div>

                <div className="bg-[var(--card-bg)] rounded-2xl p-4 border border-[var(--card-border)]">
                    <div className="flex justify-between items-center mb-2">
                        <span style=${{ fontSize: '18px', fontWeight: 300, letterSpacing: '0.01em', color: 'var(--eyebrow-text)' }}>Task Completion</span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">${completedCount}/${tasks.length}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <${motion.div} 
                            initial=${{ width: 0 }}
                            animate=${{ width: `${progress}%` }}
                            className="h-full bg-emerald-300 rounded-full"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                ${loading ? html`
                    <div className="flex justify-center py-12"><${Loader2} className="animate-spin text-zinc-400" /></div>
                ` : tasks.length === 0 ? html`
                    <div className="text-center py-12 text-zinc-500 italic">No tasks yet. Create one!</div>
                ` : tasks.map((task) => html`
                    <div 
                        key=${task.id} 
                        className=${`bg-[var(--card-bg)] p-5 rounded-[2rem] border border-[var(--card-border)] flex items-center gap-4 transition-opacity ${task.completed ? 'opacity-60' : ''}`}
                    >
                        <button 
                            onClick=${() => toggleComplete(task)}
                            style=${{ color: task.completed ? 'var(--radio-active)' : 'var(--radio-inactive)' }}
                            className="shrink-0 transition-colors"
                        >
                            ${task.completed ? html`<${CheckCircle2} size=${28} />` : html`<${Circle} size=${28} />`}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                                    ${task.author} ASSIGNED TO: ${task.assignedTo}
                                </span>
                                ${task.completed && html`
                                    <span className="text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        Done by ${task.completedBy}
                                    </span>
                                `}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <p className=${`text-lg font-medium leading-tight ${task.completed ? 'line-through text-zinc-400' : ''}`}>
                                    ${task.title}
                                </p>
                                ${task.link && html`
                                    <div className="flex">
                                        <a 
                                            href=${task.link} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            onClick=${e => e.stopPropagation()}
                                            className="flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/10 rounded-xl text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] transition-colors border border-black/5"
                                        >
                                            <${LinkIcon} size=${12} />
                                            <span className="truncate max-w-[180px]">
                                                ${task.link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                            </span>
                                            <${ExternalLink} size=${12} className="opacity-50" />
                                        </a>
                                    </div>
                                `}
                            </div>
                        </div>

                        <button 
                            onClick=${() => deleteTask(task.id)}
                            className="p-2 text-zinc-300 hover:text-red-400 transition-colors"
                        >
                            <${Trash2} size=${18} />
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
                                <h2 className="text-2xl font-bold text-[var(--modal-header-text)]">New Task</h2>
                                <button onClick=${() => setIsModalOpen(false)} className="p-2 bg-black/5 rounded-full text-zinc-400"><${X} size=${20} /></button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--modal-label-text)] block mb-3">What needs doing?</label>
                                    <input
                                        autoFocus
                                        value=${newTask.title}
                                        onChange=${e => setNewTask({ ...newTask, title: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-white/10"
                                        placeholder="e.g. Buy milk, Book reservation..."
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">Link (Optional)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                                            <${LinkIcon} size=${16} />
                                        </div>
                                        <input
                                            value=${newTask.link}
                                            onChange=${e => setNewTask({ ...newTask, link: e.target.value })}
                                            className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl py-4 pl-11 pr-4 text-[var(--text-primary)] outline-none text-sm focus:ring-1 focus:ring-white/10"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">Who is this for?</label>
                                    <div className="flex gap-2">
                                        ${['both', 'hunter', 'nate'].map(target => html`
                                            <button
                                                key=${target}
                                                onClick=${() => setNewTask({ ...newTask, assignedTo: target })}
                                                className=${`flex-1 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                                    newTask.assignedTo === target 
                                                    ? 'bg-zinc-100 text-black font-bold border-transparent' 
                                                    : 'bg-white/5 text-[var(--text-secondary)] border-white/5'
                                                }`}
                                            >
                                                ${target}
                                            </button>
                                        `)}
                                    </div>
                                </div>

                                <button 
                                    onClick=${handleSubmit}
                                    style=${{ background: 'var(--modal-button-bg)', color: 'var(--modal-button-text)' }}
                                    className="w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                                >
                                    <${Check} size=${20} />
                                    Add to Checklist
                                </button>
                            </div>
                        </motion.div>
                    </${motion.div}>
                `}
            </${AnimatePresence}>
        </div>
    `;
};

export default Checklist;