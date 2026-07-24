import React, { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { NodeViewWrapper } from '@tiptap/react'

const FootnoteComponent = ({ node, updateAttributes, selected }) => {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(node.attrs.text || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleSave = () => {
    updateAttributes({ text: value.trim() })
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      setValue(node.attrs.text || '')
      setEditing(false)
    }
  }

  return (
    <NodeViewWrapper as="span"
      className={`footnote-marker inline-block relative group ${selected ? 'ring-2 ring-blue-500 rounded' : ''}`}
      contentEditable={false}
    >
      <sup
        className="cursor-pointer text-blue-600 font-bold text-[0.7em] hover:text-blue-800 select-none px-0.5"
        onClick={(e) => {
          e.stopPropagation()
          setEditing(true)
        }}
      >
        {node.attrs.id ? `[${node.attrs.id}]` : '[?]'}
      </sup>

      {node.attrs.text && !editing && (
        <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 z-50 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-2 h-2 bg-gray-900 rotate-45 -mb-1" />
          {node.attrs.text}
        </div>
      )}

      {editing && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500 font-medium">Nota al pie</span>
            <button onClick={handleSave} className="text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          </div>
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            rows={3}
            className="w-full text-xs border border-gray-200 rounded p-1.5 resize-none focus:outline-none focus:border-blue-400"
            placeholder="Escribe la nota al pie..."
          />
        </div>
      )}
    </NodeViewWrapper>
  )
}

export default FootnoteComponent
