import { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { RightSidebar } from '@/components/blog/RightSidebar'

interface BlogLayoutProps {
  children: ReactNode
  sidebar?: ReactNode
}

export function BlogLayout({ children, sidebar }: BlogLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">{children}</div>
          <div className="min-w-0">
            <div className="lg:sticky lg:top-24">
              {sidebar ?? <RightSidebar />}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
