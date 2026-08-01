import { createClient } from '@supabase/supabase-js'

// En entorno Node.js (tests), usa process.env; en navegador/Vite, import.meta.env
export const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env?.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env?.VITE_SUPABASE_ANON_KEY

// NOTA: RLS en tablas lw_* usa USING (true) — acceso anon total.
// Cuando se agregue autenticación, cambiar a USING (auth.uid() = user_id)
// y agregar columna user_id a todas las tablas lw_*

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('LemWriter: variables de Supabase no configuradas — modo offline')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseEnabled = () => !!supabase
