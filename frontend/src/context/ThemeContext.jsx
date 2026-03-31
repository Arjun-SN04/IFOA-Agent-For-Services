import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('ifoa_theme') === 'dark' } catch { return false }
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('ifoa_theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('ifoa_theme', 'light')
    }
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
