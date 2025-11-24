import { supabase } from "../config/supabase";

/**
 * Lógica Pura: Buscar Ítems
 */
export async function searchItemsInDB(query: string): Promise<string> {
  console.log(`🔍 [Function] Searching: ${query}`);

  const { data, error } = await supabase
    .from('items')
    .select('id, name, unit, unit_cost')
    .ilike('name', `%${query}%`)
    .limit(5);

  if (error) return `Error connecting to DB: ${error.message}`;
  if (!data || data.length === 0) return "No items found. Try 'sidewalk', 'curb', 'pad'.";

  return data.map((item: any) => 
    `🆔 ID: ${item.id} | NAME: ${item.name} | UNIT: ${item.unit} | COST: $${item.unit_cost}`
  ).join('\n');
}

/**
 * Lógica Pura: Cotizar e Insertar
 */
export async function calculateAndAddQuoteItem(
  estimationId: string, 
  itemId: number, 
  quantity: number
): Promise<string> {
  console.log(`➕ [Function] Adding Item ID: ${itemId} x ${quantity} to Estimation: ${estimationId}`);

  // 1. Obtener Item
  const { data: item, error: itemError } = await supabase
    .from('items')
    .select('name, unit, unit_cost')
    .eq('id', itemId)
    .single();

  if (itemError || !item) return `Error: Item ID '${itemId}' not found in DB.`;

  const unitCost = item.unit_cost || 0;
  const lineTotal = unitCost * quantity;

  // 2. Guardar en estimation_items
  const { error: saveError } = await supabase
    .from('estimation_items')
    .insert({
      estimation_id: estimationId,
      item_id: itemId,
      description: item.name,
      quantity: quantity,
      unit: item.unit,
      unit_cost: unitCost,
      line_total: lineTotal
    });

  if (saveError) return `Error saving to Quote: ${saveError.message}`;

  return `✅ SUCCESS: Added ${quantity} ${item.unit} of "${item.name}".\n   - Unit Cost: $${unitCost.toFixed(2)}\n   - Total Line: $${lineTotal.toFixed(2)}`;
}