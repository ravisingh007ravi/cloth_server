// utils/otpLock.js
export const calculateLockDuration = (lockCount) => {
    // Lock durations in milliseconds: 1m, 5m, 10m, 30m, 1h, 2h, 4h, 8h, 24h
    const durations = [
        60000,      // 1 minute
        300000,     // 5 minutes
        600000,     // 10 minutes
        1800000,    // 30 minutes
        3600000,    // 1 hour
        7200000,    // 2 hours
        14400000,   // 4 hours
        28800000,   // 8 hours
        86400000    // 24 hours
    ];
    
    const index = Math.min(lockCount, durations.length - 1);
    return durations[index];
};

export const getLockMessage = (lockUntil) => {
    if (!lockUntil) return null;
    const remaining = Math.ceil((lockUntil - Date.now()) / 60000);
    if (remaining <= 0) return null;
    
    if (remaining < 60) {
        return `Account locked for ${remaining} minute${remaining > 1 ? 's' : ''}`;
    } else {
        const hours = Math.floor(remaining / 60);
        const minutes = remaining % 60;
        return `Account locked for ${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? `and ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
    }
};