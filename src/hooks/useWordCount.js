import { useState, useEffect, useCallback } from 'react'

export function useWordCount(editor) {
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)

  const updateCounts = useCallback(() => {
    if (!editor) return
    const text = editor.getText()
    const trimmed = text.trim()
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length
    const chars = text.length
    setWordCount(words)
    setCharCount(chars)
  }, [editor])

  useEffect(() => {
    if (!editor) return
    updateCounts()
    editor.on('update', updateCounts)
    return () => {
      editor.off('update', updateCounts)
    }
  }, [editor, updateCounts])

  return { wordCount, charCount }
}
