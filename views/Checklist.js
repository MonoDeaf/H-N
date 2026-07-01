import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { Plus, X, Check, Loader2, ListTodo, Trash2, UserPlus, Circle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb } from '../lib/firebase.js';
import { ref, push, onValue, query, limitToLast, update, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const Checklist = ({ currentUser }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [newTask, setNewTask] = useState({
        title: '',
        assignedTo: 'both' // 'hunter', 'nate', 'both'
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
            const taskData = {
                author: currentUser?.name || 'Anonymous',
                authorId: currentUser?.id,
                title: newTask.title,
                assignedTo: newTask.assignedTo,
                completed: false,
                createdAt: Date.now()
            };
            
            await push(ref(rtdb, 'checklists'), taskData);

            // Alert partner
            const partnerName = currentUser?.id === 'hunter' ? 'Nate' : 'Hunter';
            await push(ref(rtdb, 'alerts'), {
                authorId: currentUser.id,
                author: currentUser.name,
                text: `Added a task for ${newTask.assignedTo === 'both' ? 'us' : (newTask.assignedTo === currentUser.id ? 'themselves' : partnerName)}: ${newTask.title}`,
                type: 'checklist',
                timestamp: serverTimestamp()
            });

            setNewTask({ title: '', assignedTo: 'both' });
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
                        <h1 className="text-3xl font-bold mb-1">Checklist</h1>
                        <p className="text-[var(--text-secondary)]">Things to do for each other.</p>
                    </div>
                    <button 
                        onClick=${() => setIsModalOpen(true)}
                        className="bg-zinc-800 text-white p-3 rounded-2xl active:scale-95 transition-transform"
                    >
                        <${Plus} size=${24} />
                    </button>
                </div>

                <div className="bg-white/30 rounded-2xl p-4 border border-black/5">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Task Completion</span>
                        <span className="text-xs font-bold text-zinc-800">${completedCount}/${tasks.length}</span>
                    </div>
                    <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                        <${motion.div} 
                            initial=${{ width: 0 }}
                            animate=${{ width: `${progress}%` }}
                            className="h-full bg-zinc-800 rounded-full"
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
                            className=${`shrink-0 transition-colors ${task.completed ? 'text-emerald-500' : 'text-zinc-300 hover:text-zinc-500'}`}
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
                            <p className=${`text-lg font-medium leading-tight ${task.completed ? 'line-through text-zinc-400' : ''}`}>
                                ${task.title}
                            </p>
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
                                <h2 className="text-2xl font-bold">New Task</h2>
                                <button onClick=${() => setIsModalOpen(false)} className="p-2 bg-black/5 rounded-full text-zinc-400"><${X} size=${20} /></button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">What needs doing?</label>
                                    <input
                                        autoFocus
                                        value=${newTask.title}
                                        onChange=${e => setNewTask({ ...newTask, title: e.target.value })}
                                        className="w-full bg-white/50 border border-black/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none"
                                        placeholder="e.g. Buy milk, Book reservation..."
                                    />
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
                                                    ? 'bg-zinc-800 text-white border-transparent' 
                                                    : 'bg-white/50 text-zinc-400 border-black/5'
                                                }`}
                                            >
                                                ${target}
                                            </button>
                                        `)}
                                    </div>
                                </div>

                                <button 
                                    onClick=${handleSubmit}
                                    className="w-full bg-zinc-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
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