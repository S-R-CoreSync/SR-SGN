import { getApiMessage } from './api-messages';

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createFieldRules(locale: string = 'ar') {
  const t = (key: string) => getApiMessage(locale, key);
  const fallback = (key: string, fallbackMessage: string) => {
    const value = t(key);
    return value === key ? fallbackMessage : value;
  };

  return {
    name: {
      required: t('validation.nameRequired'),
      minLength: { value: 2, message: fallback('validation.nameMinLength', 'Name must be at least 2 characters') },
    },
    email: {
      required: t('validation.emailRequired'),
      pattern: { value: emailPattern, message: fallback('validation.emailInvalid', 'Invalid email') },
    },
    password: {
      required: t('validation.passwordRequired'),
      minLength: { value: 6, message: fallback('validation.passwordMinLength', 'Password must be at least 6 characters') },
    },
    subject: {
      required: t('validation.subjectRequired'),
      minLength: { value: 2, message: fallback('validation.subjectMinLength', 'Subject must be at least 2 characters') },
    },
    message: {
      required: t('validation.messageRequired'),
      minLength: { value: 10, message: fallback('validation.messageMinLength', 'Message must be at least 10 characters') },
    },
  };
}

export const fieldRules = createFieldRules('ar');
