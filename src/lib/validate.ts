const MIN_USERNAME = 3;
const MAX_USERNAME = 32;
const MAX_EMAIL = 254;
const MIN_PASSWORD = 12;
const MAX_PASSWORD = 64;

function isAllowedUsernameChar(c: string): boolean {
  return /[a-z0-9-]/.test(c);
}

export function validateUsername(username: string): string | null {
  if (username.length < MIN_USERNAME || username.length > MAX_USERNAME) {
    return `От ${MIN_USERNAME} до ${MAX_USERNAME} символов`;
  }
  for (const c of username) {
    if (!isAllowedUsernameChar(c)) {
      return 'Только буквы a–z, цифры и дефис';
    }
  }
  if (username[0] === '-' || username[username.length - 1] === '-') {
    return 'Не может начинаться или заканчиваться дефисом';
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return 'Обязательное поле';
  if (email.length > MAX_EMAIL) return 'Слишком длинный email';

  const at = email.lastIndexOf('@');
  if (at === -1 || at === 0 || at === email.length - 1) {
    return 'Некорректный email';
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (local.length > 64) return 'Некорректный email';
  if (!domain.includes('.')) return 'Некорректный email';
  if (domain.startsWith('.') || domain.endsWith('.')) return 'Некорректный email';

  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Минимум ${MIN_PASSWORD} символов`;
  if (password.length > MAX_PASSWORD) return `Максимум ${MAX_PASSWORD} символов`;

  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;

  for (const c of password) {
    const code = c.charCodeAt(0);
    if (code < 0x20 || code > 0x7e) return 'Содержит недопустимые символы';
    if (c >= 'a' && c <= 'z') hasLower = true;
    if (c >= 'A' && c <= 'Z') hasUpper = true;
    if (c >= '0' && c <= '9') hasDigit = true;
  }

  if (!hasLower) return 'Должен содержать строчную букву';
  if (!hasUpper) return 'Должен содержать заглавную букву';
  if (!hasDigit) return 'Должен содержать цифру';

  return null;
}
