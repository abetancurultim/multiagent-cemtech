import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { searchItemsInDB, calculateAndAddQuoteItem } from "../functions/costFunctions";

/**
 * Tool Wrapper: Lookup
 */
export const lookupItemTool = tool(
  async ({ query }) => {
    // Simplemente llamamos a la función externa
    return await searchItemsInDB(query);
  },
  {
    name: "lookup_item",
    description: "Search the price book (assemblies) by name or code. Returns list of valid codes.",
    schema: z.object({
      query: z.string().describe("Search term (e.g., 'sidewalk')"),
    }),
  }
);

/**
 * Tool Wrapper: Add Item
 */
export const addQuoteItemTool = tool(
  async ({ project_id, assembly_code, quantity }) => {
    // Llamada limpia a la lógica
    return await calculateAndAddQuoteItem(project_id, assembly_code, quantity);
  },
  {
    name: "add_quote_item",
    description: "Calculates cost and adds an item to the current quote. REQUIRES valid project_id and assembly CODE.",
    schema: z.object({
      project_id: z.string().uuid(),
      assembly_code: z.string(),
      quantity: z.number(),
    }),
  }
);