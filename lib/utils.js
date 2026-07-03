export const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
};

export const calculateTimeTogether = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    const now = new Date();
    
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    let daysDiff = now.getDate() - start.getDate();

    if (daysDiff < 0) {
        months -= 1;
        daysDiff += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
        years -= 1;
        months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}m`);
    if (daysDiff > 0) parts.push(`${daysDiff}d`);
    
    return parts.length > 0 ? parts.join(' ') : '0d';
};

export const getDayEvents = ({ d, m, y, events, anniversary, showMilestones, showHolidays }) => {
    const results = [];
    const coupleHolidays = [
        { month: 1, day: 14, title: "Valentine's Day", type: 'holiday' },
        { month: 2, day: 14, title: "Steak & BJ Day", type: 'holiday' },
        { month: 5, day: 1, title: "Pride Month Begins", type: 'holiday' },
        { month: 5, day: 28, title: "Stonewall Anniversary", type: 'holiday' },
        { month: 9, day: 11, title: "National Coming Out Day", type: 'holiday' },
    ];
    
    // Birthdays
    const birthdays = [
        { name: 'Hunter', m: 3, d: 30, y: 2000 },
        { name: 'Nate', m: 0, d: 3, y: 1997 }
    ];
    birthdays.forEach(b => {
        if (m === b.m && d === b.d) {
            const age = y - b.y;
            results.push({ title: `${b.name}'s ${age}${getOrdinal(age)} Birthday!`, type: 'milestone', virtual: true });
        }
    });

    // Regular/Recurring Firestore Events
    events.forEach(e => {
        const startDate = new Date(e.year, e.month, e.day);
        const targetDate = new Date(y, m, d);
        
        if (e.recurrence === 'none') {
            if (e.day === d && e.month === m && e.year === y) results.push(e);
        } else if (targetDate >= startDate) {
            const diffTime = Math.abs(targetDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let matches = false;
            switch(e.recurrence) {
                case 'daily': matches = true; break;
                case 'weekly': matches = diffDays % 7 === 0; break;
                case 'bi-weekly': matches = diffDays % 14 === 0; break;
                case 'monthly': matches = e.day === d; break;
                case 'yearly': matches = e.day === d && e.month === m; break;
            }
            if (matches) results.push(e);
        }
    });

    // Relationship Milestones
    if (showMilestones && anniversary) {
        const [aY, aM, aD] = anniversary.split('-').map(Number);
        const annivMonth = aM - 1;
        if (d === aD && m === annivMonth) {
            const years = y - aY;
            if (years >= 0) results.push({ title: `${years > 0 ? years + ' Year' : 'Our First'} Anniversary!`, type: 'milestone', virtual: true });
        }
        const halfAnnivMonth = (annivMonth + 6) % 12;
        if (d === aD && m === halfAnnivMonth) {
            const totalMonths = (y - aY) * 12 + (m - annivMonth);
            const yearsDecimal = totalMonths / 12;
            if (yearsDecimal > 0) results.push({ title: `${yearsDecimal} Year Anniversary!`, type: 'milestone', virtual: true });
        }
    }

    // Couple Holidays
    if (showHolidays) {
        coupleHolidays.forEach(h => {
            if (h.month === m && h.day === d) results.push({ ...h, virtual: true });
        });
    }

    return results;
};