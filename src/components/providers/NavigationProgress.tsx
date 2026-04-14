'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false, trickleSpeed: 120 })

function isModifiedEvent(e: MouseEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
}

function findAnchor(el: EventTarget | null): HTMLAnchorElement | null {
  let cur = el as HTMLElement | null
  while (cur) {
    if (cur instanceof HTMLAnchorElement) return cur
    cur = cur.parentElement
  }
  return null
}

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return
      if (e.button !== 0) return
      if (isModifiedEvent(e)) return

      const a = findAnchor(e.target)
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('#')) return
      if (a.target && a.target !== '_self') return
      if (a.hasAttribute('download')) return
      if (a.getAttribute('rel')?.includes('external')) return

      try {
        const url = new URL(href, window.location.href)
        if (url.origin !== window.location.origin) return
      } catch {
        // If URL parsing fails, ignore.
        return
      }

      NProgress.start()
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  useEffect(() => {
    // Route finished
    NProgress.done()
  }, [pathname, searchParams])

  return null
}

