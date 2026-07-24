const { BrowserWindow, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TableOfContents, ImageRun, Table, TableRow, TableCell, LineRuleType } = require('docx')

function buildHtml(project, sections, style) {
  const t = style.typography
  const h = style.headings
  const p = style.page
  const hf = style.headerFooter || {}

  const chapterStyles = `
    <style>
      @page { size: ${p.size} ${p.orientation}; margin: ${p.marginTop} ${p.marginRight} ${p.marginBottom} ${p.marginLeft}; }
      body { font-family: ${t.bodyFont}, serif; font-size: ${t.bodySize}; line-height: ${t.lineHeight}; text-align: ${t.alignment}; color: #000; }
      h1 { font-family: ${h.h1.font}, serif; font-size: ${h.h1.size}; font-weight: ${h.h1.weight}; text-align: ${h.h1.align}; margin-top: ${h.h1.marginTop}; margin-bottom: ${h.h1.marginBottom}; page-break-before: always; }
      h2 { font-family: ${h.h2.font}, serif; font-size: ${h.h2.size}; font-weight: ${h.h2.weight}; text-align: ${h.h2.align}; margin-top: ${h.h2.marginTop}; margin-bottom: ${h.h2.marginBottom}; }
      h3 { font-family: ${h.h3.font}, serif; font-size: ${h.h3.size}; font-weight: ${h.h3.weight}; text-align: ${h.h3.align}; margin-top: ${h.h3.marginTop}; margin-bottom: ${h.h3.marginBottom}; }
      h4 { font-family: ${h.h4.font}, serif; font-size: ${h.h4.size}; font-weight: ${h.h4.weight}; text-align: ${h.h4.align}; margin-top: ${h.h4.marginTop}; margin-bottom: ${h.h4.marginBottom}; }
      h5 { font-family: ${h.h5.font}, serif; font-size: ${h.h5.size}; font-weight: ${h.h5.weight}; text-align: ${h.h5.align}; margin-top: ${h.h5.marginTop}; margin-bottom: ${h.h5.marginBottom}; }
      h6 { font-family: ${h.h6.font}, serif; font-size: ${h.h6.size}; font-weight: ${h.h6.weight}; text-align: ${h.h6.align}; margin-top: ${h.h6.marginTop}; margin-bottom: ${h.h6.marginBottom}; }
      p { margin-top: 0; margin-bottom: ${t.paragraphSpacing}; text-indent: ${t.firstLineIndent}; }
      blockquote { margin-left: 2em; margin-right: 2em; font-style: italic; }
      table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      th { background: ${style.tables?.headerBg || '#f0f0f0'}; font-weight: ${style.tables?.headerWeight || 'bold'}; font-family: ${style.tables?.headerFont || t.bodyFont}; padding: ${style.tables?.cellPadding || '4pt'}; border: ${style.tables?.border || '1px solid #ccc'}; text-align: left; }
      td { font-family: ${style.tables?.bodyFont || t.bodyFont}; font-size: ${style.tables?.bodySize || '10pt'}; padding: ${style.tables?.cellPadding || '4pt'}; border: ${style.tables?.border || '1px solid #ccc'}; }
      img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
      .title-page { text-align: center; padding-top: 30%; }
      .title-page h1 { font-size: 24pt; margin-bottom: 0; page-break-before: avoid; }
      .title-page p { text-indent: 0; }
    </style>`

  const titlePage = project.title ? `
    <div class="title-page">
      <h1>${project.title}</h1>
      ${project.author ? `<p>${project.author}</p>` : ''}
    </div>
  ` : ''

  const body = sections.map(s => {
    const title = s.type === 'capitulo'
      ? `<h1>${style.chapter.numberPrefix || ''}${s.title}</h1>`
      : `<h2>${s.title}</h2>`
    return `${title}${s.content || ''}`
  }).join('\n')

  const allFootnotes = []
  const bodyWithFootnotes = body.replace(
    /<span[^>]*data-footnote[^>]*>([\s\S]*?)<\/span>/g,
    (match, inner) => {
      const textMatch = match.match(/data-text="([^"]*)"/)
      const idMatch = match.match(/data-id="([^"]*)"/)
      const text = textMatch ? textMatch[1] : ''
      const id = idMatch ? idMatch[1] : ''
      if (text) {
        const num = allFootnotes.length + 1
        allFootnotes.push({ num, text, id })
        return `<sup class="footnote-ref">[${num}]</sup>`
      }
      return match
    }
  )

  const footnoteSection = allFootnotes.length > 0 ? `
    <div class="footnotes-section">
      <hr style="margin-top:2em;border:none;border-top:1px solid #ccc;" />
      <h2 style="font-size:12pt;margin-top:1em;">Notas al pie</h2>
      <ol style="font-size:9pt;line-height:1.4;padding-left:1.5em;">
        ${allFootnotes.map(f => `<li id="fn-${f.num}">${f.text}</li>`).join('\n        ')}
      </ol>
    </div>
  ` : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${chapterStyles}</head><body>${titlePage}${bodyWithFootnotes}${footnoteSection}</body></html>`
}

function resolvePlaceholders(text, project) {
  if (!text) return ''
  return text
    .replace(/\{author\}/g, project.author || '')
    .replace(/\{title\}/g, project.title || '')
    .replace(/\{date\}/g, new Date().toLocaleDateString('es'))
}

function toInches(cssLength, fallback = 0.4) {
  if (!cssLength) return fallback
  const value = parseFloat(cssLength)
  if (Number.isNaN(value)) return fallback
  if (cssLength.includes('mm')) return value / 25.4
  if (cssLength.includes('in')) return value
  return value / 2.54
}

function buildHeaderFooterTemplate(conf, project, includePageNumber, numberAlign) {
  const parts = []
  if (conf?.show && conf.content) {
    parts.push(`<span>${resolvePlaceholders(conf.content, project)}</span>`)
  }
  if (includePageNumber) {
    parts.push('<span class="pageNumber"></span>/<span class="totalPages"></span>')
  }
  if (parts.length === 0) return '<span></span>'
  const font = conf?.font || 'Times New Roman'
  const fontSize = conf?.fontSize || '10pt'
  const align = numberAlign || conf?.align || 'center'
  return `<div style="width:100%;font-size:${fontSize};font-family:${font},serif;text-align:${align};padding:0 0.5cm;">${parts.join(' &nbsp; ')}</div>`
}

async function exportPDF(project, sections, style) {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${project.title || 'documento'}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (!filePath) return null

  const html = buildHtml(project, sections, style)
  const printWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  await new Promise(r => setTimeout(r, 500))

  const hf = style.headerFooter || {}
  const headerConf = hf.header || {}
  const footerConf = hf.footer || {}
  const pageNumbers = hf.pageNumbers || 'none'
  const numberInHeader = pageNumbers.startsWith('top')
  const numberInFooter = pageNumbers.startsWith('bottom')
  const numberAlign = pageNumbers.endsWith('right') ? 'right' : pageNumbers.endsWith('left') ? 'left' : 'center'

  const headerTemplate = buildHeaderFooterTemplate(headerConf, project, numberInHeader, numberInHeader ? numberAlign : undefined)
  const footerTemplate = buildHeaderFooterTemplate(footerConf, project, numberInFooter, numberInFooter ? numberAlign : undefined)
  const displayHeaderFooter = !!((headerConf.show && headerConf.content) || (footerConf.show && footerConf.content) || pageNumbers !== 'none')

  const pdfOptions = {
    printBackground: true,
    pageSize: style.page.size,
    margins: {
      top: toInches(style.page.marginTop),
      bottom: toInches(style.page.marginBottom),
      left: toInches(style.page.marginLeft),
      right: toInches(style.page.marginRight),
    },
    displayHeaderFooter,
    headerTemplate: displayHeaderFooter ? headerTemplate : '<span></span>',
    footerTemplate: displayHeaderFooter ? footerTemplate : '<span></span>',
  }

  const pdfData = await printWin.webContents.printToPDF(pdfOptions)
  printWin.close()
  fs.writeFileSync(filePath, pdfData)
  return filePath
}

// ══════════════════════════════════════════════════════════════
//  DOCX — Parseo de HTML a elementos docx
// ══════════════════════════════════════════════════════════════

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
}

function cssSizeToHalfPoints(cssSize, fallback) {
  if (!cssSize) return fallback
  const match = cssSize.match(/([\d.]+)\s*(pt|px|em)?/)
  if (!match) return fallback
  const value = parseFloat(match[1])
  const unit = match[2] || 'pt'
  if (unit === 'pt') return Math.round(value * 2)
  if (unit === 'px') return Math.round(value * 2 * 0.75)
  if (unit === 'em') return Math.round(value * 24)
  return fallback
}

function parseInlineContent(html, parentFormat) {
  const runs = []
  const fmt = Object.assign({ bold: false, italics: false, underline: false, strike: false, superscript: false, subscript: false }, parentFormat || {})
  const formatStack = [fmt]
  let remaining = html.trim()

  function cur() { return formatStack[formatStack.length - 1] }

  while (remaining.length > 0) {
    // Opening inline tags
    var openMatch = remaining.match(/^<(strong|b|em|i|u|s|strike|del|sup|sub)(\s[^>]*)?>/i)
    if (openMatch) {
      var tag = openMatch[1].toLowerCase()
      var nf = Object.assign({}, cur())
      if (tag === 'strong' || tag === 'b') nf.bold = true
      if (tag === 'em' || tag === 'i') nf.italics = true
      if (tag === 'u') nf.underline = true
      if (tag === 's' || tag === 'strike' || tag === 'del') nf.strike = true
      if (tag === 'sup') nf.superscript = true
      if (tag === 'sub') nf.subscript = true
      formatStack.push(nf)
      remaining = remaining.slice(openMatch[0].length)
      continue
    }

    // Closing inline tags
    var closeMatch = remaining.match(/^<\/(strong|b|em|i|u|s|strike|del|sup|sub)>/i)
    if (closeMatch) {
      if (formatStack.length > 1) formatStack.pop()
      remaining = remaining.slice(closeMatch[0].length)
      continue
    }

    // <br>
    var brMatch = remaining.match(/^<br\s*\/?>/i)
    if (brMatch) {
      runs.push(new TextRun(Object.assign({ text: '\n' }, cur())))
      remaining = remaining.slice(brMatch[0].length)
      continue
    }

    // Skip any other tag
    var anyTag = remaining.match(/^<[^>]+>/)
    if (anyTag) {
      remaining = remaining.slice(anyTag[0].length)
      continue
    }

    // Text until next tag
    var nextTag = remaining.search(/<[^>]+>/)
    var textSegment = nextTag === -1 ? remaining : remaining.slice(0, nextTag)
    if (textSegment) {
      runs.push(new TextRun(Object.assign({ text: decodeHtmlEntities(textSegment) }, cur())))
    }
    remaining = remaining.slice(textSegment.length)
  }

  return runs
}

// ── Regex helpers using string concatenation (avoids template literal escaping bugs) ──

var BLOCK_TAGS_RE = /^(p|h[1-6]|blockquote|ul|ol|table|div|hr|pre)$/

function makeBlockOpenRegex(tagName) {
  return new RegExp('^<' + tagName + '(\\s[^>]*)?>', 'i')
}

function makeBlockCloseStr(tagName) {
  return '</' + tagName + '>'
}

function extractBlockContent(html, tagName, startIndex) {
  var openRegex = makeBlockOpenRegex(tagName)
  var openMatch = html.slice(startIndex).match(openRegex)
  if (!openMatch) return null

  var contentStart = startIndex + openMatch[0].length
  var closeStr = makeBlockCloseStr(tagName)
  var depth = 1
  var pos = contentStart

  while (depth > 0 && pos < html.length) {
    var nextOpen = html.indexOf('<' + tagName, pos)
    var nextClose = html.indexOf(closeStr, pos)

    if (nextClose === -1) break

    if (nextOpen !== -1 && nextOpen < nextClose) {
      // Check it's an opening tag, not closing
      if (html.charAt(nextOpen + 1) !== '/') {
        depth++
      }
      pos = nextOpen + 1
    } else {
      depth--
      if (depth === 0) {
        return html.slice(contentStart, nextClose)
      }
      pos = nextClose + closeStr.length
    }
  }

  // Fallback: first closing tag
  var simpleClose = html.indexOf(closeStr, contentStart)
  if (simpleClose !== -1) {
    return html.slice(contentStart, simpleClose)
  }
  return html.slice(contentStart)
}

function segmentBlocks(html) {
  var blockTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'table', 'div', 'hr', 'pre']
  // Build ONE master regex: <(p|h1|...|pre)(\s[^>]*)?>
  var masterRegex = new RegExp('<(' + blockTags.join('|') + ')(\\s[^>]*)?>', 'i')
  var segments = []
  var remaining = html

  while (remaining.length > 0) {
    var match = masterRegex.exec(remaining)
    if (!match) {
      if (remaining.trim()) {
        segments.push({ type: 'text', content: remaining })
      }
      break
    }

    var matchIndex = match.index
    var tagName = match[1].toLowerCase()

    // Text before this tag
    if (matchIndex > 0) {
      var before = remaining.slice(0, matchIndex)
      if (before.trim()) {
        segments.push({ type: 'text', content: before })
      }
    }

    if (tagName === 'hr') {
      segments.push({ type: 'hr', content: '' })
      remaining = remaining.slice(matchIndex + match[0].length)
      continue
    }

    var content = extractBlockContent(remaining, tagName, matchIndex)
    if (content !== null) {
      segments.push({ type: 'block', tag: tagName, content: content })
      var closeStr = makeBlockCloseStr(tagName)
      var afterContent = remaining.indexOf(closeStr, matchIndex + match[0].length)
      if (afterContent !== -1) {
        remaining = remaining.slice(afterContent + closeStr.length)
      } else {
        remaining = ''
      }
    } else {
      remaining = remaining.slice(matchIndex + match[0].length)
    }
  }

  return segments
}

function getHeadingFontSizes(style) {
  var h = style.headings || {}
  return {
    1: cssSizeToHalfPoints(h.h1 && h.h1.size, 48),
    2: cssSizeToHalfPoints(h.h2 && h.h2.size, 36),
    3: cssSizeToHalfPoints(h.h3 && h.h3.size, 30),
    4: cssSizeToHalfPoints(h.h4 && h.h4.size, 28),
    5: cssSizeToHalfPoints(h.h5 && h.h5.size, 26),
    6: cssSizeToHalfPoints(h.h6 && h.h6.size, 24),
  }
}

function htmlToDocxElements(html, style) {
  var elements = []
  var alignmentMap = {
    left: AlignmentType.LEFT,
    center: AlignmentType.CENTER,
    right: AlignmentType.RIGHT,
    justify: AlignmentType.JUSTIFIED,
  }

  var t = style.typography || {}
  var bodyAlignment = alignmentMap[t.alignment] || AlignmentType.JUSTIFIED

  var defaultBefore = 200
  var defaultAfter = 200
  var defaultLine = Math.round((t.lineHeight || 1.5) * 240)
  var defaultFirstLine = 720

  function addParagraph(children, opts) {
    opts = opts || {}
    var textoSinTags = ''
    for (var c = 0; c < children.length; c++) {
      if (children[c] && children[c].options && children[c].options.text) {
        textoSinTags += children[c].options.text
      }
    }
    console.log('[DEBUG] Creando párrafo con texto:', textoSinTags.slice(0, 50))

    var paragraphSpacing = {
      before: opts.before != null ? opts.before : defaultBefore,
      after: opts.after != null ? opts.after : defaultAfter,
      line: opts.lineSpacing || defaultLine,
      lineRule: LineRuleType.AUTO,
    }

    var paragraphIndent = opts.indent || {}
    if (!opts.indent && defaultFirstLine) {
      paragraphIndent = { firstLine: defaultFirstLine }
    }

    console.log('[DEBUG] Spacing:', JSON.stringify(paragraphSpacing), '| Indent:', JSON.stringify(paragraphIndent))

    elements.push(new Paragraph({
      children: children,
      alignment: opts.alignment || bodyAlignment,
      spacing: paragraphSpacing,
      indent: paragraphIndent,
      bullet: opts.bullet,
      numbering: opts.numbering,
      heading: opts.heading,
      pageBreakBefore: opts.pageBreakBefore,
    }))
  }

  var segments = segmentBlocks(html)

  for (var i = 0; i < segments.length; i++) {
    var seg = segments[i]

    if (seg.type === 'text') {
      var trimmed = seg.content.trim()
      if (!trimmed) continue
      addParagraph(parseInlineContent(trimmed))
      continue
    }

    if (seg.type === 'hr') {
      addParagraph([new TextRun({ text: '________________________________________________________________________', color: 'AAAAAA', size: 20 })], { before: 200, after: 200, alignment: AlignmentType.CENTER })
      continue
    }

    if (seg.type !== 'block') continue
    var tag = seg.tag
    var inner = seg.content

    if (tag === 'p') {
      var textContent = inner.replace(/<[^>]*>/g, '').trim()
      if (!textContent) continue
      addParagraph(parseInlineContent(inner), { after: 120 })
    }
    else if (/^h[1-6]$/.test(tag)) {
      var level = parseInt(tag[1])
      var headingMap = {
        1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5, 6: HeadingLevel.HEADING_6,
      }
      var hConfig = (style.headings || {})[tag] || {}
      var hAlign = alignmentMap[hConfig.align] || bodyAlignment
      addParagraph(parseInlineContent(inner), {
        heading: headingMap[level] || HeadingLevel.HEADING_1,
        alignment: hAlign,
        before: 300,
        after: 200,
        lineSpacing: 276,
      })
    }
    else if (tag === 'blockquote') {
      addParagraph(parseInlineContent(inner, { italics: true }), {
        indent: { left: 720, right: 360 },
        before: 200,
        after: 200,
      })
    }
    else if (tag === 'ul' || tag === 'ol') {
      var liRegex = /<li(\s[^>]*)?>([\s\S]*?)<\/li>/gi
      var liMatch
      while ((liMatch = liRegex.exec(inner)) !== null) {
        var liInner = liMatch[2]
        addParagraph(parseInlineContent(liInner), {
          bullet: tag === 'ul' ? { level: 0 } : undefined,
          numbering: tag === 'ol' ? { reference: 'numbered-list', level: 0 } : undefined,
          before: 40,
          after: 40,
          lineSpacing: defaultLine,
        })
      }
    }
    else if (tag === 'table') {
      try {
        var table = parseHtmlTable(inner, style)
        if (table) elements.push(table)
      } catch (e) {
        addParagraph([new TextRun({ text: decodeHtmlEntities(inner.replace(/<[^>]*>/g, ' ').trim()), italics: true, color: '999999' })])
      }
    }
    else if (tag === 'pre') {
      var codeText = inner.replace(/<[^>]*>/g, '')
      addParagraph([new TextRun({ text: decodeHtmlEntities(codeText), font: 'Courier New', size: 20 })], { indent: { left: 360 }, before: 100, after: 100 })
    }
    else if (tag === 'div') {
      var innerElements = htmlToDocxElements(inner, style)
      for (var j = 0; j < innerElements.length; j++) {
        elements.push(innerElements[j])
      }
    }
  }

  return elements
}

function parseHtmlTable(html, style) {
  var rows = []
  var trRegex = /<tr(\s[^>]*)?>([\s\S]*?)<\/tr>/gi
  var trMatch

  while ((trMatch = trRegex.exec(html)) !== null) {
    var trContent = trMatch[2]
    var cells = []
    var tdRegex = /<t[hd](\s[^>]*)?>([\s\S]*?)<\/t[hd]>/gi
    var tdMatch

    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      var isHeader = tdMatch[0].charAt(1) === 'h' || tdMatch[0].charAt(2) === 'h'
      var cellContent = tdMatch[2]
      var cellOpts = {}
      if (isHeader) cellOpts.shading = { fill: 'f0f0f0' }
      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: parseInlineContent(cellContent, { bold: isHeader }),
              spacing: { before: 40, after: 40 },
            }),
          ],
          shading: isHeader ? { fill: 'f0f0f0' } : undefined,
        })
      )
    }

    if (cells.length > 0) {
      rows.push(new TableRow({ children: cells }))
    }
  }

  if (rows.length === 0) return null
  return new Table({ rows })
}

function buildFootnoteSection(sections) {
  var allFootnotes = []

  for (var i = 0; i < sections.length; i++) {
    var s = sections[i]
    if (!s.content) continue
    var footnoteRegex = /<span[^>]*data-footnote[^>]*>([\s\S]*?)<\/span>/g
    var fnMatch
    while ((fnMatch = footnoteRegex.exec(s.content)) !== null) {
      var textMatch = fnMatch[0].match(/data-text="([^"]*)"/)
      var text = textMatch ? textMatch[1] : ''
      if (text) {
        allFootnotes.push({ num: allFootnotes.length + 1, text: text })
      }
    }
  }

  if (allFootnotes.length === 0) return []

  var paragraphs = []

  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: '________________________________________________________________________', color: 'AAAAAA', size: 20 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
  }))

  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: 'Notas al pie', bold: true, size: 24, font: 'Times New Roman' })],
    spacing: { before: 200, after: 200 },
  }))

  for (var j = 0; j < allFootnotes.length; j++) {
    var fn = allFootnotes[j]
    var prefix = '[' + fn.num + '] '
    var textRuns = parseInlineContent(fn.text, { size: 20 })
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({ text: prefix, bold: true, size: 20, font: 'Times New Roman' }),
      ].concat(textRuns),
      indent: { left: 360, hanging: 360 },
      spacing: { before: 40, after: 40, line: 240 },
    }))
  }

  return paragraphs
}

async function exportDOCX(project, sections, style) {
  console.log('[DEBUG] export:docx received project:', project?.title)
  console.log('[DEBUG] export:docx received sections count:', sections?.length)
  console.log('[DEBUG] export:docx sections:', sections)

  if (!sections || sections.length === 0) {
    throw new Error('No hay secciones para exportar')
  }

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${project.title || 'documento'}.docx`,
    filters: [{ name: 'DOCX', extensions: ['docx'] }],
  })
  if (!filePath) return null

  var alignmentMap = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED }
  var t = style.typography || {}
  var bodySize = cssSizeToHalfPoints(t.bodySize, 24)
  var titleSize = cssSizeToHalfPoints(style.chapter && style.chapter.titleSize, 48) || 48

  var children = []

  // Portada
  if (project.title) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: project.title, size: titleSize, bold: true, font: (style.chapter && style.chapter.titleFont) || 'Times New Roman' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 4000, after: 200 },
      }),
    )
    if (project.author) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: project.author, size: 28, font: t.bodyFont || 'Times New Roman' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
      )
    }
    children.push(new Paragraph({ children: [], pageBreakBefore: true }))
  }

  // Section content
  for (var i = 0; i < sections.length; i++) {
    var s = sections[i]

    if (s.type === 'capitulo') {
      children.push(
        new Paragraph({
          children: [new TextRun({
            text: ((style.chapter && style.chapter.numberPrefix) || '') + s.title,
            size: 32,
            bold: true,
            font: (style.chapter && style.chapter.titleFont) || 'Times New Roman',
          })],
          alignment: alignmentMap[(style.chapter && style.chapter.titlePosition)] || AlignmentType.CENTER,
          spacing: { before: 600, after: 300 },
          pageBreakBefore: true,
        })
      )
    } else if (['portada', 'dedicatoria', 'prologo', 'introduccion', 'conclusion', 'apendice', 'bibliografia'].indexOf(s.type) !== -1) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: s.title, size: 28, bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 200 },
        })
      )
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: s.title, size: 28, bold: true })],
          spacing: { before: 400, after: 200 },
        })
      )
    }

    if (s.content) {
      var contentElements = htmlToDocxElements(s.content, style)
      for (var j = 0; j < contentElements.length; j++) {
        children.push(contentElements[j])
      }
    }
  }

  // Footnotes
  var footnotes = buildFootnoteSection(sections)
  for (var k = 0; k < footnotes.length; k++) {
    children.push(footnotes[k])
  }

  var doc = new Document({
    styles: { paragraphStyles: [] },
    numbering: {
      config: [{
        reference: 'numbered-list',
        levels: [{
          level: 0,
          format: 'decimal',
          text: '%1.',
          alignment: 'left',
        }],
      }],
    },
    sections: [{ children: children }],
  })

  console.log('[DEBUG] Cantidad de párrafos en children:', children.length)
  if (children.length > 0) {
    console.log('[DEBUG] Tipo del primer hijo:', children[0]?.constructor?.name)
  }

  var buffer = await Packer.toBuffer(doc)
  fs.writeFileSync(filePath, buffer)
  return filePath
}

async function exportEPUB(project, sections, style) {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${project.title || 'documento'}.epub`,
    filters: [{ name: 'EPUB', extensions: ['epub'] }],
  })
  if (!filePath) return null

  const yazl = require('yazl')
  const zip = new yazl.ZipFile()

  const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const t = style.typography
  const css = [
    '@page { margin: ' + style.page.marginTop + ' ' + style.page.marginRight + ' ' + style.page.marginBottom + ' ' + style.page.marginLeft + '; }',
    'body { font-family: ' + t.bodyFont + ', serif; font-size: ' + t.bodySize + '; line-height: ' + t.lineHeight + '; text-align: ' + t.alignment + '; }',
    'h1 { font-family: ' + style.headings.h1.font + ', serif; font-size: ' + style.headings.h1.size + '; font-weight: ' + style.headings.h1.weight + '; text-align: ' + style.headings.h1.align + '; margin-top: ' + style.headings.h1.marginTop + '; }',
    'h2 { font-family: ' + style.headings.h2.font + ', serif; font-size: ' + style.headings.h2.size + '; font-weight: ' + style.headings.h2.weight + '; }',
    'p { margin-top: 0; margin-bottom: ' + t.paragraphSpacing + '; text-indent: ' + t.firstLineIndent + '; }',
    'blockquote { margin-left: 2em; margin-right: 2em; font-style: italic; }',
  ].join('\n')

  var opf = '<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">\n  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n    <dc:identifier id="book-id">' + esc(project.id || 'urn:uuid:' + Date.now()) + '</dc:identifier>\n    <dc:title>' + (esc(project.title) || 'Documento') + '</dc:title>\n    <dc:language>es</dc:language>\n    <dc:creator>' + (esc(project.author) || 'Autor') + '</dc:creator>\n    <meta property="dcterms:modified">' + new Date().toISOString().replace(/\.\d+/, '') + 'Z</meta>\n  </metadata>\n  <manifest>\n    <item id="css" href="style.css" media-type="text/css"/>\n    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n    ' + sections.map((s, i) => '<item id="sec' + i + '" href="sec' + i + '.xhtml" media-type="application/xhtml+xml"/>').join('\n    ') + '\n  </manifest>\n  <spine>\n    <itemref idref="nav" linear="no"/>\n    ' + sections.map((s, i) => '<itemref idref="sec' + i + '"/>').join('\n    ') + '\n  </spine>\n</package>'

  var navXhtml = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n<head><title>' + (esc(project.title) || 'Contenido') + '</title><link rel="stylesheet" type="text/css" href="style.css"/></head>\n<body>\n<nav epub:type="toc">\n  <h1>' + (esc(project.title) || 'Contenido') + '</h1>\n  <ol>' + sections.map((s, i) => '<li><a href="sec' + i + '.xhtml">' + esc(s.title) + '</a></li>').join('\n') + '</ol>\n</nav>\n</body></html>'

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(filePath)
    output.on('close', () => resolve(filePath))
    output.on('error', reject)

    zip.outputStream.pipe(output)

    zip.addBuffer(Buffer.from('application/epub+zip'), 'mimetype', { compress: false })
    zip.addBuffer(Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n  <rootfiles>\n    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>\n  </rootfiles>\n</container>'), 'META-INF/container.xml')
    zip.addBuffer(Buffer.from(opf, 'utf-8'), 'content.opf')
    zip.addBuffer(Buffer.from(css, 'utf-8'), 'style.css')
    zip.addBuffer(Buffer.from(navXhtml, 'utf-8'), 'nav.xhtml')

    sections.forEach((s, i) => {
      var xhtml = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head><title>' + esc(s.title) + '</title><link rel="stylesheet" type="text/css" href="style.css"/></head>\n<body>\n' + (s.type === 'capitulo' ? '<h1>' + esc(s.title) + '</h1>' : '<h2>' + esc(s.title) + '</h2>') + '\n' + (s.content || '') + '\n</body></html>'
      zip.addBuffer(Buffer.from(xhtml, 'utf-8'), 'sec' + i + '.xhtml')
    })

    zip.end()
  })
}

let mainWindow = null

function setMainWindow(win) {
  mainWindow = win
}

module.exports = { exportPDF, exportDOCX, exportEPUB, setMainWindow, buildHtml }
