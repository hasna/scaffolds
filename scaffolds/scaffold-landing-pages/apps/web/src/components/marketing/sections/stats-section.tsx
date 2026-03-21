interface Stat {
  value: string;
  label: string;
  description?: string;
}

interface StatsSectionProps {
  title?: string;
  subtitle?: string;
  stats: Stat[];
}

export function StatsSection({ title, subtitle, stats }: StatsSectionProps) {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        {(title || subtitle) && (
          <div className="mx-auto max-w-2xl text-center mb-12">
            {title && (
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <p className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-lg font-semibold">{stat.label}</p>
              {stat.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
