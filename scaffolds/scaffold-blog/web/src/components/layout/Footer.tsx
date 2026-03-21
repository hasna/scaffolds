import { Link } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import { useApi } from '@/hooks/useApi';
import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useLegalSheet } from '@/components/legal/LegalSheetProvider';
import { APP_VERSION } from '@/lib/version';
import { Search } from 'lucide-react';

interface NavPage {
  id: string;
  title: string;
  slug: string;
  navOrder: number;
}

interface CategoryLink {
  id: string | number;
  name: string;
  slug: string;
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { settings } = useSettings();
  const { openLegal } = useLegalSheet();
  const siteName = settings.siteName || 'Engine Blog';
  const siteDescription = settings.siteDescription || 'A modern blog engine built with React, TypeScript, and Tailwind CSS.';
  const { data: navPages } = useApi<NavPage[]>('/pages/nav');
  const { data: categories } = useApi<CategoryLink[]>('/categories');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [didSubmit, setDidSubmit] = useState(false);
  const [wasAlreadySubscribed, setWasAlreadySubscribed] = useState(false);

  const featuredCategorySlugs = (() => {
    const headerCategorySlugs = settings.headerCategorySlugs
    const all = categories ?? []
    if (!Array.isArray(headerCategorySlugs)) return all.slice(0, 3).map((c) => c.slug.toLowerCase())
    const slugs = headerCategorySlugs.map((s) => (s || '').trim().toLowerCase()).filter(Boolean)
    if (slugs.length === 0) return []
    const bySlug = new Map(all.map((c) => [c.slug.toLowerCase(), c]))
    return slugs.map((slug) => bySlug.get(slug)).filter((c): c is CategoryLink => Boolean(c)).slice(0, 3).map((c) => c.slug.toLowerCase())
  })()

  const footerCategories = (() => {
    const featured = new Set(featuredCategorySlugs)
    return (categories ?? [])
      .filter((c) => !featured.has(c.slug.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
  })()

  const footerOnlySlugs = new Set(['about', 'about-us', 'contact', 'contact-us']);
  const footerPagesUnsorted =
    navPages?.filter((page) => {
      const slug = page.slug.toLowerCase();
      const title = page.title.toLowerCase();
      const footerOnlyByTitle = title === 'about' || title === 'about us' || title === 'contact';
      return footerOnlySlugs.has(slug) || footerOnlyByTitle;
    }) ?? [];

  const footerPages = [...footerPagesUnsorted].sort((a, b) => {
    const rank = (page: NavPage) => {
      const slug = page.slug.toLowerCase();
      const title = page.title.toLowerCase();
      if (slug.startsWith('about') || title.startsWith('about')) return 0;
      if (slug.startsWith('contact') || title.startsWith('contact')) return 1;
      return 2;
    };
    return rank(a) - rank(b) || (a.navOrder ?? 0) - (b.navOrder ?? 0) || a.title.localeCompare(b.title);
  });

  async function onSubscribe(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setDidSubmit(false);
    setWasAlreadySubscribed(false);

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedEmail) return;

    setIsSubmitting(true);
    try {
      const response = await api.post<{ success: boolean; data?: { alreadySubscribed?: boolean } }>('/newsletter/subscribe', {
        email: trimmedEmail,
        phone: trimmedPhone.length > 0 ? trimmedPhone : undefined,
      });
      setDidSubmit(true);
      setWasAlreadySubscribed(Boolean(response?.data?.alreadySubscribed));
      setEmail('');
      setPhone('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to subscribe';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <footer className="mt-auto border-t border-[hsl(var(--footer-fg)/0.12)] bg-[hsl(var(--footer-bg))] text-[hsl(var(--footer-fg))]">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
        {/* Main footer grid - Quick Links, Legal, Newsletter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8">
          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-sm text-[hsl(var(--footer-fg)/0.72)] hover:text-[hsl(var(--footer-fg))] transition-colors inline-block py-1"
                >
                  Home
                </Link>
              </li>
              {footerPages.map((page) => (
                <li key={page.id}>
                  <Link
                    to={`/page/${page.slug}`}
                    className="text-sm text-[hsl(var(--footer-fg)/0.72)] hover:text-[hsl(var(--footer-fg))] transition-colors inline-block py-1"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/search"
                  className="text-sm text-[hsl(var(--footer-fg)/0.72)] hover:text-[hsl(var(--footer-fg))] transition-colors inline-flex items-center gap-2 py-1"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Search</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories (non-featured) */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4">Categories</h3>
            <ul className="space-y-2">
              {footerCategories.slice(0, 12).map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/category/${category.slug}`}
                    className="text-sm text-[hsl(var(--footer-fg)/0.72)] hover:text-[hsl(var(--footer-fg))] transition-colors inline-block py-1"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
              {footerCategories.length === 0 && (
                <li className="text-sm text-[hsl(var(--footer-fg)/0.72)] py-1">No categories yet.</li>
              )}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3 sm:mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/legal/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    openLegal('privacy');
                  }}
                  className="text-sm text-[hsl(var(--footer-fg)/0.72)] hover:text-[hsl(var(--footer-fg))] transition-colors inline-block py-1"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/terms"
                  onClick={(e) => {
                    e.preventDefault();
                    openLegal('terms');
                  }}
                  className="text-sm text-[hsl(var(--footer-fg)/0.72)] hover:text-[hsl(var(--footer-fg))] transition-colors inline-block py-1"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/cookies"
                  onClick={(e) => {
                    e.preventDefault();
                    openLegal('cookies');
                  }}
                  className="text-sm text-[hsl(var(--footer-fg)/0.72)] hover:text-[hsl(var(--footer-fg))] transition-colors inline-block py-1"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/disclaimer"
                  onClick={(e) => {
                    e.preventDefault();
                    openLegal('disclaimer');
                  }}
                  className="text-sm text-[hsl(var(--footer-fg)/0.72)] hover:text-[hsl(var(--footer-fg))] transition-colors inline-block py-1"
                >
                  Disclaimer
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/dmca"
                  onClick={(e) => {
                    e.preventDefault();
                    openLegal('dmca');
                  }}
                  className="text-sm text-[hsl(var(--footer-fg)/0.72)] hover:text-[hsl(var(--footer-fg))] transition-colors inline-block py-1"
                >
                  DMCA
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/acceptable-use"
                  onClick={(e) => {
                    e.preventDefault();
                    openLegal('acceptable-use');
                  }}
                  className="text-sm text-[hsl(var(--footer-fg)/0.72)] hover:text-[hsl(var(--footer-fg))] transition-colors inline-block py-1"
                >
                  Acceptable Use
                </Link>
              </li>
              <li>
                <Link
                  to="/legal/accessibility"
                  onClick={(e) => {
                    e.preventDefault();
                    openLegal('accessibility');
                  }}
                  className="text-sm text-[hsl(var(--footer-fg)/0.72)] hover:text-[hsl(var(--footer-fg))] transition-colors inline-block py-1"
                >
                  Accessibility
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter - spans 2 columns on mobile */}
          <div className="sm:col-span-2">
            <h3 className="font-semibold mb-3 sm:mb-4">Newsletter</h3>
            <p className="text-sm text-[hsl(var(--footer-fg)/0.72)] mb-3">
              Subscribe to get the latest updates delivered to your inbox.
            </p>
            <form onSubmit={onSubscribe} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 flex-1"
                />
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Phone (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 flex-1"
                />
                <Button type="submit" disabled={isSubmitting} className="h-11 whitespace-nowrap">
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </div>
              {didSubmit && (
                <p className="text-sm text-[hsl(var(--footer-fg)/0.72)]">
                  {wasAlreadySubscribed ? 'Already subscribed.' : 'Subscribed.'}
                </p>
              )}
              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
            </form>
          </div>
        </div>

        {/* Site description - full width */}
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-[hsl(var(--footer-fg)/0.12)]">
          <div className="text-center">
            <h3 className="font-semibold mb-2">
              <Link to="/" className="hover:text-[hsl(var(--footer-fg))] transition-colors">
                {siteName}
              </Link>
            </h3>
            <p className="text-sm text-[hsl(var(--footer-fg)/0.72)] max-w-2xl mx-auto">
              {siteDescription}
            </p>
          </div>
        </div>

        {/* Copyright and version */}
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-[hsl(var(--footer-fg)/0.12)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-[hsl(var(--footer-fg)/0.72)] pb-safe">
          <p>&copy; {currentYear} {siteName}. All rights reserved.</p>
          <p className="opacity-50">{APP_VERSION}</p>
        </div>
      </div>
    </footer>
  );
}
