import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { 
    Coins, History, Heart, DollarSign, Fuel, Camera, 
    ArrowUpRight, ArrowDownLeft, Shuffle, Gift, Lock, CheckCircle2,
    Ticket, Info, MapPin, XCircle, Smartphone, UserCircle, Phone, Sparkles,
    Zap, Plus, Trash2, Loader2, Check, X
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb, serverTimestamp } from '../lib/firebase.js';
import { ref, set, push, onValue, query, limitToLast, update, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { startOfWeek, isSameWeek } from 'date-fns';
import { haptic } from '../lib/utils.js';

const html = htm.bind(React.createElement);

const Cards = ({ currentUser, onOverlayToggle }) => {
    const [points, setPoints] = useState({ hunter: 0, nate: 0 });
    const [logs, setLogs] = useState([]);
    const [redemptions, setRedemptions] = useState({});
    const [customPrizes, setCustomPrizes] = useState([]);
    const [activeTab, setActiveTab] = useState('shop'); // 'shop' or 'log'
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        onOverlayToggle?.(isCreateModalOpen);
    }, [isCreateModalOpen, onOverlayToggle]);

    useEffect(() => {
        const handleClose = () => setIsCreateModalOpen(false);
        window.addEventListener('close-all-overlays', handleClose);
        return () => window.removeEventListener('close-all-overlays', handleClose);
    }, []);
    const [newCustomPrize, setNewCustomPrize] = useState({ label: '', description: '', cost: 50 });

    const partnerName = currentUser.id === 'hunter' ? 'Nate' : 'Hunter';

    const PRIZES = [
        { id: 'msg', label: 'Heart-warming Message', cost: 25, icon: Heart, description: `${partnerName} owes you a sweet and sincere text message`, color: 'var(--ev-date-bg)', textColor: 'var(--ev-date-text)' },
        { id: '5cash', label: '$5 Received', cost: 100, icon: DollarSign, description: `${partnerName} has to cough up 5 bucks`, color: 'var(--ev-home-bg)', textColor: 'var(--ev-home-text)' },
        { id: 'call', label: 'Call Me', cost: 150, icon: Phone, description: `${partnerName} must give you a 30 minute distraction-free call session.`, color: 'var(--ev-other-bg)', textColor: 'var(--ev-other-text)' },
        { id: 'tour', label: 'Tour Guide', cost: 200, icon: MapPin, description: `Grants complete and total control over selecting the next activity together, whether for gaming, streaming or anything you desire.`, color: 'var(--ev-travel-bg)', textColor: 'var(--ev-travel-text)' },
        { id: 'mastername', label: 'Master Name', cost: 200, icon: UserCircle, description: `${partnerName} must use an incredibly cheesy or embarrassing nickname of your choice for one whole day.`, color: 'var(--ev-other-bg)', textColor: 'var(--ev-other-text)' },
        { id: 'veto', label: 'Veto', cost: 250, icon: XCircle, description: `Grants the ability to swap an activity for your own. This can cancel out the 'Tour Guide' reward.`, color: 'var(--ev-holiday-bg)', textColor: 'var(--ev-holiday-text)' },
        { id: 'facelift', label: 'Face Lift', cost: 400, icon: Smartphone, description: `Requires ${partnerName} to change the background of their device to an image provided by the reward redeemer, and cannot change it for a week.`, color: 'var(--ev-milestone-bg)', textColor: 'var(--ev-milestone-text)' },
        { id: 'gas', label: 'Half Full', cost: 450, icon: Fuel, description: `${partnerName} must pay half of your next gas fill`, color: 'var(--ev-travel-bg)', textColor: 'var(--ev-travel-text)' },
        { id: 'social', label: 'Social Media Manager', cost: 500, icon: Smartphone, description: `Requires ${partnerName} to change a social media bio to whatever you want, and cannot change it for a week.`, color: 'var(--ev-milestone-bg)', textColor: 'var(--ev-milestone-text)' },
        { id: 'tugofwar', label: 'Tug of War', cost: 750, icon: Zap, description: `${partnerName} must masturbate to a provided photo, video, or link.`, color: 'var(--ev-other-bg)', textColor: 'var(--ev-other-text)', nsfw: true },
        { id: 'adult', label: 'Adult Image', cost: 1000, icon: Camera, description: `${partnerName} sends a special unclothed photo for your eyes only`, color: 'var(--ev-other-bg)', textColor: 'var(--ev-other-text)', nsfw: true },
        { id: 'vip', label: 'VIP Lounge', cost: 3000, icon: Heart, description: `The next time both of you get freaky, you get to call the shots. Positions, pace and all.`, color: 'var(--ev-other-bg)', textColor: 'var(--ev-other-text)', nsfw: true },
        { id: 'genie', label: 'Genie', cost: 5000, icon: Sparkles, description: `${partnerName} must grant you three wishes/favors of your choice (within agreed boundaries, whether silly, helpful, or naughty) that can be redeemed at any point over the next year, so make sure to keep count.`, color: 'var(--ev-milestone-bg)', textColor: 'var(--ev-milestone-text)' },
    ];

    useEffect(() => {
        // Sync points
        const pointsRef = ref(rtdb, 'settings/points');
        const unsubPoints = onValue(pointsRef, (snap) => {
            if (snap.val()) setPoints(snap.val());
        });

        // Sync logs (latest 20)
        const logsRef = query(ref(rtdb, 'pointsLog'), limitToLast(20));
        const unsubLogs = onValue(logsRef, (snap) => {
            const data = snap.val();
            if (data) {
                const list = Object.keys(data).map(key => ({ id: key, ...data[key] }))
                    .sort((a, b) => b.timestamp - a.timestamp);
                setLogs(list);
            }
        });

        // Sync redemptions to check weekly limits
        const redemptionsRef = ref(rtdb, `redemptions/${currentUser.id}`);
        const unsubRedemptions = onValue(redemptionsRef, (snap) => {
            if (snap.val()) setRedemptions(snap.val());
        });

        // Sync custom prizes
        const customPrizesRef = ref(rtdb, 'customPrizes');
        const unsubCustomPrizes = onValue(customPrizesRef, (snap) => {
            const data = snap.val();
            if (data) {
                const list = Object.keys(data).map(key => ({ id: key, ...data[key], isCustom: true }));
                setCustomPrizes(list);
            } else {
                setCustomPrizes([]);
            }
        });

        return () => {
            unsubPoints();
            unsubLogs();
            unsubRedemptions();
            unsubCustomPrizes();
        };
    }, [currentUser.id]);

    const handlePointAction = async (type, amount, targetId = currentUser.id) => {
        setIsProcessing(true);
        const newPoints = { ...points };
        let logText = "";
        const partnerId = currentUser.id === 'hunter' ? 'nate' : 'hunter';

        if (type === 'reward') {
            newPoints[targetId] = (newPoints[targetId] || 0) + amount;
            logText = `${currentUser.name} earned ${amount} points!`;
        } else if (type === 'steal') {
            const stealAmount = Math.min(amount, points[partnerId] || 0);
            newPoints[partnerId] = (newPoints[partnerId] || 0) - stealAmount;
            newPoints[currentUser.id] = (newPoints[currentUser.id] || 0) + stealAmount;
            logText = `${currentUser.name} stole ${stealAmount} points from ${partnerId === 'hunter' ? 'Hunter' : 'Nate'}!`;
        } else if (type === 'share') {
            const shareAmount = Math.min(amount, points[currentUser.id] || 0);
            newPoints[currentUser.id] = (newPoints[currentUser.id] || 0) - shareAmount;
            newPoints[partnerId] = (newPoints[partnerId] || 0) + shareAmount;
            logText = `${currentUser.name} shared ${shareAmount} points with ${partnerId === 'hunter' ? 'Hunter' : 'Nate'}!`;
        }

        await set(ref(rtdb, 'settings/points'), newPoints);
        await push(ref(rtdb, 'pointsLog'), {
            type,
            text: logText,
            amount,
            author: currentUser.name,
            timestamp: serverTimestamp()
        });
        setIsProcessing(false);
    };

    const handleCreateCustomPrize = async () => {
        if (!newCustomPrize.label.trim() || !newCustomPrize.description.trim()) return;
        setIsProcessing(true);
        try {
            const prizeData = {
                ...newCustomPrize,
                cost: parseInt(newCustomPrize.cost) || 50,
                color: 'var(--ev-other-bg)',
                textColor: 'var(--ev-other-text)',
                authorId: currentUser.id,
                author: currentUser.name,
                timestamp: serverTimestamp()
            };
            await push(ref(rtdb, 'customPrizes'), prizeData);
            
            await push(ref(rtdb, 'alerts'), {
                authorId: currentUser.id,
                author: currentUser.name,
                text: `Created a new custom reward: ${newCustomPrize.label}`,
                type: 'cards',
                timestamp: serverTimestamp()
            });

            haptic([10, 30]);
            setIsCreateModalOpen(false);
            setNewCustomPrize({ label: '', description: '', cost: 50 });
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRedeem = async (prize) => {
        const userPoints = points[currentUser.id] || 0;
        const lastRedeemed = redemptions[prize.id];
        const isRedeemedThisWeek = lastRedeemed && isSameWeek(new Date(lastRedeemed), new Date());

        if (userPoints < prize.cost || isRedeemedThisWeek) return;

        setIsProcessing(true);
        try {
            const newPoints = { ...points };
            newPoints[currentUser.id] -= prize.cost;

            const updates = {};
            updates[`settings/points`] = newPoints;
            updates[`redemptions/${currentUser.id}/${prize.id}`] = Date.now();
            
            const logRef = push(ref(rtdb, 'pointsLog'));
            updates[`pointsLog/${logRef.key}`] = {
                type: 'redeem',
                text: `${currentUser.name} redeemed "${prize.label}"!`,
                amount: prize.cost,
                author: currentUser.name,
                timestamp: serverTimestamp()
            };

            const alertRef = push(ref(rtdb, 'alerts'));
            updates[`alerts/${alertRef.key}`] = {
                authorId: currentUser.id,
                author: currentUser.name,
                text: `Redeemed a reward: ${prize.label}`,
                type: 'cards',
                timestamp: serverTimestamp()
            };

            haptic([40, 60, 40]);
        await update(ref(rtdb), updates);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteCustomPrize = async (e, prizeId) => {
        e.stopPropagation();
        if (confirm('Remove this custom reward?')) {
            await update(ref(rtdb), { [`customPrizes/${prizeId}`]: null });
        }
    };

    const getPrizeStatus = (prize) => {
        const userPoints = points[currentUser.id] || 0;
        const lastRedeemed = redemptions[prize.id];
        const isRedeemedThisWeek = lastRedeemed && isSameWeek(new Date(lastRedeemed), new Date());
        
        if (isRedeemedThisWeek) return 'week-limit';
        if (userPoints < prize.cost) return 'too-expensive';
        return 'available';
    };

    const RULES = [
        { label: 'Daily Check-in', points: 10, icon: 'ph:calendar-check-duotone' },
        { label: 'Add a Photo', points: 5, icon: 'ph:image-duotone' },
        { label: 'Complete To-do', points: 5, icon: 'ph:check-circle-duotone' },
        { label: 'Answer a Question', points: 3, icon: 'ph:question-duotone' },
        { label: 'Add Journal', points: 3, icon: 'ph:book-open-duotone' },
        { label: 'Add Event', points: 3, icon: 'ph:calendar-plus-duotone' },
        { label: 'Send Message', points: 1, icon: 'ph:chat-teardrop-dots-duotone' },
    ];

    return html`
        <div className="px-6 pt-4 pb-24 text-[var(--text-primary)]">
            <div className="mb-8">
                <h1 className="text-3xl font-light mb-1">Points</h1>
                <p className="text-[var(--text-secondary)] font-light">Earn points by using the app together.</p>
            </div>

            <!-- Points Display -->
            <div className="grid grid-cols-2 gap-3 mb-8">
                <div 
                    style=${{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                    className="p-6 rounded-[1rem] border border-[var(--card-border)] flex flex-col items-center shadow-sm relative overflow-hidden"
                >
                    <${Ticket} size=${120} className="absolute -right-6 -bottom-6 opacity-[0.07] rotate-12" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-2">Hunter</span>
                    <span className="text-4xl font-light tracking-tighter">${points.hunter || 0}</span>
                </div>
                <div 
                    style=${{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                    className="p-6 rounded-[1rem] border border-[var(--card-border)] flex flex-col items-center shadow-sm relative overflow-hidden"
                >
                    <${Ticket} size=${120} className="absolute -right-6 -bottom-6 opacity-[0.07] rotate-12" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-2">Nate</span>
                    <span className="text-4xl font-light tracking-tighter">${points.nate || 0}</span>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div className="flex bg-[var(--input-bg)] p-1.5 rounded-[1.25rem] mb-10">
                <button 
                    onClick=${() => setActiveTab('shop')}
                    className=${`flex-1 py-3.5 rounded-[1rem] text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'shop' ? 'bg-[var(--card-bg-solid)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-60'}`}
                >
                    Shop
                </button>
                <button 
                    onClick=${() => setActiveTab('log')}
                    className=${`flex-1 py-3.5 rounded-[1rem] text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'log' ? 'bg-[var(--card-bg-solid)] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-60'}`}
                >
                    Activity Log
                </button>
            </div>

            <AnimatePresence mode="wait">
                ${activeTab === 'shop' ? html`
                    <${motion.div} 
                        key="shop"
                        initial=${{ opacity: 0, y: 10 }}
                        animate=${{ opacity: 1, y: 0 }}
                        exit=${{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        <!-- Point Rules -->
                        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] p-6 rounded-[1rem] mb-10">
                            <div className="flex items-center gap-2 mb-6">
                                <${Info} size=${14} className="text-[var(--text-secondary)] opacity-40" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">How to Earn</span>
                            </div>
                            <table className="w-full text-left">
                                <tbody className="divide-y divide-black/10 dark:divide-white/10">
                                    ${RULES.map(rule => html`
                                        <tr key=${rule.label}>
                                            <td className="py-3 text-[13px] font-medium text-[var(--text-primary)] opacity-80">${rule.label}</td>
                                            <td className="py-3 text-right text-[11px] font-black tracking-widest text-[var(--text-primary)]">+${rule.points} PTS</td>
                                        </tr>
                                    `)}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-3">
                            ${[...PRIZES, ...customPrizes].sort((a, b) => a.cost - b.cost).map(prize => {
                                const status = getPrizeStatus(prize);
                                const IconComp = prize.icon || Gift;
                                return html`
                                    <button
                                        key=${prize.id}
                                        onClick=${() => status === 'available' && handleRedeem(prize)}
                                        disabled=${status !== 'available' || isProcessing}
                                        style=${{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                                        className=${`w-full text-left rounded-[1rem] flex items-center border overflow-hidden active:scale-[0.98] transition-all group shadow-sm relative px-5 py-4 gap-4 ${status !== 'available' ? 'opacity-40' : ''}`}
                                    >
                                        <!-- Icon pill -->
                                        <div 
                                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden"
                                            style=${{ backgroundColor: prize.color || 'var(--surface-muted)' }}
                                        >
                                            <${IconComp} size=${16} style=${{ color: prize.textColor || 'var(--text-primary)' }} className="relative z-10 opacity-70" />
                                            ${status !== 'available' && html`
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                                                    <${Lock} size=${12} className="text-white" />
                                                </div>
                                            `}
                                        </div>

                                        <!-- Text -->
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)] leading-snug">${prize.label}</div>
                                            <div className="text-[10px] text-[var(--text-secondary)] opacity-70 mt-0.5">${prize.description}</div>
                                        </div>

                                        <!-- Cost -->
                                        <div className="flex flex-col items-end shrink-0 gap-1">
                                            <span className="text-[11px] font-black text-[var(--text-primary)] opacity-50 tracking-widest uppercase">${prize.cost} pts</span>
                                            ${status === 'week-limit' && html`
                                                <span className="text-[8px] font-black text-red-500 uppercase px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full whitespace-nowrap">Weekly Limit</span>
                                            `}
                                            ${prize.isCustom && html`
                                                <button 
                                                    onClick=${(e) => handleDeleteCustomPrize(e, prize.id)}
                                                    className="p-1 text-[var(--icon-muted)] hover:text-red-500 transition-colors mt-1"
                                                >
                                                    <${Trash2} size=${12} />
                                                </button>
                                            `}
                                        </div>
                                    </button>
                                `;
                            })}
                        </div>

                        <button 
                            onClick=${() => setIsCreateModalOpen(true)}
                            className="w-full mt-6 py-4 rounded-[1rem] border-2 border-dashed border-[var(--card-border)] text-[var(--text-secondary)] flex items-center justify-center gap-2 hover:bg-[var(--surface-muted)] transition-all active:scale-[0.98] group"
                        >
                            <${Plus} size=${18} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Create your own reward</span>
                        </button>
                    </${motion.div}>
                ` : html`
                    <${motion.div} 
                        key="log"
                        initial=${{ opacity: 0, x: 10 }}
                        animate=${{ opacity: 1, x: 0 }}
                        exit=${{ opacity: 0, x: -10 }}
                        className="space-y-2"
                    >
                        ${logs.length === 0 ? html`
                            <div className="py-20 text-center text-[var(--text-secondary)] italic text-sm">No activity yet.</div>
                        ` : logs.map(log => {
                            const typeConfig = {
                                reward: { icon: Gift, accent: 'var(--ev-home-text)', bg: 'var(--ev-home-bg)' },
                                steal: { icon: ArrowDownLeft, accent: 'var(--ev-holiday-text)', bg: 'var(--ev-holiday-bg)' },
                                share: { icon: Shuffle, accent: 'var(--ev-travel-text)', bg: 'var(--ev-travel-bg)' },
                                redeem: { icon: CheckCircle2, accent: 'var(--radio-active)', bg: 'rgba(16,185,129,0.1)' }
                            };
                            const cfg = typeConfig[log.type] || { icon: History, accent: 'var(--text-secondary)', bg: 'var(--surface-muted)' };
                            const LogIcon = cfg.icon;
                            return html`
                                <div key=${log.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] p-4 rounded-[1rem] flex items-center gap-4">
                                    <div 
                                        className="p-2.5 rounded-xl shrink-0"
                                        style=${{ backgroundColor: cfg.bg, color: cfg.accent }}
                                    >
                                        <${LogIcon} size=${16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">${log.text}</p>
                                        <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest opacity-60">
                                            ${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${log.author}
                                        </span>
                                    </div>
                                </div>
                            `;
                        })}
                    </${motion.div}>
                `}
            </AnimatePresence>

            <!-- Create Custom Reward Modal -->
            <AnimatePresence>
                ${isCreateModalOpen && html`
                    <${motion.div}
                        initial=${{ opacity: 0 }}
                        animate=${{ opacity: 1 }}
                        exit=${{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[5000] flex items-center justify-center p-4"
                        onClick=${() => setIsCreateModalOpen(false)}
                    >
                        <${motion.div}
                            initial=${{ opacity: 0, scale: 0.95, y: 20 }}
                            animate=${{ opacity: 1, scale: 1, y: 0 }}
                            exit=${{ opacity: 0, scale: 0.95, y: 20 }}
                            style=${{ borderRadius: 'var(--modal-radius)', border: '1px solid var(--modal-border)', backgroundColor: 'var(--modal-bg)' }}
                            className="w-full max-w-lg p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar"
                            onClick=${e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-[var(--modal-header-text)]">New Reward</h2>
                                <button onClick=${() => setIsCreateModalOpen(false)} className="p-2 bg-[var(--surface-muted)] rounded-full text-[var(--icon-muted)]"><${X} size=${20} /></button>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--modal-label-text)] block mb-2">Reward Name</label>
                                    <input
                                        autoFocus
                                        value=${newCustomPrize.label}
                                        onChange=${e => setNewCustomPrize({ ...newCustomPrize, label: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-white/10"
                                        placeholder="e.g. Back Massage"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--modal-label-text)] block mb-2">Description</label>
                                    <textarea
                                        value=${newCustomPrize.description}
                                        onChange=${e => setNewCustomPrize({ ...newCustomPrize, description: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] outline-none min-h-[100px] resize-none focus:ring-1 focus:ring-white/10"
                                        placeholder="Explain what the partner gets when they redeem this..."
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--modal-label-text)] block mb-2">Points Cost</label>
                                    <input
                                        type="number"
                                        value=${newCustomPrize.cost}
                                        onChange=${e => setNewCustomPrize({ ...newCustomPrize, cost: e.target.value })}
                                        className="w-full bg-[var(--input-bg)] border border-white/10 rounded-2xl p-4 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-white/10"
                                    />
                                </div>

                                <button 
                                    onClick=${handleCreateCustomPrize}
                                    disabled=${isProcessing || !newCustomPrize.label.trim() || !newCustomPrize.description.trim()}
                                    style=${{ background: 'var(--modal-button-bg)', color: 'var(--modal-button-text)' }}
                                    className="w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                                >
                                    ${isProcessing ? html`<${Loader2} className="animate-spin" size=${20} />` : html`<${Check} size=${20} />`}
                                    Create Reward
                                </button>
                            </div>
                        </${motion.div}>
                    </${motion.div}>
                `}
            </AnimatePresence>
        </div>
    `;
};

export default Cards;