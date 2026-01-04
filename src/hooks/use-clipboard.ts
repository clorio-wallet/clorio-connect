import { useState, useCallback } from "react"

export function useClipboard({ timeout = 2000 } = {}) {
  const [isCopied, setIsCopied] = useState(false)

  const copy = useCallback(
    (value: string) => {
      if (!value) return

      navigator.clipboard.writeText(value).then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), timeout)
      })
    },
    [timeout]
  )

  return { isCopied, copy }
}
