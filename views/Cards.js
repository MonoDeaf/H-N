import React, { useState, useEffect } from 'react';
import htm from 'htm';
import { 
    Coins, History, Heart, DollarSign, Fuel, Camera, 
    ArrowUpRight, ArrowDownLeft, Shuffle, Gift, Lock, CheckCircle2
} from 'lucide-react';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import { rtdb, serverTimestamp } from '../lib/firebase.js';
import { ref, set, push, onValue, query, limitToLast, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { startOfWeek, isSameWeek } from 'date-fns';

const html = htm.bind(React.createElement);

const Cards = ({ currentUser }) => {
    const [points, setPoints] = useState({ hunter: 0, nate: 0 });
    const [logs, setLogs] = useState([]);
    const [redemptions, setRedemptions] = useState({});
    const [activeTab, setActiveTab] = useState('shop'); // 'shop' or 'log'
    const [isProcessing, setIsProcessing] = useState(false);

    const PRIZES = [
        { id: 'msg', label: 'Heart-warming Message', cost: 25, icon: Heart, description: 'A sincere message from your partner', color: 'bg-pink-500' },
        { id: '5cash', label: '$5 Received', cost: 100, icon: DollarSign, description: 'Cash directly to your pocket', color: 'bg-emerald-500' },
        { id: 'gas', label: 'Half Gas Price', cost: 150, icon: Fuel, description: 'Partner pays half your next fill', color: 'bg-blue-500' },
        { id: '20cash', label: '$20 Received', cost: 300, icon: DollarSign, description: 'A nice bonus from Nate/Hunter', color: 'bg-green-600' },
        { id: 'adult', label: 'Adult Image', cost: 500, icon: Camera, description: 'A special photo for your eyes only', color: 'bg-purple-600', nsfw: true },
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

        return () => {
            unsubPoints();
            unsubLogs();
            unsubRedemptions();
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

            await update(ref(rtdb), updates);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
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

    return html`
        <div className="px-6 pt-4 pb-24 text-[var(--text-primary)]">
            <div className="mb-8">
                <h1 className="text-3xl font-light mb-1">Cards</h1>
                <p className="text-[var(--text-secondary)] font-light">Play, Earn, and Redeem.</p>
            </div>

            <!-- Points Display -->
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-zinc-800 text-white p-5 rounded-[2rem] border border-white/10 flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Hunter</span>
                    <div className="flex items-center gap-2">
                        <${Coins} size=${18} className="text-amber-400" />
                        <span className="text-2xl font-bold">${points.hunter || 0}</span>
                    </div>
                </div>
                <div className="bg-white/70 p-5 rounded-[2rem] border border-black/5 flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Nate</span>
                    <div className="flex items-center gap-2">
                        <${Coins} size=${18} className="text-amber-500" />
                        <span className="text-2xl font-bold">${points.nate || 0}</span>
                    </div>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div className="flex bg-black/5 p-1 rounded-2xl mb-8">
                <button 
                    onClick=${() => setActiveTab('shop')}
                    className=${`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'shop' ? 'bg-white shadow-sm text-black' : 'text-zinc-500'}`}
                >
                    Redeem
                </button>
                <button 
                    onClick=${() => setActiveTab('log')}
                    className=${`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'log' ? 'bg-white shadow-sm text-black' : 'text-zinc-500'}`}
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
                        <!-- Manual Points Management (Mock for the game rewards) -->
                        <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-3xl mb-6">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600 block mb-3 text-center">Manage Points (Testing)</span>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick=${() => handlePointAction('reward', 10)} className="flex flex-col items-center gap-1 p-2 bg-white rounded-xl border border-amber-100 active:scale-95 transition-transform">
                                    <${Gift} size=${16} className="text-amber-500" />
                                    <span className="text-[8px] font-bold">+10 pts</span>
                                </button>
                                <button onClick=${() => handlePointAction('steal', 5)} className="flex flex-col items-center gap-1 p-2 bg-white rounded-xl border border-amber-100 active:scale-95 transition-transform">
                                    <${ArrowDownLeft} size=${16} className="text-amber-500" />
                                    <span className="text-[8px] font-bold">Steal 5</span>
                                </button>
                                <button onClick=${() => handlePointAction('share', 5)} className="flex flex-col items-center gap-1 p-2 bg-white rounded-xl border border-amber-100 active:scale-95 transition-transform">
                                    <${Shuffle} size=${16} className="text-amber-500" />
                                    <span className="text-[8px] font-bold">Share 5</span>
                                </button>
                            </div>
                        </div>

                        ${PRIZES.map(prize => {
                            const status = getPrizeStatus(prize);
                            const IconComp = prize.icon;
                            return html`
                                <button
                                    key=${prize.id}
                                    onClick=${() => status === 'available' && handleRedeem(prize)}
                                    disabled=${status !== 'available' || isProcessing}
                                    className=${`w-full text-left bg-white rounded-[1.8rem] flex items-stretch border border-zinc-300 overflow-hidden active:scale-[0.98] transition-all group ${status !== 'available' ? 'opacity-60 grayscale' : ''}`}
                                >
                                    <div className="flex-1 p-6 flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">${prize.cost} Points</span>
                                            ${status === 'week-limit' && html`
                                                <span className="text-[8px] font-bold text-red-500 uppercase px-1.5 py-0.5 bg-red-50 rounded">Weekly Limit</span>
                                            `}
                                        </div>
                                        <div className="text-xl font-bold tracking-tight mb-1 text-[var(--text-primary)]">${prize.label}</div>
                                        <div className="text-[11px] text-zinc-500 leading-relaxed font-medium">${prize.description}</div>
                                    </div>
                                    <div className=${`w-20 flex items-center justify-center border-l border-black/5 relative overflow-hidden ${prize.color}`}>
                                        <${IconComp} size=${28} className="text-white relative z-10" />
                                        ${status === 'available' ? html`
                                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        ` : html`
                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                <${Lock} size=${16} className="text-white/50" />
                                            </div>
                                        `}
                                    </div>
                                </button>
                            `;
                        })}
                    </${motion.div}>
                ` : html`
                    <${motion.div} 
                        key="log"
                        initial=${{ opacity: 0, x: 10 }}
                        animate=${{ opacity: 1, x: 0 }}
                        exit=${{ opacity: 0, x: -10 }}
                        className="space-y-3"
                    >
                        ${logs.length === 0 ? html`
                            <div className="py-20 text-center text-zinc-400 italic text-sm">No activity yet.</div>
                        ` : logs.map(log => {
                            const icons = {
                                reward: Gift,
                                steal: ArrowDownLeft,
                                share: Shuffle,
                                redeem: CheckCircle2
                            };
                            const LogIcon = icons[log.type] || History;
                            return html`
                                <div key=${log.id} className="bg-white/50 p-4 rounded-2xl border border-black/5 flex items-center gap-4">
                                    <div className=${`p-2.5 rounded-xl ${
                                        log.type === 'redeem' ? 'bg-emerald-100 text-emerald-600' : 
                                        log.type === 'steal' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                                    }`}>
                                        <${LogIcon} size=${16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-800 leading-snug">${log.text}</p>
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">
                                            ${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${log.author}
                                        </span>
                                    </div>
                                </div>
                            `;
                        })}
                    </${motion.div}>
                `}
            </AnimatePresence>
        </div>
    `;
};

export default Cards;