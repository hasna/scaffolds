import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

type LinkPreviewState = {
  open: boolean
  url: string | null
  title: string | null
}

type LinkPreviewApi = {
  openLink: (url: string, title?: string | null) => void
  close: () => void
}

const LinkPreviewContext = createContext<LinkPreviewApi | null>(null)

export function LinkPreviewSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LinkPreviewState>({ open: false, url: null, title: null })

  const api = useMemo<LinkPreviewApi>(() => ({
    openLink: (url, title) => setState({ open: true, url, title: title || null }),
    close: () => setState({ open: false, url: null, title: null }),
  }), [])

  return (
    <LinkPreviewContext.Provider value={api}>
      {children}
      <Sheet open={state.open} onOpenChange={(open) => (open ? null : api.close())}>
        <SheetContent
          side="right"
          className="w-full sm:w-[30vw] sm:max-w-[30vw] p-0"
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="line-clamp-2">
                  {state.title || 'Preview'}
                </SheetTitle>
                {state.url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-0"
                    onClick={() => window.open(state.url!, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                )}
              </div>
              {state.url && (
                <div className="mt-1 text-xs text-muted-foreground truncate">{state.url}</div>
              )}
            </SheetHeader>

            <div className="flex-1 bg-background">
              {state.url ? (
                <iframe
                  title={state.title || 'Link preview'}
                  src={state.url}
                  className="h-full w-full"
                  referrerPolicy="no-referrer"
                  sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                />
              ) : (
                <div className="p-6 text-sm text-muted-foreground">No URL selected.</div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </LinkPreviewContext.Provider>
  )
}

export function useLinkPreviewSheet() {
  const ctx = useContext(LinkPreviewContext)
  if (!ctx) throw new Error('useLinkPreviewSheet must be used within LinkPreviewSheetProvider')
  return ctx
}

