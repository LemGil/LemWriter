import React from 'react'
import { Sun, Moon, BookOpen } from 'lucide-react'

const themes = [
  { id: 'light', icon: Sun, label: 'Claro' },
  { id: 'sepia', icon: BookOpen, label: 'Sepia' },
  { id: 'dark', icon: Moon, label: 'Oscuro' },
]

const ThemeToggle = ({ theme, onThemeChange }) => {
  return (
    <div className="flex items-center gap-0.5 bg-brand-gold-pale/50 dark:bg-gray-800 rounded-lg p-0.5">
      {themes.map(t => {
        const Icon = t.icon
        const isActive = theme === t.id
        return (
          <button
            key={t.id}
            onClick={() => onThemeChange(t.id)}
            title={t.label}
            className={`p-1.5 rounded-md transition-all ${
              isActive
                ? 'bg-white shadow-sm text-brand-teal'
                : 'text-brand-ink-3 hover:text-brand-teal hover:bg-brand-gold-pale'
            }`}
          >
            <Icon size={14} />
          </button>
        )
      })}
    </div>
  )
}

export default ThemeToggle
