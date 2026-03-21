/**
 * JSON-LD Structured Data Component
 * Renders JSON-LD schema markup for search engine optimization
 */

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Multiple JSON-LD schemas
 */
interface MultiJsonLdProps {
  data: Record<string, unknown>[];
}

export function MultiJsonLd({ data }: MultiJsonLdProps) {
  return (
    <>
      {data.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
