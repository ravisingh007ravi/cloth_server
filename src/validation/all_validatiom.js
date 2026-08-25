export const ValidName = (value) => !value ? false : /^[A-Za-z\s\-']{2,50}$/.test(value);
export const ValidEmail = (value) => !value ? false : /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
export const ValidPassword = (value) => !value ? false : /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
export const ValidPhone = (value) => !value ? true : /^[6-9]\d{9}$/.test(value);
export const ValidPincode = (value) => !value ? false : /^[1-9][0-9]{5}$/.test(value);
export const ValidGender = (value) => !value ? false : ['male', 'female', 'other'].includes(value);
