export function getMonthDays(year, month) {
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    const days= [];
    for (let i =0; i < firstDay; i++) { days.push(null); }
    for (let d = 1; d <= lastDate; d++) { days.push(d); }

    while (days.length < 42) {days.push(null);}

    return days;
}