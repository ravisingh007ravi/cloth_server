export const calculateLockDuration = (lockCount) => {
    const durations = [60000, 300000, 600000, 1800000, 3600000, 7200000, 14400000, 28800000, 86400000];
    return durations[Math.min(lockCount, durations.length - 1)];
};

export const getLockMessage = (lockUntil) => {
    if (!lockUntil) return null;
    const remaining = Math.ceil((lockUntil - Date.now()) / 60000);
    if (remaining <= 0) return null;
    return remaining < 60
        ?
        `Account locked for ${remaining} minute${remaining > 1 ? 's' : ''}` :
        `Account locked for ${Math.floor(remaining / 60)} hour${Math.floor(remaining / 60) > 1 ? 's' : ''}
       ${remaining % 60 > 0 ? `and ${remaining % 60} minute${remaining % 60 > 1 ? 's' : ''}` : ''}`;
};