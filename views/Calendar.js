import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { 
    Share2, Heart, Sparkles, ChevronLeft, ChevronRight, 
    Plus, X, Check, Utensils, Plane, Loader2,
    RefreshCw, CalendarHeart, Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb, serverTimestamp, increment, update } from '../lib/firebase.js';
import { ref, onValue, get, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getDayEvents, getOrdinal } from '../lib/utils.js';

const html = htm.bind(React.createElement);

const Calendar = ({ currentUser, onOverlayToggle }) => {
    const today = new Date();
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        onOverlayToggle?.(isModalOpen);
    }, [isModalOpen, onOverlayToggle]);

    useEffect(() => {
        const handleClose = () => setIsModalOpen(false);
        window.addEventListener('close-all-overlays', handleClose);
        return () => window.removeEventListener('close-all-overlays', handleClose);
    }, []);

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(today.getDate());
    const [anniversary, setAnniversary] = useState(null);
    const [showMilestones, setShowMilestones] = useState(true);
    const [showHolidays, setShowHolidays] = useState(true);
    
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const eventsRef = ref(rtdb, "events");
        const unsubscribe = onValue(eventsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                setEvents(list);
            } else {
                setEvents([]);
            }
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
        { id: 'date', label: 'Date Night', icon: Heart, color: 'var(--ev-date-bg)', text: 'var(--ev-date-text)' },
        { id: 'home', label: 'Home', icon: Utensils, color: 'var(--ev-home-bg)', text: 'var(--ev-home-text)' },
        { id: 'travel', label: 'Travel', icon: Plane, color: 'var(--ev-travel-bg)', text: 'var(--ev-travel-text)' },
        { id: 'other', label: 'Other', icon: Sparkles, color: 'var(--ev-other-bg)', text: 'var(--ev-other-text)' },
        { id: 'milestone', label: 'Milestone', icon: CalendarHeart, color: 'var(--ev-milestone-bg)', text: 'var(--ev-milestone-text)' },
        { id: 'holiday', label: 'Holiday', icon: Gift, color: 'var(--ev-holiday-bg)', text: 'var(--ev-holiday-text)' },
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
            const eventData = {
                ...newEvent,
                day: selectedDay,
                month,
                year,
                createdAt: Date.now()
            };

            // Using RTDB instead of Firestore for better reliability in this environment
            await push(ref(rtdb, "events"), eventData);

            // Award 3 Points
            const pointsUpdate = {};
            pointsUpdate[`settings/points/${currentUser.id}`] = increment(3);
            await update(ref(rtdb), pointsUpdate);

            setIsModalOpen(false);

            // Trigger Make.com Webhook for Push Notifications
            const partnerId = currentUser?.id === 'hunter' ? 'nate' : 'hunter';
            const partnerName = currentUser?.id === 'hunter' ? 'Nate' : 'Hunter';
            
            // Fetch the recipient's FCM token from RTDB for Make.com to use
            const tokenSnap = await get(ref(rtdb, `users/${partnerId}/fcmToken`));
            const recipientFcmToken = tokenSnap.val();

            // Ensure the webhook receives the request
            await fetch('https://hook.us1.make.com/gv8mwbk06nzc82nceyounxd2gw37g1we', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderUid: currentUser?.id,
                    senderName: currentUser?.name,
                    recipientUid: partnerId,
                    recipientName: partnerName,
                    recipientFcmToken: recipientFcmToken,
                    title: newEvent.title,
                    type: newEvent.type,
                    day: selectedDay,
                    month: month + 1,
                    year: year,
                    timestamp: Date.now(),
                    eventType: 'calendar_event_added'
                })
            }).catch(err => console.error("Webhook notification error:", err));

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
                    <button className="p-2.5 bg-[var(--surface-muted)] rounded-full text-[var(--text-secondary)]">
                        <${Share2} size=${18} />
                    </button>
                    <button 
                        onClick=${() => setIsModalOpen(true)}
                        style=${{ backgroundColor: 'var(--action-bg)', color: 'var(--action-text)' }}
                        className="p-2.5 rounded-full"
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
                        showMilestones ? 'bg-[var(--modal-toggle-active-bg)] text-[var(--modal-toggle-active-text)] border-transparent' : 'bg-[var(--surface-muted)] text-[var(--text-muted)] border-white/5'
                    }`}
                >
                    <${CalendarHeart} size=${14} /> Milestones
                </button>
                <button 
                    onClick=${() => setShowHolidays(!showHolidays)}
                    className=${`flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all border ${
                        showHolidays ? 'bg-[var(--modal-toggle-active-bg)] text-[var(--modal-toggle-active-text)] border-transparent' : 'bg-[var(--surface-muted)] text-[var(--text-muted)] border-white/5'
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
                        const hasRegularEvent = !item.dimmed && monthEvents.some(e => e.day === item.day && !e.virtual);
                        const hasVirtualOnly = !item.dimmed && !hasRegularEvent && monthEvents.some(e => e.day === item.day && e.virtual);
                        const hasEvent = hasRegularEvent || hasVirtualOnly;
                        
                        return html`
                            <div 
                                key=${i} 
                                onClick=${() => !item.dimmed && setSelectedDay(item.day)}
                                className="flex flex-col items-center relative py-1 cursor-pointer"
                            >
                                <div 
                                    style=${!item.dimmed && hasRegularEvent && !isSelected && !isToday ? { 
                                        backgroundColor: 'oklch(73.7% 0.021 106.9)', 
                                        color: 'oklch(15.3% 0.006 107.1)',
                                        fontWeight: '700'
                                    } : {}}
                                    className=${`w-10 h-10 flex items-center justify-center rounded-2xl text-base transition-all duration-300 relative ${
                                        item.dimmed ? 'opacity-10' : 
                                        isSelected ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-bold scale-105' : 
                                        isToday ? 'bg-[var(--text-primary)] text-[var(--bg-color)]' : 
                                        'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    } ${
                                        !item.dimmed && hasVirtualOnly ? 'border-2 border-[var(--dot-inactive)] text-[var(--text-primary)]' : ''
                                    }`}
                                >
                                    ${item.day}
                                    
                                    ${hasEvent && html`
                                        <div 
                                            style=${hasRegularEvent && !isSelected ? { backgroundColor: 'oklch(15.3% 0.006 107.1)' } : {}}
                                            className=${`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-[var(--bg-color)]' : (hasRegularEvent ? '' : 'bg-[var(--dot-inactive)]')}`} 
                                        />
                                    `}
                                    
                                    ${isToday && html`
                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--calendar-today-border)] z-10" />
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
                        <div key=${i} className="bg-[var(--card-bg)] p-4 rounded-[1.5rem] flex items-center gap-4 border border-[var(--card-border)]">
                            <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
                                style=${{ backgroundColor: cat.color }}
                            >
                                <${IconComp} size=${18} style=${{ color: cat.text, position: 'relative', zIndex: 1 }} />
                                ${event.recurrence && event.recurrence !== 'none' && html`
                                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                        <${RefreshCw} size=${8} className="text-zinc-600" />
                                    </div>
                                `}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[var(--text-primary)] font-medium text-sm">${event.title}</h4>
                                    ${event.virtual && html`<span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style=${{ background: cat.color + '22', color: cat.text }}>Milestone</span>`}
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
                                <div>
                                    <h2 className="text-2xl font-bold text-[var(--modal-header-text)]">New Event</h2>
                                    <p className="text-[var(--modal-label-text)] text-sm">For ${monthName} ${selectedDay}</p>
                                </div>
                                <button 
                                    onClick=${() => setIsModalOpen(false)}
                                    className="p-2 bg-[var(--surface-muted)] rounded-full text-[var(--icon-muted)]"
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
                                        className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-white/10"
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
                                                        ? 'bg-[var(--modal-toggle-active-bg)] text-[var(--modal-toggle-active-text)] font-semibold border-transparent' 
                                                        : 'bg-[var(--input-bg)] text-[var(--text-secondary)] border-white/5'
                                                    }`}
                                                >
                                                    <div 
                                                        style=${{ backgroundColor: newEvent.type === cat.id ? 'var(--text-primary)' : cat.color }}
                                                        className="p-1.5 rounded-lg"
                                                    >
                                                        <${Icon} size=${14} style=${{ color: newEvent.type === cat.id ? 'var(--bg-color)' : cat.text }} />
                                                    </div>
                                                    <span className="text-xs font-medium">${cat.label}</span>
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
                                                    ? 'bg-[var(--modal-toggle-active-bg)] text-[var(--modal-toggle-active-text)] border-transparent' 
                                                    : 'bg-[var(--input-bg)] text-[var(--text-secondary)] border-white/5'
                                                }`}
                                            >
                                                ${opt.label}
                                            </button>
                                        `)}
                                    </div>
                                </div>

                                <button 
                                    onClick=${handleAddEvent}
                                    style=${{ background: 'var(--modal-button-bg)', color: 'var(--modal-button-text)' }}
                                    className="w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform mt-4"
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