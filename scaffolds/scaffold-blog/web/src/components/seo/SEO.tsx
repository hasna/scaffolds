import { Helmet } from 'react-helmet-async';
import { useSettings } from '@/hooks/useSettings';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
  noindex?: boolean;
  children?: React.ReactNode;
}

export function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  section,
  tags,
  noindex = false,
  children,
}: SEOProps) {
  const { settings } = useSettings();

  const siteName = settings.siteName || 'Engine Blog';
  const siteDescription = settings.siteDescription || 'A modern blog powered by AI';
  const siteUrl = settings.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const defaultImage = settings.logoUrl || settings.faviconUrl || `${siteUrl}/favicon.svg`;

  const pageTitle = title ? `${title} | ${siteName}` : siteName;
  const pageDescription = description || siteDescription;
  const pageImage = image || defaultImage;
  const pageUrl = url || (typeof window !== 'undefined' ? window.location.href : siteUrl);
  const canonicalUrl = pageUrl.split('?')[0]; // Remove query params for canonical

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Robots */}
        {noindex ? (
          <meta name="robots" content="noindex, nofollow" />
        ) : (
          <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        )}

        {/* Open Graph / Facebook */}
        <meta property="og:type" content={type} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={pageImage} />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:locale" content="en_US" />

        {/* Article specific OG tags */}
        {type === 'article' && publishedTime && (
          <meta property="article:published_time" content={publishedTime} />
        )}
        {type === 'article' && modifiedTime && (
          <meta property="article:modified_time" content={modifiedTime} />
        )}
        {type === 'article' && author && (
          <meta property="article:author" content={author} />
        )}
        {type === 'article' && section && (
          <meta property="article:section" content={section} />
        )}
        {type === 'article' && tags?.map((tag, i) => (
          <meta key={i} property="article:tag" content={tag} />
        ))}

        {/* Twitter */}
        <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={pageImage} />

        {/* Additional SEO tags */}
        <meta name="author" content={author || siteName} />
        <meta name="generator" content="Engine Blog" />
      </Helmet>
      {/* JSON-LD schemas rendered outside Helmet */}
      {children}
    </>
  );
}

// JSON-LD Schema Components
interface OrganizationSchemaProps {
  name: string;
  url: string;
  logo?: string;
  description?: string;
}

export function OrganizationSchema({ name, url, logo, description }: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}/#organization`,
    name,
    url,
    ...(logo && { logo: { '@type': 'ImageObject', url: logo } }),
    ...(description && { description }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

interface WebSiteSchemaProps {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string;
}

export function WebSiteSchema({ name, url, description, searchUrl }: WebSiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}/#website`,
    name,
    url,
    ...(description && { description }),
    publisher: { '@id': `${url}/#organization` },
    ...(searchUrl && {
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${searchUrl}?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

interface ArticleSchemaProps {
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  publisherName: string;
  publisherLogo?: string;
  url: string;
  wordCount?: number;
  articleSection?: string;
  keywords?: string[];
}

export function ArticleSchema({
  headline,
  description,
  image,
  datePublished,
  dateModified,
  authorName,
  publisherName,
  publisherLogo,
  url,
  wordCount,
  articleSection,
  keywords,
}: ArticleSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}/#article`,
    headline,
    description,
    ...(image && { image: { '@type': 'ImageObject', url: image } }),
    datePublished,
    ...(dateModified && { dateModified }),
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      ...(publisherLogo && { logo: { '@type': 'ImageObject', url: publisherLogo } }),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(wordCount && { wordCount }),
    ...(articleSection && { articleSection }),
    ...(keywords?.length && { keywords: keywords.join(', ') }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

interface BlogPostingSchemaProps {
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  publisherName: string;
  publisherLogo?: string;
  url: string;
  wordCount?: number;
  articleSection?: string;
  keywords?: string[];
}

export function BlogPostingSchema({
  headline,
  description,
  image,
  datePublished,
  dateModified,
  authorName,
  publisherName,
  publisherLogo,
  url,
  wordCount,
  articleSection,
  keywords,
}: BlogPostingSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}/#blogposting`,
    headline,
    description,
    ...(image && {
      image: {
        '@type': 'ImageObject',
        url: image,
        width: 1200,
        height: 630,
      }
    }),
    datePublished,
    ...(dateModified && { dateModified }),
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${new URL(url).origin}/#organization`,
      name: publisherName,
      ...(publisherLogo && {
        logo: {
          '@type': 'ImageObject',
          url: publisherLogo,
          width: 600,
          height: 60,
        }
      }),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(wordCount && { wordCount }),
    ...(articleSection && { articleSection }),
    ...(keywords?.length && { keywords: keywords.join(', ') }),
    isAccessibleForFree: true,
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

interface CollectionPageSchemaProps {
  name: string;
  description: string;
  url: string;
}

export function CollectionPageSchema({ name, description, url }: CollectionPageSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${url}/#collectionpage`,
    name,
    description,
    url,
    isPartOf: { '@id': `${new URL(url).origin}/#website` },
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
