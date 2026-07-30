import React from 'react'
import ThemeToggle from './ThemeToggle'

const AppHeader = ({ theme, onThemeChange }) => {
  return (
    <header className="bg-[#1A3A4A] border-b border-white/10 px-6 py-3 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: '#C8A75D', color: '#1A3A4A', fontFamily: 'Cinzel, Georgia, serif' }}>
            LW
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F7F3E9] font-serif"
              style={{ fontFamily: 'Cinzel, Georgia, serif', letterSpacing: '0.04em' }}>LemWriter</h1>
            <p className="text-xs text-[rgba(247,243,233,0.6)] font-sans">IDE para escritores cristianos</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[#F7F3E9]">
          <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
        </div>
      </div>
    </header>
  )
}

export default AppHeader
