import React, { useState, useRef, useCallback, useEffect } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { Maximize2 } from 'lucide-react'

const MIN_SIZE = 50

const ResizableImageComponent = ({ node, updateAttributes, selected }) => {
  const { src, alt, title, width, height } = node.attrs
  const [resizing, setResizing] = useState(false)
  const [natural, setNatural] = useState(null)
  const imgRef = useRef(null)
  const startPos = useRef(null)
  const startSize = useRef(null)
  const aspectRatio = useRef(null)

  const handleLoad = useCallback(() => {
    if (imgRef.current) {
      const w = imgRef.current.naturalWidth
      const h = imgRef.current.naturalHeight
      setNatural({ width: w, height: h })
      aspectRatio.current = w / h
    }
  }, [])

  const displayWidth = width !== null ? `${width}px` : undefined
  const displayHeight = height !== null ? `${height}px` : undefined

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(true)
    startPos.current = { x: e.clientX, y: e.clientY }
    startSize.current = {
      width: width || natural?.width || 300,
      height: height || natural?.height || 200,
    }
  }, [width, height, natural])

  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e) => {
      const dx = e.clientX - startPos.current.x
      const dy = e.clientY - startPos.current.y
      let newWidth = startSize.current.width + dx
      let newHeight

      if (e.shiftKey) {
        newHeight = newWidth / aspectRatio.current
      } else {
        newHeight = startSize.current.height + dy
      }

      if (newWidth < MIN_SIZE) newWidth = MIN_SIZE
      if (newHeight < MIN_SIZE) newHeight = MIN_SIZE

      if (imgRef.current) {
        imgRef.current.style.width = `${newWidth}px`
        imgRef.current.style.height = `${newHeight}px`
      }
    }

    const handleMouseUp = () => {
      setResizing(false)
      if (imgRef.current) {
        const w = imgRef.current.offsetWidth
        const h = imgRef.current.offsetHeight
        updateAttributes({ width: w, height: h })
      }
      startPos.current = null
      startSize.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing, updateAttributes])

  const imgStyle = {
    maxWidth: '100%',
    display: 'block',
    margin: '1em auto',
    width: displayWidth,
    height: displayHeight,
    cursor: resizing ? 'nwse-resize' : undefined,
  }

  return (
    <NodeViewWrapper
      className={`relative inline-block group/image ${selected ? 'ring-2 ring-blue-500 rounded' : ''}`}
      contentEditable={false}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        title={title || ''}
        style={imgStyle}
        onLoad={handleLoad}
        draggable={false}
      />

      {selected && (
        <div
          className="absolute bottom-1 right-1 w-4 h-4 bg-white border border-gray-400 rounded-sm cursor-nwse-resize flex items-center justify-center hover:bg-blue-100 hover:border-blue-500 transition-colors opacity-0 group-hover/image:opacity-100"
          onMouseDown={handleMouseDown}
        >
          <Maximize2 size={10} className="text-gray-600" />
        </div>
      )}
    </NodeViewWrapper>
  )
}

export default ResizableImageComponent
