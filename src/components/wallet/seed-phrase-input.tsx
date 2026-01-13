import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SeedPhraseInputProps {
  length?: 12 | 24
  onChange: (mnemonic: string[]) => void
  className?: string
  disabled?: boolean
}

export function SeedPhraseInput({
  length = 12,
  onChange,
  className,
  disabled = false,
}: SeedPhraseInputProps) {
  const [words, setWords] = React.useState<string[]>(Array(length).fill(""))
  const [showWords, setShowWords] = React.useState(true)
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([])

  const handlePaste = (e: React.ClipboardEvent, index: number) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").trim()
    const pastedWords = pastedData.split(/\s+/).slice(0, length - index)

    if (pastedWords.length > 0) {
      const newWords = [...words]
      pastedWords.forEach((word, i) => {
        if (index + i < length) {
          newWords[index + i] = word
        }
      })
      setWords(newWords)
      onChange(newWords)
      
      // Focus the next empty input or the last filled one
      const nextIndex = Math.min(index + pastedWords.length, length - 1)
      inputsRef.current[nextIndex]?.focus()
    }
  }

  const handleChange = (index: number, value: string) => {
    const newWords = [...words]
    newWords[index] = value.trim()
    setWords(newWords)
    onChange(newWords)
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !words[index] && index > 0) {
      e.preventDefault()
      inputsRef.current[index - 1]?.focus()
    }
    if (e.key === "Enter" && index < length - 1) {
      e.preventDefault()
      inputsRef.current[index + 1]?.focus()
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-muted-foreground hover:bg-transparent"
          onClick={() => setShowWords(!showWords)}
        >
          {showWords ? (
            <>
              <EyeOff className="mr-1 h-3 w-3" /> Hide
            </>
          ) : (
            <>
              <Eye className="mr-1 h-3 w-3" /> Show
            </>
          )}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length }).map((_, index) => (
          <div key={index} className="relative">
            <span className="absolute left-2 top-3 text-xs text-muted-foreground select-none z-10">
              {index + 1}.
            </span>
            <Input
              ref={(el) => { inputsRef.current[index] = el }}
              type={showWords ? "text" : "password"}
              value={words[index]}
              onChange={(e) => handleChange(index, e.target.value)}
              onPaste={(e) => handlePaste(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="pl-8 text-sm"
              disabled={disabled}
              autoComplete="off"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
