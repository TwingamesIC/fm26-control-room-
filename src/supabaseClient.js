import { createClient } from '@supabase/supabase-js'

// Preleviamo i dati dalle variabili d'ambiente protette
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)