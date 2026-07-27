// Shared layout shell for right-panel tabs.
//
// Provides the tab bar, active-tab accent, and scrollable content area.
// Each panel component passes its tab definitions and renders content
// via the children render-prop (called with the activeTab id).
//
// Usage:
//   <BasePanel tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} accent="libro">
//     {(tabId) => {
//       switch (tabId) { case 'references': return <... />; }
//     }}
//   </BasePanel>

import React from 'react';

const ACCENT_MAP = {
  libro:    { active: 'border-libro text-libro',         inactive: 'border-transparent text-brand-ink-3 hover:text-brand-ink' },
  libroBg:  { active: 'border-libro text-libro',         inactive: 'border-transparent text-brand-ink-3 hover:text-brand-ink' },
  ensenanza:{ active: 'border-ensenanza text-ensenanza', inactive: 'border-transparent text-brand-ink-3 hover:text-brand-ink' },
  yellow:   { active: 'border-ensenanza text-ensenanza', inactive: 'border-transparent text-brand-ink-3 hover:text-brand-ink' },
  devocional:{active: 'border-devocional text-devocional',inactive: 'border-transparent text-brand-ink-3 hover:text-brand-ink' },
  brand:    { active: 'border-brand-gold text-brand-gold-deep', inactive: 'border-transparent text-brand-ink-3 hover:text-brand-ink' },
  teal:     { active: 'border-brand-teal text-brand-teal',       inactive: 'border-transparent text-brand-ink-3 hover:text-brand-ink' },
  study:    { active: 'border-brand-gold text-brand-teal',       inactive: 'border-transparent text-brand-ink-3 hover:text-brand-ink' },
};

function BasePanel({ tabs, activeTab, onTabChange, accent = 'brand', children }) {
  const colors = ACCENT_MAP[accent] || ACCENT_MAP.brand;

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 text-[10px] font-medium border-b-2 transition-colors min-w-[40px] ${
                activeTab === tab.id ? colors.active : colors.inactive
              }`}
              title={tab.label}
            >
              <Icon size={14} />
              <span className="mt-0.5 leading-tight truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-3">
        {typeof children === 'function' ? children(activeTab) : children}
      </div>
    </div>
  );
}

export default BasePanel;
