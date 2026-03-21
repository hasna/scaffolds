import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { api } from '@/lib/api';

interface SiteSettings {
  siteName?: string;
  siteDescription?: string;
  siteUrl?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
  headerBgColor?: string | null;
  headerTextColor?: string | null;
  footerBgColor?: string | null;
  footerTextColor?: string | null;
  headerCategorySlugs?: string[] | null;
  allowComments?: boolean;
  moderateComments?: boolean;
}

interface SettingsContextType {
  settings: SiteSettings;
  isLoading: boolean;
  error: Error | null;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {},
  isLoading: true,
  error: null,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await api.get<{ success: boolean; data: SiteSettings }>('/settings/public');
        if (response.data) {
          setSettings(response.data);
          // Apply theme settings
          applyThemeSettings(response.data);
          applyIconSettings(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch settings'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, error }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

function applyThemeSettings(settings: SiteSettings) {
  const root = document.documentElement;

  if (settings.primaryColor) {
    root.style.setProperty('--primary', settings.primaryColor);
    root.style.setProperty('--ring', settings.primaryColor);
  } else {
    root.style.removeProperty('--primary')
    root.style.removeProperty('--ring')
  }

  if (settings.accentColor) {
    root.style.setProperty('--accent', settings.accentColor);
  } else {
    root.style.removeProperty('--accent')
  }

  if (settings.headingFont) {
    root.style.setProperty('--font-heading', settings.headingFont);
  } else {
    root.style.removeProperty('--font-heading')
  }

  if (settings.bodyFont) {
    root.style.setProperty('--font-body', settings.bodyFont);
  } else {
    root.style.removeProperty('--font-body')
  }

  const headerBg = typeof settings.headerBgColor === 'string' ? settings.headerBgColor.trim() : ''
  const headerFg = typeof settings.headerTextColor === 'string' ? settings.headerTextColor.trim() : ''
  const footerBg = typeof settings.footerBgColor === 'string' ? settings.footerBgColor.trim() : ''
  const footerFg = typeof settings.footerTextColor === 'string' ? settings.footerTextColor.trim() : ''

  if (headerBg) root.style.setProperty('--header-bg', headerBg)
  else root.style.removeProperty('--header-bg')

  if (headerFg) root.style.setProperty('--header-fg', headerFg)
  else root.style.removeProperty('--header-fg')

  if (footerBg) root.style.setProperty('--footer-bg', footerBg)
  else root.style.removeProperty('--footer-bg')

  if (footerFg) root.style.setProperty('--footer-fg', footerFg)
  else root.style.removeProperty('--footer-fg')
}

function applyIconSettings(settings: SiteSettings) {
  const href = settings.faviconUrl || settings.logoUrl
  if (!href) return

  upsertHeadLink('icon', href)
  upsertHeadLink('shortcut icon', href)
  upsertHeadLink('apple-touch-icon', href)
}

function upsertHeadLink(rel: string, href: string) {
  const existing = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  const link = existing || document.createElement('link')
  link.rel = rel
  link.href = href
  if (!existing) document.head.appendChild(link)
}
