import { supabase } from "../config/supabase";

/**
 * Lógica Pura: Buscar Ítems
 */
export async function searchItemsInDB(query: string): Promise<string> {
  console.log(`🔍 [Function] Searching: ${query}`);

  const { data, error } = await supabase
    .from('assemblies')
    .select('id, code, description, unit')
    .or(`description.ilike.%${query}%,code.ilike.%${query}%`)
    .limit(5);

  if (error) return `Error connecting to DB: ${error.message}`;
  if (!data || data.length === 0) return "No items found. Try 'sidewalk', 'curb', 'pad'.";

  return data.map((item: any) => 
    `🆔 ID: ${item.id} | CODE: ${item.code} | DESC: ${item.description} | UNIT: ${item.unit}`
  ).join('\n');
}

/**
 * Lógica Pura: Cotizar e Insertar
 */
export async function calculateAndAddQuoteItem(
  projectId: string, 
  assemblyCode: string, 
  quantity: number
): Promise<string> {
  console.log(`➕ [Function] Adding: ${assemblyCode} x ${quantity}`);

  // 1. Obtener Assembly y Recetas
  // Usamos 'as any' aquí para cortar el problema de tipos de raíz dentro de la función
  const { data: rawData, error: asmError } = await supabase
    .from('assemblies')
    .select(`
      id, description, unit,
      assembly_resources (
        quantity,
        resources (cost_per_unit)
      )
    `)
    .eq('code', assemblyCode)
    .single();

  if (asmError || !rawData) return `Error: Code '${assemblyCode}' not found in DB.`;

  const assembly = rawData as any;

  // 2. Calcular Costo
  let unitCost = 0;
  if (assembly.assembly_resources) {
    for (const res of assembly.assembly_resources) {
      const cost = res.resources?.cost_per_unit || 0;
      const qty = res.quantity || 0;
      unitCost += (cost * qty);
    }
  }

  const totalCost = unitCost * quantity;

  // 3. Guardar en project_items
  const { error: saveError } = await supabase
    .from('project_items')
    .insert({
      project_id: projectId,
      assembly_id: assembly.id,
      quantity: quantity,
      calculated_cost: totalCost
    } as any);

  if (saveError) return `Error saving to Quote: ${saveError.message}`;

  return `✅ SUCCESS: Added ${quantity} ${assembly.unit} of "${assembly.description}".\n   - Unit Cost: $${unitCost.toFixed(2)}\n   - Total Line: $${totalCost.toFixed(2)}`;
}