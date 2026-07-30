import nspell from 'nspell'
import affSource from '../data/diccionario.aff?raw'
import dicSource from '../data/diccionario.dic?raw'
import customWords from '../data/diccionario-ministerial.txt?raw'

let checker = null
let initPromise = null

function parseCustomWords(raw) {
  return raw
    .split('\n')
    .map(w => w.trim())
    .filter(w => w.length > 0 && !w.startsWith('#'))
}

function initChecker() {
  if (initPromise) return initPromise

  initPromise = new Promise((resolve) => {
    // nspell acepta strings directamente
    checker = nspell(affSource, dicSource)

    // Agregar palabras ministeriales personalizadas
    const words = parseCustomWords(customWords)
    words.forEach(word => checker.add(word))

    resolve(checker)
  })

  return initPromise
}

export async function getChecker() {
  await initChecker()
  return checker
}

export function isCorrect(word) {
  if (!checker) return true
  // Ignorar: números, URLs, palabras muy cortas, todo mayúsculas (siglas)
  if (word.length <= 2) return true
  if (/^\d+$/.test(word)) return true
  if (/^[A-ZÑÁÉÍÓÚ]+$/.test(word)) return true
  return checker.correct(word)
}

export function getSuggestions(word) {
  if (!checker) return []
  return checker.suggest(word).slice(0, 5)
}
