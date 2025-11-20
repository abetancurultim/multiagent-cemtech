export interface Database {
  public: {
    Tables: {
      resources: {
        Row: {
          id: number;
          name: string;
          unit: string;
          cost_per_unit: number;
        };
        Insert: {
          id?: number;
          name: string;
          unit: string;
          cost_per_unit: number;
        };
        Update: {
          id?: number;
          name?: string;
          unit?: string;
          cost_per_unit?: number;
        };
        Relationships: [];
      };
      assemblies: {
        Row: {
          id: number;
          code: string;
          description: string;
          unit: string;
        };
        Insert: {
          id?: number;
          code: string;
          description: string;
          unit: string;
        };
        Update: {
          id?: number;
          code?: string;
          description?: string;
          unit?: string;
        };
        Relationships: [];
      };
      assembly_resources: {
        Row: {
          id: number;
          assembly_id: number;
          resource_id: number;
          quantity: number;
        };
        Insert: {
          id?: number;
          assembly_id: number;
          resource_id: number;
          quantity: number;
        };
        Update: {
          id?: number;
          assembly_id?: number;
          resource_id?: number;
          quantity?: number;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string; // UUID
          name: string | null;
          status: string;
          user_phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          status: string;
          user_phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          status?: string;
          user_phone?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      project_items: {
        Row: {
          id: number;
          project_id: string;
          assembly_id: number;
          quantity: number;
          calculated_cost: number | null;
        };
        Insert: {
          id?: number;
          project_id: string;
          assembly_id: number;
          quantity: number;
          calculated_cost?: number | null;
        };
        Update: {
          id?: number;
          project_id?: string;
          assembly_id?: number;
          quantity?: number;
          calculated_cost?: number | null;
        };
        Relationships: [];
      };
      chat_history: {
        Row: {
          id: number;
          created_at: string;
          client_number: string;
          client_name: string | null;
          chat_on: boolean;
          chat_status: 'open' | 'closed' | 'pending';
          agent_name: string;
          origin: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          client_number: string;
          client_name?: string | null;
          chat_on?: boolean;
          chat_status?: 'open' | 'closed' | 'pending';
          agent_name: string;
          origin?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          client_number?: string;
          client_name?: string | null;
          chat_on?: boolean;
          chat_status?: 'open' | 'closed' | 'pending';
          agent_name?: string;
          origin?: string | null;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: number;
          conversation_id: number;
          sender: 'user' | 'assistant' | 'system';
          message: string;
          type: 'text' | 'image' | 'document' | 'audio';
          twilio_sid: string | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          conversation_id: number;
          sender: 'user' | 'assistant' | 'system';
          message: string;
          type?: 'text' | 'image' | 'document' | 'audio';
          twilio_sid?: string | null;
          status?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          conversation_id?: number;
          sender?: 'user' | 'assistant' | 'system';
          message?: string;
          type?: 'text' | 'image' | 'document' | 'audio';
          twilio_sid?: string | null;
          status?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}

// Tipos auxiliares para uso en el código
export type ChatHistory = Database['public']['Tables']['chat_history']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];