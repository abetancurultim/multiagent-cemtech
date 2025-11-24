import { supabase } from "../config/supabase";
import { Tables, Insert } from "../types/db";

export const crmService = {
  /**
   * Busca clientes por nombre (coincidencia parcial, case-insensitive)
   */
  async findClientByName(name: string): Promise<Tables<"clients">[]> {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .ilike("name", `%${name}%`)
      .limit(5);

    if (error) {
      console.error("Error finding client:", error);
      throw new Error(`Error finding client: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Crea un nuevo cliente
   */
  async createClient(clientData: Insert<"clients">): Promise<Tables<"clients">> {
    // Primero intentamos obtener el company_id por defecto si no viene
    if (!clientData.company_id) {
      const { data: company } = await supabase.from("companies").select("id").limit(1).single();
      if (company) {
        clientData.company_id = company.id;
      }
    }

    const { data, error } = await supabase
      .from("clients")
      .insert(clientData)
      .select()
      .single();

    if (error) {
      console.error("Error creating client:", error);
      throw new Error(`Error creating client: ${error.message}`);
    }

    return data;
  },

  /**
   * Obtiene un cliente por ID
   */
  async getClientById(id: string): Promise<Tables<"clients"> | null> {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error getting client:", error);
      return null;
    }

    return data;
  }
};
