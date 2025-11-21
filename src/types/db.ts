export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string // uuid
          name: string | null
          email: string | null
          phone: string | null
          color_primary: string | null
        }
        Insert: {
          id: string
          name?: string | null
          email?: string | null
          phone?: string | null
          color_primary?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          phone?: string | null
          color_primary?: string | null
        }
      }
      clients: {
        Row: {
          id: string // uuid
          company_id: string | null
          name: string | null
          email: string | null
          phone: string | null
        }
        Insert: {
          id?: string // default uuid_generate_v4()
          company_id?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
        }
        Update: {
          id?: string
          company_id?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
        }
      }
      item_categories: {
        Row: {
          id: number
          company_id: string | null
          name: string | null
          code: string | null
        }
        Insert: {
          id?: number
          company_id?: string | null
          name?: string | null
          code?: string | null
        }
        Update: {
          id?: number
          company_id?: string | null
          name?: string | null
          code?: string | null
        }
      }
      items: {
        Row: {
          id: number // bigserial (handled as number for JS safety, technically string in some drivers)
          company_id: string | null
          name: string | null
          unit: string | null // 'SF', 'LF', 'EA'
          unit_cost: number | null // numeric(12,2)
          category_id: number | null
        }
        Insert: {
          id?: number
          company_id?: string | null
          name?: string | null
          unit?: string | null
          unit_cost?: number | null
          category_id?: number | null
        }
        Update: {
          id?: number
          company_id?: string | null
          name?: string | null
          unit?: string | null
          unit_cost?: number | null
          category_id?: number | null
        }
      }
      estimations: {
        Row: {
          id: string // uuid (The "Cart ID")
          client_id: string | null
          sequential_number: number // serial
          status: string | null // 'draft', 'sent', 'approved'
          net_total: number | null // numeric(12,2)
          items_summary: Json | null // cache visual
        }
        Insert: {
          id?: string
          client_id?: string | null
          sequential_number?: number
          status?: string | null
          net_total?: number | null
          items_summary?: Json | null
        }
        Update: {
          id?: string
          client_id?: string | null
          sequential_number?: number
          status?: string | null
          net_total?: number | null
          items_summary?: Json | null
        }
      }
      estimation_items: {
        Row: {
          id: number // bigserial
          estimation_id: string | null // FK -> estimations
          item_id: number | null // FK -> items
          description: string | null
          quantity: number | null // numeric(12,3)
          unit: string | null
          unit_cost: number | null // Precio congelado
          line_total: number | null
        }
        Insert: {
          id?: number
          estimation_id?: string | null
          item_id?: number | null
          description?: string | null
          quantity?: number | null
          unit?: string | null
          unit_cost?: number | null
          line_total?: number | null
        }
        Update: {
          id?: number
          estimation_id?: string | null
          item_id?: number | null
          description?: string | null
          quantity?: number | null
          unit?: string | null
          unit_cost?: number | null
          line_total?: number | null
        }
      }
    }
  }
}

// Helper Types for clean imports
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Update<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']