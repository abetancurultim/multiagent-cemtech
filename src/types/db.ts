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
      };
      assemblies: {
        Row: {
          id: number;
          code: string;
          description: string;
          unit: string;
        };
      };
      assembly_resources: {
        Row: {
          id: number;
          assembly_id: number;
          resource_id: number;
          quantity: number;
        };
      };
      projects: {
        Row: {
          id: string; // UUID
          name: string | null;
          status: string;
          user_phone: string | null;
          created_at: string;
        };
      };
      project_items: {
        Row: {
          id: number;
          project_id: string;
          assembly_id: number;
          quantity: number;
          calculated_cost: number | null;
        };
      };
    };
  };
}