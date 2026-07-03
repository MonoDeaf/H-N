import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { 
    Share2, Heart, Sparkles, ChevronLeft, ChevronRight, 
    Plus, X, Check, Utensils, Plane, Loader2,
    RefreshCw, CalendarHeart, Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, rtdb } from '../lib/firebase.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { collection, query, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getDayEvents, getOrdinal } from '../lib/utils.js';

const html = htm.bind(React.createElement);

const Calendar = ({ onOverlayToggle }) => {
    const today = new Date();
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        onOverlayToggle?.(isModalOpen);
    }, [isModalOpen, onOverlayToggle]);

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(today.getDate());
    const [anniversary, setAnniversary] = useState(null);
    const [showMilestones, setShowMilestones] = useState(true);
    const [showHolidays, setShowHolidays] = useState(true);
    
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "events"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const docs = [];
            querySnapshot.forEach((doc) => {
                docs.push({ id: doc.id, ...doc.data() });
            });
            setEvents(docs);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const anniversaryRef = ref(rtdb, 'settings/anniversary');
        const unsub = onValue(anniversaryRef, (snap) => {
            if (snap.val()) setAnniversary(snap.val());
        });
        return () => unsub();
    }, []);

    const [newEvent, setNewEvent] = useState({
        title: '',
        type: 'date',
        recurrence: 'none'
    });

    const categories = [
        { id: 'date', label: 'Date Night', icon: Heart, color: 'bg-pink-500' },
        { id: 'home', label: 'Home', icon: Utensils, color: 'bg-yellow-500' },
        { id: 'travel', label: 'Travel', icon: Plane, color: 'bg-sky-500' },
        { id: 'other', label: 'Other', icon: Sparkles, color: 'bg-purple-500' },
        { id: 'milestone', label: 'Milestone', icon: CalendarHeart, color: 'bg-indigo-500' },
        { id: 'holiday', label: 'Holiday', icon: Gift, color: 'bg-rose-500' },
    ];

    const recurrenceOptions = [
        { id: 'none', label: 'One-time' },
        { id: 'daily', label: 'Daily' },
        { id: 'weekly', label: 'Weekly' },
        { id: 'bi-weekly', label: 'Bi-weekly' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'yearly', label: 'Yearly' },
    ];

    const coupleHolidays = [
        { month: 1, day: 14, title: "Valentine's Day", type: 'holiday' },
        { month: 2, day: 14, title: "Steak & BJ Day", type: 'holiday' },
        { month: 5, day: 1, title: "Pride Month Begins", type: 'holiday' },
        { month: 5, day: 28, title: "Stonewall Anniversary", type: 'holiday' },
        { month: 9, day: 11, title: "National Coming Out Day", type: 'holiday' },
    ];

    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    
    // Helper to get month name
    const monthName = currentMonth.toLocaleString('default', { month: 'long' });
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const isCurrentMonthView = month === today.getMonth() && year === today.getFullYear();
    const todayDate = today.getDate();

    // Navigation logic
    const prevMonth = () => setCurrentMonth(new Date(year, month - 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1));

    // Calculate dynamic calendar grid
    const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y, m) => {
        let d = new Date(y, m, 1).getDay();
        return d === 0 ? 6 : d - 1; // Adjust for Monday start
    };

    const daysInMonth = getDaysInMonth(year, month);
    const startOffset = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);

    const calendarDays = [];
    for (let i = startOffset - 1; i >= 0; i--) {
        calendarDays.push({ day: daysInPrevMonth - i, dimmed: true });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({ day: i, dimmed: false });
    }
    const remaining = 42 - calendarDays.length;
    for (let i = 1; i <= remaining; i++) {
        calendarDays.push({ day: i, dimmed: true });
    }

    const handleAddEvent = async () => {
        if (!newEvent.title.trim()) return;
        try {
            await addDoc(collection(db, "events"), {
                ...newEvent,
                day: selectedDay,
                month,
                year,
                createdAt: Date.now()
            });
            setIsModalOpen(false);
            setNewEvent({ title: '', type: 'date', recurrence: 'none' });
        } catch (error) {
            console.error("Error adding event:", error);
        }
    };

    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    // removed local function getDayEvents() {}

    const monthEvents = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const dayEvs = getDayEvents({ d, m: month, y: year, events, anniversary, showMilestones, showHolidays });
        dayEvs.forEach(e => monthEvents.push({ ...e, day: d }));
    }

    const sortedUpcoming = monthEvents
        .filter(e => !isCurrentMonthView || e.day >= todayDate)
        .sort((a, b) => a.day - b.day);

    const daysUntilNext = sortedUpcoming.length > 0 
        ? (isCurrentMonthView ? sortedUpcoming[0].day - todayDate : 'Soon') 
        : 'N/A';

    const stats = [
        { label: 'Upcoming', value: events.length },
        { label: 'Next Event', value: daysUntilNext === 0 ? 'Today' : (daysUntilNext === 'Soon' ? 'Soon' : `${daysUntilNext}d`) },
        { label: 'This Month', value: events.length }
    ];

    return html`
        <div className="px-6 pt-4 pb-24 bg-[var(--bg-color)] min-h-screen text-[var(--text-primary)]">
            <!-- Header -->
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-[28px] font-medium text-[var(--text-primary)]">${monthName}</h1>
                    <p className="text-[var(--text-secondary)] text-sm">${year}</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-2.5 bg-black/5 rounded-full text-[var(--text-secondary)]">
                        <${Share2} size=${18} />
                    </button>
                    <button 
                        onClick=${() => setIsModalOpen(true)}
                        className="p-2.5 bg-zinc-800 rounded-full text-white"
                    >
                        <${Plus} size=${18} />
                    </button>
                </div>
            </div>

            <!-- Month Navigation -->
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick=${prevMonth}
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <${ChevronLeft} size=${20} />
                </button>
                <div className="h-px flex-1 bg-black/5" />
                <button 
                    onClick=${nextMonth}
                    className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <${ChevronRight} size=${20} />
                </button>
            </div>

            <!-- Settings Toggles -->
            <div className="flex gap-4 mb-8">
                <button 
                    onClick=${() => setShowMilestones(!showMilestones)}
                    className=${`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all border ${
                        showMilestones ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-black/5 text-zinc-400 border-transparent'
                    }`}
                >
                    <${CalendarHeart} size=${14} /> Milestones
                </button>
                <button 
                    onClick=${() => setShowHolidays(!showHolidays)}
                    className=${`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all border ${
                        showHolidays ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-black/5 text-zinc-400 border-transparent'
                    }`}
                >
                    <${Gift} size=${14} /> Holidays
                </button>
            </div>

            <!-- Calendar Grid -->
            <div className="mb-12">
                <div className="grid grid-cols-7 gap-y-4 text-center">
                    ${days.map(d => html`
                        <span key=${d} className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">${d}</span>
                    `)}
                    ${calendarDays.map((item, i) => {
                        const isSelected = selectedDay === item.day && !item.dimmed;
                        const isToday = isCurrentMonthView && item.day === todayDate && !item.dimmed;
                        const hasEvent = !item.dimmed && monthEvents.some(e => e.day === item.day);
                        
                        return html`
                            <div 
                                key=${i} 
                                onClick=${() => !item.dimmed && setSelectedDay(item.day)}
                                className="flex flex-col items-center relative py-1 cursor-pointer"
                            >
                                <div className=${`w-10 h-10 flex items-center justify-center rounded-2xl text-base transition-all duration-300 relative ${
                                    isSelected ? 'bg-zinc-800 text-white font-bold scale-110' : 
                                    item.dimmed ? 'text-black/10' : 
                                    isToday ? 'bg-white text-zinc-800 ring-2 ring-black/5' : 
                                    hasEvent ? 'bg-white/40 border border-black/10 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}>
                                    ${item.day}
                                    
                                    ${hasEvent && html`
                                        <div className=${`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-black/20'}`} />
                                    `}
                                    
                                    ${isToday && !isSelected && html`
                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-black" />
                                    `}
                                </div>
                            </div>
                        `;
                    })}
                </div>
            </div>

            <!-- Summary Stats -->
            <div className="grid grid-cols-3 gap-4 border-t border-black/5 pt-8 pb-10">
                ${stats.map((stat, i) => html`
                    <div key=${i} className=${`flex flex-col items-center ${i < 2 ? 'border-r border-black/5' : ''}`}>
                        <span className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] mb-1">${stat.label}</span>
                        <span className="text-sm font-bold text-[var(--text-primary)]">${stat.value}</span>
                    </div>
                `)}
            </div>

            <!-- Upcoming Events for Selected Day -->
            <div className="space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-4 px-1">
                    Events for ${monthName} ${selectedDay}
                </h3>
                ${getDayEvents({ d: selectedDay, m: month, y: year, events, anniversary, showMilestones, showHolidays }).length === 0 ? html`
                    <p className="text-[var(--text-secondary)] text-sm italic px-1">No events planned for this day.</p>
                ` : getDayEvents({ d: selectedDay, m: month, y: year, events, anniversary, showMilestones, showHolidays }).map((event, i) => {
                    const cat = categories.find(c => c.id === event.type) || categories[0];
                    const IconComp = cat.icon;
                    return html`
                        <div key=${i} className="bg-[var(--card-bg)] p-4 rounded-[1.5rem] flex items-center gap-4 border border-[var(--card-border)] animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className=${`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center relative`}>
                                <${IconComp} size=${18} className="text-white" />
                                ${event.recurrence && event.recurrence !== 'none' && html`
                                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                        <${RefreshCw} size=${8} className="text-zinc-600" />
                                    </div>
                                `}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[var(--text-primary)] font-medium text-sm">${event.title}</h4>
                                    ${event.virtual && html`<span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-black/5 rounded text-zinc-400">Milestone</span>`}
                                </div>
                                <p className="text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                                    ${cat.label} ${event.recurrence && event.recurrence !== 'none' ? `• ${event.recurrence}` : ''}
                                </p>
                            </div>
                        </div>
                    `;
                })}
            </div>

            <!-- Add Event Modal -->
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
                            initial=${{ opacity: 0, scale: 0.95 }}
                            animate=${{ opacity: 1, scale: 1 }}
                            exit=${{ opacity: 0, scale: 0.95 }}
                            className="bg-[var(--modal-bg)] w-full max-w-lg rounded-[2.5rem] p-8 space-y-6"
                            onClick=${e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">New Event</h2>
                                    <p className="text-[var(--text-secondary)] text-sm">For ${monthName} ${selectedDay}</p>
                                </div>
                                <button 
                                    onClick=${() => setIsModalOpen(false)}
                                    className="p-2 bg-black/5 rounded-full text-[var(--text-secondary)]"
                                >
                                    <${X} size=${20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">Event Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value=${newEvent.title}
                                        onChange=${e => setNewEvent({ ...newEvent, title: e.target.value })}
                                        className="w-full bg-white/50 border border-black/5 rounded-2xl p-4 text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
                                        placeholder="What's the plan?"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">Category</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        ${categories.filter(c => !['milestone', 'holiday'].includes(c.id)).map(cat => {
                                            const Icon = cat.icon;
                                            return html`
                                                <button
                                                    key=${cat.id}
                                                    onClick=${() => setNewEvent({ ...newEvent, type: cat.id })}
                                                    className=${`flex items-center gap-3 p-3 rounded-2xl transition-all border ${
                                                        newEvent.type === cat.id 
                                                        ? 'bg-zinc-800 text-white font-semibold border-transparent' 
                                                        : 'bg-white/50 text-[var(--text-secondary)] border-black/5'
                                                    }`}
                                                >
                                                    <div className=${`p-1.5 rounded-lg ${newEvent.type === cat.id ? 'bg-zinc-700' : cat.color + ' text-white opacity-80'}`}>
                                                        <${Icon} size=${14} />
                                                    </div>
                                                    <span className="text-xs">${cat.label}</span>
                                                </button>
                                            `;
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] block mb-3">Repeat</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        ${recurrenceOptions.map(opt => html`
                                            <button
                                                key=${opt.id}
                                                onClick=${() => setNewEvent({ ...newEvent, recurrence: opt.id })}
                                                className=${`py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                                                    newEvent.recurrence === opt.id 
                                                    ? 'bg-zinc-800 text-white border-transparent' 
                                                    : 'bg-white/50 text-[var(--text-secondary)] border-black/5'
                                                }`}
                                            >
                                                ${opt.label}
                                            </button>
                                        `)}
                                    </div>
                                </div>

                                <button 
                                    onClick=${handleAddEvent}
                                    className="w-full bg-zinc-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform mt-4"
                                >
                                    <${Check} size=${20} />
                                    Save to Calendar
                                </button>
                            </div>
                        </motion.div>
                    </${motion.div}>
                `}
            </${AnimatePresence}>
        </div>
    `;
};

export default Calendar;