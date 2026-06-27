'use client';
import { useLang } from './LanguageContext';
import { translations, t as translate, type TranslationKey } from './translations';

/** Hook — returns a bound t() that uses current language */
export function useT() {
  const { lang } = useLang();
  return {
    lang,
    t: (section: TranslationKey, key: string, replacements?: Record<string, string>) =>
      translate(section, key, lang, replacements),
  };
}

export { translate as t };
