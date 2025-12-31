import React, { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"
export type Palette = "default" | "green" | "violet" | "orange"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultPalette?: Palette
  storageKey?: string
  paletteStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  palette: Palette
  setPalette: (palette: Palette) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  palette: "default",
  setPalette: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultPalette = "default",
  storageKey = "vite-ui-theme",
  paletteStorageKey = "vite-ui-palette",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  const [palette, setPalette] = useState<Palette>(
    () => (localStorage.getItem(paletteStorageKey) as Palette) || defaultPalette
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute("data-theme", palette)
  }, [palette])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    palette,
    setPalette: (palette: Palette) => {
      localStorage.setItem(paletteStorageKey, palette)
      setPalette(palette)
    },
  }

  return (
    <ThemeProviderContext.Provider value={value} {...props}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
