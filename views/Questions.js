import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { 
    Plus, HelpCircle, ChevronRight, Send, CheckCircle2, 
    Lock, Eye, EyeOff, Sparkles, Heart, Zap, Coffee, Ghost, X, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb, serverTimestamp } from '../lib/firebase.js';
import { ref, push, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'fun', label: 'Fun' },
    { id: 'deep', label: 'Deep' },
    { id: 'nsfw', label: 'NSFW' },
    { id: 'future', label: 'Future' }
];

const Questions = ({ currentUser, onOverlayToggle }) => {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [answerInput, setAnswerInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newQuestion, setNewQuestion] = useState({ text: '', category: 'fun' });

    useEffect(() => {
        onOverlayToggle?.(activeQuestion || isAddModalOpen);
    }, [activeQuestion, isAddModalOpen, onOverlayToggle]);

    useEffect(() => {
        const handleClose = () => {
            setActiveQuestion(null);
            setIsAddModalOpen(false);
        };
        window.addEventListener('close-all-overlays', handleClose);
        return () => window.removeEventListener('close-all-overlays', handleClose);
    }, []);

    useEffect(() => {
        const questionsRef = ref(rtdb, 'questions');
        const unsubQuestions = onValue(questionsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).reverse();
                setQuestions(list);
            } else {
                setQuestions([]);
            }
        });

        const answersRef = ref(rtdb, 'answers');
        const unsubAnswers = onValue(answersRef, (snapshot) => {
            if (snapshot.val()) {
                setAnswers(snapshot.val());
            }
            setLoading(false);
        });
        return () => {
            unsubQuestions();
            unsubAnswers();
        };
    }, []);

    // Ensure view resets to top when switching views
    useEffect(() => {
        if (activeQuestion) {
            const main = document.querySelector('main');
            if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [activeQuestion]);

    const handleAddQuestion = async () => {
        if (!newQuestion.text.trim()) return;
        try {
            await push(ref(rtdb, 'questions'), {
                text: newQuestion.text,
                category: newQuestion.category,
                author: currentUser.name,
                timestamp: Date.now()
            });
            setNewQuestion({ text: '', category: 'fun' });
            setIsAddModalOpen(false);
        } catch (error) {
            console.error("Error adding question:", error);
        }
    };

    const handleAnswerSubmit = async () => {
        if (!answerInput.trim() || !activeQuestion) return;

        try {
            await set(ref(rtdb, `answers/${activeQuestion.id}/${currentUser.id}`), {
                text: answerInput,
                author: currentUser.name,
                timestamp: Date.now()
            });

            await push(ref(rtdb, 'alerts'), {
                authorId: currentUser.id,
                author: currentUser.name,
                text: `Answered a question: "${activeQuestion.text}"`,
                type: 'questions',
                timestamp: serverTimestamp()
            });

            setAnswerInput('');
            setActiveQuestion(null);
        } catch (error) {
            console.error("Error submitting answer:", error);
        }
    };

    const filteredQuestions = selectedCategory === 'all' 
        ? questions 
        : questions.filter(q => q.category === selectedCategory);

    const getAnswerStatus = (qId) => {
        const qAnswers = answers[qId] || {};
        return (!!qAnswers.hunter && !!qAnswers.nate) ? 'both' : (!!qAnswers.hunter || !!qAnswers.nate ? 'one' : 'none');
    };

    return html`
        <div className="px-6 pt-4 pb-24 text-[var(--text-primary)]">
            <${AnimatePresence} mode="wait">
                ${!activeQuestion ? html`
                    <${motion.div}
                        key="list"
                        initial=${{ opacity: 0 }}
                        animate=${{ opacity: 1 }}
                        exit=${{ opacity: 0 }}
                    >
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h1 className="text-3xl font-light mb-1">Questions</h1>
                                <p className="text-[var(--text-secondary)] font-light">Growing our connection.</p>
                            </div>
                            <button 
                                onClick=${() => setIsAddModalOpen(true)}
                                style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                                className="p-3 rounded-2xl active:scale-95 transition-transform shrink-0"
                            >
                                <${Plus} size=${24} />
                            </button>
                        </div>

                        <!-- Categories Labels -->
                        <div className="flex gap-8 overflow-x-auto no-scrollbar mb-10 -mx-1 px-1">
                            ${CATEGORIES.map(cat => {
                                const isActive = selectedCategory === cat.id;
                                return html`
                                    <button
                                        key=${cat.id}
                                        onClick=${() => setSelectedCategory(cat.id)}
                                        className=${`flex items-center transition-all whitespace-nowrap ${
                                            isActive 
                                            ? 'text-[var(--text-primary)] opacity-100' 
                                            : 'text-[var(--text-secondary)] opacity-40'
                                        }`}
                                    >
                                        <span className="text-[14px] font-medium tracking-wider uppercase">${cat.label}</span>
                                    </button>
                                `;
                            })}
                        </div>

                        <!-- Questions List -->
                        <div className="space-y-4">
                            ${filteredQuestions.map(q => {
                                const qAnswers = answers[q.id] || {};
                                const hasAnswered = !!qAnswers[currentUser.id];

                                return html`
                                    <motion.button
                                        layoutId=${q.id}
                                        key=${q.id}
                                        onClick=${() => setActiveQuestion(q)}
                                        className="w-full text-left bg-[var(--card-bg)] p-6 rounded-[2rem] border border-[var(--card-border)] flex flex-col gap-4 active:scale-[0.98] transition-transform relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start w-full relative z-10">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                                                ${q.category}
                                            </span>
                                            <div className="flex -space-x-2">
                                                <div 
                                                    style=${{ 
                                                        backgroundColor: !!qAnswers.hunter ? 'var(--radio-active)' : 'var(--card-border)',
                                                        borderColor: 'var(--bg-color)',
                                                        color: !!qAnswers.hunter ? 'white' : 'var(--text-secondary)'
                                                    }}
                                                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors"
                                                >
                                                    <span className="leading-none">H</span>
                                                </div>
                                                <div 
                                                    style=${{ 
                                                        backgroundColor: !!qAnswers.nate ? 'var(--radio-active)' : 'var(--card-border)',
                                                        borderColor: 'var(--bg-color)',
                                                        color: !!qAnswers.nate ? 'white' : 'var(--text-secondary)'
                                                    }}
                                                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors"
                                                >
                                                    <span className="leading-none">N</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <h3 className="text-xl font-medium leading-tight text-[var(--text-primary)] relative z-10 pr-4">
                                            ${q.text}
                                        </h3>

                                        <div className="flex items-center justify-between mt-2 relative z-10">
                                            <span 
                                                style=${{ color: hasAnswered ? 'var(--radio-active)' : 'var(--text-secondary)' }}
                                                className="text-[9px] font-bold uppercase tracking-widest opacity-80"
                                            >
                                                ${hasAnswered ? 'Answered' : 'Needs answer'}
                                            </span>
                                            <${ChevronRight} size=${14} className="text-[var(--text-secondary)] opacity-30" />
                                        </div>
                                    </motion.button>
                                `;
                            })}
                        </div>
                    </${motion.div}
                ` : html`
                    <${motion.div}
                        key="detail"
                        initial=${{ opacity: 0 }}
                        animate=${{ opacity: 1 }}
                        exit=${{ opacity: 0 }}
                        className="flex flex-col min-h-full"
                    >
                        <div className="pt-4 pb-12 flex justify-start">
                            <button 
                                onClick=${() => setActiveQuestion(null)} 
                                style=${{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
                                className="group flex items-center gap-3 px-6 py-2.5 border rounded-full transition-all active:scale-95"
                            >
                                <${ChevronLeft} size=${16} className="opacity-50 group-hover:opacity-100" />
                                <span className="text-sm font-light">Back to list</span>
                            </button>
                        </div>

                        <div className="space-y-12">
                            <div className="space-y-4">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-60">${activeQuestion.category}</span>
                                <h2 className="text-3xl font-light leading-tight tracking-tight text-[var(--text-primary)]">
                                    ${activeQuestion.text}
                                </h2>
                            </div>

                            <!-- Answers Display -->
                            <div className="space-y-12">
                                ${['hunter', 'nate'].map(uid => {
                                    const answer = answers[activeQuestion.id]?.[uid];
                                    const isMe = currentUser.id === uid;
                                    const myAnswered = !!answers[activeQuestion.id]?.[currentUser.id];
                                    const shouldHide = !isMe && !myAnswered;

                                    return html`
                                        <div key=${uid} className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    style=${{ 
                                                        backgroundColor: uid === 'hunter' ? 'var(--card-border)' : 'var(--text-primary)',
                                                        color: uid === 'hunter' ? 'var(--text-primary)' : 'var(--bg-color)'
                                                    }}
                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                                >
                                                    <span className="leading-none">${uid === 'hunter' ? 'H' : 'N'}</span>
                                                </div>
                                                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                                                    ${uid === 'hunter' ? 'Hunter' : 'Nate'}
                                                </span>
                                            </div>

                                            <div className="py-2">
                                                ${!answer ? html`
                                                    <p className="text-[var(--text-secondary)] opacity-50 text-sm italic font-light">Thinking...</p>
                                                ` : shouldHide ? html`
                                                    <div className="flex items-center gap-4 py-4 text-[var(--text-secondary)]">
                                                        <${Lock} size=${18} className="opacity-40" />
                                                        <p className="text-[10px] font-medium uppercase tracking-[0.1em] italic opacity-60">
                                                            Answer yourself first to reveal their thought
                                                        </p>
                                                    </div>
                                                ` : html`
                                                    <p className="text-[var(--text-primary)] text-xl leading-relaxed font-light">
                                                        ${answer.text}
                                                    </p>
                                                `}
                                            </div>
                                        </div>
                                    `;
                                })}
                            </div>

                            <!-- Answer Input Section -->
                            <div className="pt-8 pb-12">
                                ${answers[activeQuestion.id]?.[currentUser.id] ? html`
                                    <div 
                                        style=${{ color: 'var(--radio-active)' }}
                                        className="flex items-center justify-center gap-2 py-10 opacity-60"
                                    >
                                        <${CheckCircle2} size=${16} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Question completed</span>
                                    </div>
                                ` : html`
                                    <div 
                                        style=${{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--card-border)' }}
                                        className="p-2 rounded-[2rem] flex flex-col gap-2 border"
                                    >
                                        <textarea
                                            autoFocus
                                            value=${answerInput}
                                            onChange=${e => setAnswerInput(e.target.value)}
                                            placeholder="Write your answer here..."
                                            className="w-full bg-transparent border-0 focus:ring-0 text-lg py-6 px-6 text-[var(--text-primary)] outline-none placeholder-zinc-500 min-h-[140px] resize-none font-light"
                                        />
                                        <button 
                                            onClick=${handleAnswerSubmit}
                                            style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                                            className="flex items-center justify-center gap-2 py-4 rounded-[1.5rem] active:scale-95 transition-transform font-bold uppercase tracking-widest text-[10px]"
                                        >
                                            <${Send} size=${14}/>
                                            Post Answer
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>
                    </${motion.div}>
                `}
            </${AnimatePresence}>

            <!-- Add Question Modal -->
            <${AnimatePresence}>
                ${isAddModalOpen && html`
                    <${motion.div}
                        initial=${{ opacity: 0 }}
                        animate=${{ opacity: 1 }}
                        exit=${{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[5000] flex items-center justify-center p-4"
                        onClick=${() => setIsAddModalOpen(false)}
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
                                <h2 className="text-2xl font-bold text-[var(--modal-header-text)]">New Question</h2>
                                <button onClick=${() => setIsAddModalOpen(false)} className="p-2 bg-black/5 rounded-full text-zinc-400"><${X} size=${20} /></button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--modal-label-text)] block mb-3">The Question</label>
                                    <textarea
                                        autoFocus
                                        value=${newQuestion.text}
                                        onChange=${e => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none min-h-[100px] resize-none"
                                        placeholder="e.g. What is your favorite date night memory?"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">Category</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        ${CATEGORIES.filter(c => c.id !== 'all').map(cat => html`
                                            <button
                                                key=${cat.id}
                                                onClick=${() => setNewQuestion({ ...newQuestion, category: cat.id })}
                                                className=${`py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                                                    newQuestion.category === cat.id 
                                                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-transparent' 
                                                    : 'bg-[var(--input-bg)] text-[var(--text-secondary)] border-[var(--card-border)]'
                                                }`}
                                            >
                                                ${cat.label}
                                            </button>
                                        `)}
                                    </div>
                                </div>

                                <button 
                                    onClick=${handleAddQuestion}
                                    style=${{ background: 'var(--modal-button-bg)', color: 'var(--modal-button-text)' }}
                                    className="w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform mt-4"
                                >
                                    <${Plus} size=${18} />
                                    Add Question
                                </button>
                            </div>
                        </motion.div>
                    </${motion.div}>
                `}
            </${AnimatePresence}>
        </div>
    `;
};

export default Questions;