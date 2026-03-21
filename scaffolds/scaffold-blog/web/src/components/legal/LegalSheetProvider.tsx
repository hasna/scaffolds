import { createContext, useContext, useMemo, useState } from 'react'
import { marked } from 'marked'
import { useSettings } from '@/hooks/useSettings'
import { getLegalDocs, type LegalDocId } from '@/lib/legal'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

marked.setOptions({ gfm: true, breaks: true })

type LegalSheetContextValue = {
  openLegal: (id: LegalDocId) => void
  closeLegal: () => void
}

const LegalSheetContext = createContext<LegalSheetContextValue | null>(null)

export function LegalSheetProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings()
  const siteName = settings.siteName || 'Engine Blog'
  const siteUrl = settings.siteUrl || (typeof window !== 'undefined' ? window.location.origin : '')

  const docs = useMemo(() => getLegalDocs({ siteName, siteUrl }), [siteName, siteUrl])
  const [open, setOpen] = useState(false)
  const [docId, setDocId] = useState<LegalDocId>('privacy')

  const value = useMemo<LegalSheetContextValue>(
    () => ({
      openLegal: (id) => {
        setDocId(id)
        setOpen(true)
      },
      closeLegal: () => setOpen(false),
    }),
    []
  )

  const doc = docs[docId]
  const html = useMemo(() => marked(doc.markdown) as string, [doc.markdown])

  return (
    <LegalSheetContext.Provider value={value}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{doc.title}</SheetTitle>
            <SheetDescription>Last updated: {doc.updatedAt}</SheetDescription>
          </SheetHeader>
          <div
            className="mt-6 prose prose-slate dark:prose-invert max-w-none overflow-y-auto pr-1"
            style={{ maxHeight: 'calc(100dvh - 10rem)' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </SheetContent>
      </Sheet>
    </LegalSheetContext.Provider>
  )
}

export function useLegalSheet() {
  const ctx = useContext(LegalSheetContext)
  if (!ctx) {
    throw new Error('useLegalSheet must be used within LegalSheetProvider')
  }
  return ctx
}

