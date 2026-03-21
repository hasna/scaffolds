import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSettings } from '@/hooks/useSettings';
import { useApi } from '@/hooks/useApi';
import { Menu, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { settings } = useSettings();
  const location = useLocation()
  const siteName = settings.siteName || 'Engine Blog';
  const { data: navPages } = useApi<NavPage[]>('/pages/nav');
  const { data: categories } = useApi<CategoryLink[]>('/categories');

  const footerOnlySlugs = new Set(['about', 'about-us', 'contact', 'contact-us']);
  const headerPages =
    navPages?.filter((page) => {
      const slug = page.slug.toLowerCase();
      const title = page.title.toLowerCase();
      const footerOnlyByTitle = title === 'about' || title === 'about us' || title === 'contact';
      return !footerOnlySlugs.has(slug) && !footerOnlyByTitle;
    }) ?? [];

  const headerCategorySlugs = settings.headerCategorySlugs;
  const headerCategories = (() => {
    const all = categories ?? [];
    if (!Array.isArray(headerCategorySlugs)) return all;
    const slugs = headerCategorySlugs.map((s) => (s || '').trim().toLowerCase()).filter(Boolean);
    if (slugs.length === 0) return [];
    const bySlug = new Map(all.map((c) => [c.slug.toLowerCase(), c]));
    return slugs.map((slug) => bySlug.get(slug)).filter(Boolean) as CategoryLink[];
  })();

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const hasMobileMenu = headerPages.length > 0;
  const hideSearch = location.pathname === '/search'
  const showSearchButton = !hideSearch && !mobileMenuOpen

  // Show max 3 featured categories
  const displayCategories = headerCategories.slice(0, 3);

  return (
    <header className="sticky top-0 z-50 border-b border-[hsl(var(--header-fg)/0.12)] bg-[hsl(var(--header-bg)/0.95)] text-[hsl(var(--header-fg))] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--header-bg)/0.80)]">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
          {/* Logo - Left */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={siteName}
                className="h-6 w-6 sm:h-7 sm:w-7 object-contain"
                loading="eager"
              />
            ) : null}
            <span className="text-lg sm:text-xl font-bold truncate max-w-[200px]">{siteName}</span>
          </Link>

          {/* Categories - Center/Right (Desktop) */}
          {displayCategories.length > 0 && (
            <nav
              aria-label="Categories"
              className="hidden md:flex items-center gap-4 lg:gap-6 flex-1 justify-end mr-4"
            >
              {displayCategories.map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="text-sm font-medium text-[hsl(var(--header-fg)/0.72)] hover:text-[hsl(var(--header-fg))] transition-colors whitespace-nowrap"
                >
                  {category.name}
                </Link>
              ))}
            </nav>
          )}

          {/* Desktop Navigation - Right */}
          <nav className="hidden md:flex items-center gap-4">
            {headerPages.map((page) => (
              <Link
                key={page.id}
                to={`/page/${page.slug}`}
                className="text-sm font-medium text-[hsl(var(--header-fg)/0.72)] hover:text-[hsl(var(--header-fg))] transition-colors"
              >
                {page.title}
              </Link>
            ))}
            {!hideSearch && (
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Search"
                className="text-[hsl(var(--header-fg)/0.72)] hover:text-[hsl(var(--header-fg))] hover:bg-[hsl(var(--header-fg)/0.08)]"
              >
                <Link to="/search" onClick={closeMobileMenu}>
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Search</span>
                </Link>
              </Button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {showSearchButton && (
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Search"
                className="text-[hsl(var(--header-fg)/0.72)] hover:text-[hsl(var(--header-fg))] hover:bg-[hsl(var(--header-fg)/0.08)]"
              >
                <Link to="/search" onClick={closeMobileMenu}>
                  <Search className="h-5 w-5" />
                  <span className="sr-only">Search</span>
                </Link>
              </Button>
            )}
            {(hasMobileMenu || displayCategories.length > 0) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-[hsl(var(--header-fg)/0.72)] hover:text-[hsl(var(--header-fg))] hover:bg-[hsl(var(--header-fg)/0.08)]"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (hasMobileMenu || displayCategories.length > 0) && (
        <div className="md:hidden border-t border-[hsl(var(--header-fg)/0.12)] bg-[hsl(var(--header-bg))]">
          <nav className="mx-auto w-full max-w-6xl px-4 py-4 space-y-1">
            {/* Categories in mobile menu */}
            {displayCategories.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-[hsl(var(--header-fg)/0.5)] uppercase tracking-wider">
                  Categories
                </div>
                {displayCategories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/category/${category.slug}`}
                    className="block px-3 py-3 text-base font-medium text-[hsl(var(--header-fg)/0.72)] hover:text-[hsl(var(--header-fg))] hover:bg-[hsl(var(--header-fg)/0.08)] rounded-md transition-colors"
                    onClick={closeMobileMenu}
                  >
                    {category.name}
                  </Link>
                ))}
                {headerPages.length > 0 && (
                  <div className="my-2 border-t border-[hsl(var(--header-fg)/0.12)]" />
                )}
              </>
            )}
            {/* Pages in mobile menu */}
            {headerPages.map((page) => (
              <Link
                key={page.id}
                to={`/page/${page.slug}`}
                className="block px-3 py-3 text-base font-medium text-[hsl(var(--header-fg)/0.72)] hover:text-[hsl(var(--header-fg))] hover:bg-[hsl(var(--header-fg)/0.08)] rounded-md transition-colors"
                onClick={closeMobileMenu}
              >
                {page.title}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
