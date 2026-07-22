import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import htm from 'htm';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Check, ArrowRight, Smile, BookOpen, HelpCircle, 
    ChevronRight, ChevronLeft, Sparkles, Heart, Loader2 
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { rtdb, serverTimestamp, increment } from '../lib/firebase.js';
import { ref, push, set, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const html = htm.bind(React.createElement);

const MOODS = [
    { icon: 'ph:sun-duotone', label: 'Great', base: '#5B9FD4', mid: '#93C5FD', light: '#BFDBFE' },
    { icon: 'ph:heart-duotone', label: 'Loved', base: '#E879A0', mid: '#F9A8D4', light: '#FBCFE8' },
    { icon: 'ph:leaf-duotone', label: 'Calm', base: '#34C98A', mid: '#6EE7B7', light: '#A7F3D0' },
    { icon: 'ph:moon-stars-duotone', label: 'Tired', base: '#9170E8', mid: '#C4B5FD', light: '#DDD6FE' },
    { icon: 'ph:cloud-rain-duotone', label: 'Down', base: '#5B9FD4', mid: '#93C5FD', light: '#BAE6FD' },
    { icon: 'ph:fire-duotone', label: 'Angry', base: '#E85B5B', mid: '#FCA5A5', light: '#FECACA' },
    { icon: 'ph:wind-duotone', label: 'Anxious', base: '#3BACD4', mid: '#7DD3FC', light: '#BAE6FD' },
    { icon: 'ph:sparkle-duotone', label: 'Excited', base: '#E879A0', mid: '#F9A8D4', light: '#FDE68A' },
    { icon: 'ph:ghost-duotone', label: 'Lonely', base: '#8A99B0', mid: '#CBD5E1', light: '#E2E8F0' },
    { icon: 'ph:cloud-fog-duotone', label: 'Foggy', base: '#607488', mid: '#94A3B8', light: '#CBD5E1' },
    { icon: 'ph:heart-break-duotone', label: 'Betrayed', base: '#A855F7', mid: '#D8B4FE', light: '#EDE9FE' },
    { icon: 'ph:magnifying-glass-duotone', label: 'Curious', base: '#D4A017', mid: '#FCD34D', light: '#FEF08A' },
    { icon: 'ph:thermometer-hot-duotone', label: 'Hot', base: '#E85B5B', mid: '#FCA5A5', light: '#FDBA74' },
    { icon: 'ph:snowflake-duotone', label: 'Cold', base: '#3BACD4', mid: '#7DD3FC', light: '#BAE6FD' },
    { icon: 'ph:couch-duotone', label: 'Comfortable', base: '#3BAF78', mid: '#A3E6A0', light: '#D1FAE5' },
    { icon: 'ph:heartbeat-duotone', label: 'Horny', base: '#E05C78', mid: '#FDA4AF', light: '#FECDD3' },
];

const DailyCheckInModal = ({ isOpen, onClose, currentUser }) => {
    const [step, setStep] = useState(0); // 0: Start, 1: Mood, 2: Journal, 3: Question, 4: Finished
    const [mood, setMood] = useState(null);
    const [journal, setJournal] = useState('');
    const [randomQuestion, setRandomQuestion] = useState(null);
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const [skipCount, setSkipCount] = useState(0);
    const MAX_SKIPS = 3;

    useEffect(() => {
        if (isOpen && step === 0) {
            fetchRandomQuestion();
        }
    }, [isOpen]);

    const fetchRandomQuestion = async (excludeId = null, lastCategoryId = null) => {
        const questionsRef = ref(rtdb, 'questions');
        const answersRef = ref(rtdb, 'answers');
        
        try {
            const [qSnap, aSnap] = await Promise.all([get(questionsRef), get(answersRef)]);
            const questions = qSnap.val() || {};
            const answers = aSnap.val() || {};

            const unanswered = Object.keys(questions)
                .map(id => ({ id, ...questions[id] }))
                .filter(q => !answers[q.id]?.[currentUser.id] && q.id !== excludeId);

            if (unanswered.length > 0) {
                // To improve "alternating" categories, try to pick from a different category than the last one if skipping
                const differentCategoryPool = lastCategoryId 
                    ? unanswered.filter(q => q.category !== lastCategoryId)
                    : [];
                
                const pool = (differentCategoryPool.length > 0) ? differentCategoryPool : unanswered;
                const random = pool[Math.floor(Math.random() * pool.length)];
                setRandomQuestion(random);
            } else {
                setRandomQuestion(null);
            }
        } catch (e) {
            console.error("Error fetching question:", e);
        }
    };

    const handleSkip = () => {
        if (skipCount < MAX_SKIPS && randomQuestion) {
            const currentId = randomQuestion.id;
            const currentCategory = randomQuestion.category;
            setSkipCount(prev => prev + 1);
            setAnswer('');
            fetchRandomQuestion(currentId, currentCategory);
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            const timestamp = Date.now();
            const updates = {};

            // 1. Save Mood
            if (mood) {
                updates[`users/${currentUser.id}/mood`] = {
                    label: mood.label,
                    icon: mood.icon,
                    timestamp
                };
            }

            // 2. Save Journal
            if (journal.trim()) {
                const journalRef = push(ref(rtdb, 'journal'));
                updates[`journal/${journalRef.key}`] = {
                    author: currentUser.name,
                    title: "Daily Check-in",
                    content: journal,
                    isNSFW: false,
                    createdAt: timestamp,
                    dateLabel: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                };
            }

            // 3. Save Answer
            if (answer.trim() && randomQuestion) {
                updates[`answers/${randomQuestion.id}/${currentUser.id}`] = {
                    text: answer,
                    author: currentUser.name,
                    timestamp
                };
            }

            // 4. Mark completion
            updates[`users/${currentUser.id}/lastDailyCheckIn`] = timestamp;

            // 4b. Award 10 Points
            updates[`settings/points/${currentUser.id}`] = increment(10);

            // 5. Save History Record for Log
            const historyRef = push(ref(rtdb, 'checkinsHistory'));
            updates[`checkinsHistory/${historyRef.key}`] = {
                userId: currentUser.id,
                userName: currentUser.name,
                mood: mood,
                journal: journal,
                question: randomQuestion ? { text: randomQuestion.text, answer: answer } : null,
                timestamp: timestamp
            };

            // 6. Send generic alert
            const alertRef = push(ref(rtdb, 'alerts'));
            updates[`alerts/${alertRef.key}`] = {
                authorId: currentUser.id,
                author: currentUser.name,
                text: `Completed their Daily Check-in! ✨`,
                type: 'mood',
                timestamp: serverTimestamp()
            };

            // Use atomic update for reliability
            await update(ref(rtdb), updates);

            setStep(4);
        } catch (e) {
            console.error("Completion error:", e);
            alert("Something went wrong saving your check-in. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const steps = [
        // STEP 0: WELCOME
        html`
            <div className="flex flex-col items-center text-center space-y-12 py-6">
                <div className="relative w-full h-72 mb-4">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <${motion.div} 
                            animate=${{ 
                                y: [0, -10, 0],
                                rotate: [0, 2, 0]
                            }}
                            transition=${{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="relative w-64 h-64"
                        >
                            <${motion.div} 
                                initial=${{ scale: 0 }}
                                animate=${{ scale: 1 }}
                                transition=${{ delay: 0 }}
                                className="absolute w-28 h-28 bg-[#B4F481] rounded-full flex items-center justify-center shadow-lg z-10"
                                style=${{ left: '10%', top: '20%' }}
                            >
                                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M8 14s1.5 2.5 4 2.5 4-2.5 4-2.5"/>
                                    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5"/>
                                    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5"/>
                                </svg>
                            </${motion.div}>

                            <${motion.div} 
                                initial=${{ scale: 0 }}
                                animate=${{ scale: 1 }}
                                transition=${{ delay: 0.1 }}
                                className="absolute w-24 h-24 bg-[#E2C2FF] rounded-full flex items-center justify-center shadow-lg z-20"
                                style=${{ right: '10%', top: '5%' }}
                            >
                                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M8 13.5s1.5 2 4 2 4-2 4-2"/>
                                    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5"/>
                                    <path d="M8.5 9.5 C8.5 9.5 9 8.5 10 9"/>
                                </svg>
                            </${motion.div}>

                            <${motion.div} 
                                initial=${{ scale: 0 }}
                                animate=${{ scale: 1 }}
                                transition=${{ delay: 0.2 }}
                                className="absolute w-32 h-32 bg-[#FF9D66] rounded-[2.5rem] flex items-center justify-center shadow-lg z-10"
                                style=${{ right: '0%', bottom: '15%', rotate: '15deg' }}
                            >
                                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <circle cx="12" cy="14" r="2.5"/>
                                    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5"/>
                                    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5"/>
                                </svg>
                            </${motion.div}>

                            <${motion.div} 
                                initial=${{ scale: 0 }}
                                animate=${{ scale: 1 }}
                                transition=${{ delay: 0.3 }}
                                className="absolute w-28 h-28 bg-[#FFD747] rounded-3xl flex items-center justify-center shadow-lg z-30"
                                style=${{ left: '25%', bottom: '5%', rotate: '-10deg' }}
                            >
                                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M9 12 C9 12 9 15 12 15 C15 15 15 12 15 12"/>
                                    <path d="M12 15 C12 15 11 17.5 12 18 C13 17.5 12 15 12 15" fill="rgba(0,0,0,0.3)" stroke="none"/>
                                    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5"/>
                                    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5"/>
                                </svg>
                            </${motion.div}>

                            <${motion.div} 
                                initial=${{ scale: 0 }}
                                animate=${{ scale: 1 }}
                                transition=${{ delay: 0.4 }}
                                className="absolute w-24 h-24 bg-[#91CFFF] rounded-full flex items-center justify-center shadow-lg z-10"
                                style=${{ left: '0%', bottom: '20%' }}
                            >
                                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                                    <path d="M8 9 C8 9 8.5 8 9.5 8.5"/>
                                    <path d="M16 9 C16 9 15.5 8 14.5 8.5"/>
                                </svg>
                            </${motion.div}>

                            <${motion.div} 
                                initial=${{ scale: 0 }}
                                animate=${{ scale: 1 }}
                                transition=${{ delay: 0.5 }}
                                className="absolute w-20 h-20 bg-[#FFB6C1] rounded-full flex items-center justify-center shadow-lg z-20"
                                style=${{ left: '-5%', top: '45%', rotate: '-5deg' }}
                            >
                                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M8 9 L10 11 M10 9 L8 11" strokeWidth="2"/>
                                    <path d="M14 9 L16 11 M16 9 L14 11" strokeWidth="2"/>
                                    <path d="M9 17 Q12 14 15 17" />
                                </svg>
                            </${motion.div}>
                        </${motion.div}>
                    </div>
                </div>

                <div className="space-y-4 px-4 z-10">
                    <h2 className="text-4xl font-bold tracking-tight leading-tight text-[var(--modal-header-text)]">
                        Daily Check-in
                    </h2>
                    <p className="text-[var(--text-secondary)] font-light max-w-xs mx-auto">
                        A quick moment to catch up and share how your day is going.
                    </p>
                </div>

                <button 
                    onClick=${nextStep}
                    className="group bg-black text-white px-8 py-5 rounded-full font-bold text-lg flex items-center gap-6 active:scale-95 transition-all shadow-2xl hover:bg-zinc-800"
                >
                    Let's Begin
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1">
                        <${ArrowRight} size=${18} className="text-white" />
                    </div>
                </button>
            </div>
        `,

        // STEP 1: MOOD
        html`
            <div className="space-y-8 py-4">
                <div className="space-y-2">
                    <h2 className="text-4xl font-light tracking-tight text-[var(--modal-header-text)]">How are you feeling?</h2>
                    <p className="text-[var(--text-secondary)] font-light">Select your current vibe.</p>
                </div>
                <div className="grid grid-cols-2 gap-[6px]">
                    ${MOODS.map(mood => html`
                        <${motion.button} 
                            key=${mood.label} 
                            onClick=${() => { setMood(mood); nextStep(); }}
                            whileTap=${{ scale: 0.9, filter: 'brightness(0.95)' }}
                            transition=${{ type: 'spring', stiffness: 600, damping: 20 }}
                            style=${{ 
                                background: mood.base,
                                boxShadow: `inset 0 0 70px 20px ${mood.mid}CC, inset 0 0 40px 12px rgba(255,255,255,0.4)`
                            }}
                            className="aspect-square rounded-full flex flex-col items-center justify-center relative overflow-hidden outline-none"
                        >
                            <svg className="absolute inset-0 w-full h-full opacity-[0.18] pointer-events-none" style=${{ mixBlendMode: 'overlay' }}>
                                <filter id=${'daily-grain-' + mood.label}>
                                    <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
                                    <feColorMatrix type="saturate" values="0"/>
                                </filter>
                                <rect width="100%" height="100%" filter=${'url(#daily-grain-' + mood.label + ')'}/>
                            </svg>
                            <div className="relative z-10 flex flex-col items-center justify-center gap-1.5">
                                <${Icon} 
                                    icon=${mood.icon} 
                                    style=${{ fontSize: '52px', color: 'rgba(255,255,255,0.7)' }}
                                />
                                <span className="font-normal text-[13px] text-white/90 tracking-wide leading-tight text-center">
                                    ${mood.label}
                                </span>
                            </div>
                        </${motion.button}>
                    `)}
                </div>
            </div>
        `,

        // STEP 2: JOURNAL
        html`
            <div className="space-y-8 py-4">
                <div className="space-y-2">
                    <h2 className="text-4xl font-light tracking-tight text-[var(--modal-header-text)]">What's on your mind?</h2>
                    <p className="text-[var(--text-secondary)] font-light">Write a quick note about your day.</p>
                </div>
                <textarea
                    autoFocus
                    value=${journal}
                    onChange=${e => setJournal(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-white/5 rounded-[2rem] p-6 text-lg min-h-[220px] outline-none focus:ring-1 focus:ring-white/10 text-[var(--text-primary)] transition-all"
                    placeholder="Today I felt..."
                />
                <button 
                    onClick=${nextStep}
                    disabled=${!journal.trim()}
                    style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                    className="w-full py-5 rounded-[2rem] font-bold text-lg shadow-xl active:scale-95 transition-all disabled:opacity-50"
                >
                    Continue
                </button>
            </div>
        `,

        // STEP 3: QUESTION
        html`
            <div className="space-y-8 py-4">
                <div className="space-y-2">
                    <h2 className="text-4xl font-light tracking-tight text-[var(--modal-header-text)]">A question for you...</h2>
                    <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">Random Prompt</p>
                </div>
                
                ${randomQuestion ? html`
                    <div className="space-y-4">
                        <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--card-border)] space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-50 block mb-2">${randomQuestion.category || 'Thought'}</span>
                            <p className="text-2xl font-light text-[var(--text-primary)] leading-tight italic">"${randomQuestion.text}"</p>
                        </div>
                        ${skipCount < MAX_SKIPS && html`
                            <button 
                                onClick=${handleSkip}
                                className="w-full py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)] opacity-60 hover:opacity-100 transition-opacity text-right pr-4"
                            >
                                Skip Question (${skipCount}/${MAX_SKIPS})
                            </button>
                        `}
                    </div>
                    <textarea
                        autoFocus
                        value=${answer}
                        onChange=${e => setAnswer(e.target.value)}
                        className="w-full bg-[var(--input-bg)] border border-white/5 rounded-[2rem] p-6 text-lg min-h-[160px] outline-none focus:ring-1 focus:ring-white/10 text-[var(--text-primary)] transition-all"
                        placeholder="Your answer..."
                    />
                ` : html`
                    <div className="py-12 text-center text-[var(--text-secondary)] italic">You've answered all questions! Way to go.</div>
                `}

                <div className="space-y-3">
                    <button 
                        onClick=${handleComplete}
                        disabled=${loading || (randomQuestion && !answer.trim())}
                        style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                        className="w-full py-5 rounded-[2rem] font-bold text-lg shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                        ${loading ? html`<${Loader2} className="animate-spin" />` : 'Finish Check-in'}
                    </button>
                </div>
            </div>
        `,

        // STEP 4: FINISHED
        html`
            <div className="flex flex-col items-center text-center space-y-8 py-12">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(16,185,129,0.3)]">
                    <${Check} className="text-white" size=${40} strokeWidth={3} />
                </div>
                <div className="space-y-3">
                    <h2 className="text-4xl font-light tracking-tight text-[var(--modal-header-text)]">All Done!</h2>
                    <p className="text-[var(--text-secondary)] font-light px-4">
                        Thank you for checking in. Your updates have been shared with your partner.
                    </p>
                </div>
                <button 
                    onClick=${onClose}
                    style=${{ backgroundColor: 'var(--surface-muted)', color: 'var(--text-primary)' }}
                    className="w-full py-5 rounded-[2rem] font-bold text-lg active:scale-95 transition-all"
                >
                    Close
                </button>
            </div>
        `
    ];

    return ReactDOM.createPortal(
        html`
            <${AnimatePresence}>
                ${isOpen && html`
                    <${motion.div}
                        initial=${{ opacity: 0 }}
                        animate=${{ opacity: 1 }}
                        exit=${{ opacity: 0 }}
                        className="fixed inset-0 z-[6000] flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar"
                        style=${{ top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-color)' }}
                    >
                        <div className="p-6 flex justify-between items-center shrink-0 sticky top-0 z-50 bg-[var(--bg-color)]">
                            ${step > 0 && step < 4 ? html`
                                <button onClick=${prevStep} className="p-3 bg-[var(--surface-muted)] rounded-full text-[var(--icon-muted)]">
                                    <${ChevronLeft} size=${20} />
                                </button>
                            ` : html`<div className="w-10" />`}
                            
                            ${step < 4 && html`
                                <div className="flex gap-1.5">
                                    ${[0, 1, 2, 3].map(i => html`
                                        <div 
                                            key=${i} 
                                            style=${{ backgroundColor: step === i ? 'var(--indicator-active)' : 'var(--indicator-inactive)' }}
                                            className=${`h-1 rounded-full transition-all duration-300 ${step === i ? 'w-8' : 'w-2'}`} 
                                        />
                                    `)}
                                </div>
                            `}

                            <button onClick=${onClose} className="p-3 bg-[var(--surface-muted)] rounded-full text-[var(--icon-muted)]">
                                <${X} size=${20} />
                            </button>
                        </div>

                        <div className="px-6 pb-10">
                            <${motion.div}
                                key=${step}
                                initial=${{ opacity: 0, x: 20 }}
                                animate=${{ opacity: 1, x: 0 }}
                                exit=${{ opacity: 0, x: -20 }}
                                transition=${{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="max-w-md mx-auto"
                            >
                                ${steps[step]}
                            </${motion.div}>
                        </div>
                    </${motion.div}>
                `}
            </${AnimatePresence}>
        `,
        document.body
    );
};

export default DailyCheckInModal;