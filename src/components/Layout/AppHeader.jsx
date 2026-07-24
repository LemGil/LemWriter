import React from 'react'
import ThemeToggle from './ThemeToggle'

const AppHeader = ({ theme, onThemeChange }) => {
  return (
    <header className="theme-bg theme-border px-6 py-3 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{background:'#1A3A4A'}}>
            LW
          </div>
          <div>
            <h1 className="text-xl font-bold text-brand-ink font-serif">LemWriter</h1>
            <p className="text-xs text-brand-ink-3 font-sans">IDE para escritores cristianos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
        </div>
      </div>
    </header>
  )
}

export default AppHeader
