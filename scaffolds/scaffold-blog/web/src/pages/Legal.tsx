import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLegalSheet } from '@/components/legal/LegalSheetProvider'
import type { LegalDocId } from '@/lib/legal'

function slugToDocId(slug: string): LegalDocId | null {
  const normalized = (slug || '').trim().toLowerCase()
  switch (normalized) {
    case 'terms':
      return 'terms'
    case 'privacy':
      return 'privacy'
    case 'cookies':
      return 'cookies'
    case 'disclaimer':
      return 'disclaimer'
    case 'acceptable-use':
      return 'acceptable-use'
    case 'dmca':
      return 'dmca'
    case 'accessibility':
      return 'accessibility'
    default:
      return null
  }
}

export function Legal() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { openLegal } = useLegalSheet()

  useEffect(() => {
    const id = slugToDocId(slug || '')
    if (!id) {
      navigate('/', { replace: true })
      return
    }

    openLegal(id)

    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/', { replace: true })
  }, [navigate, openLegal, slug])

  return null
}
