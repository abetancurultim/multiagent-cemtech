import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { crmService } from "../services/crmService";
import { estimationService } from "../services/estimationService";
import { catalogService } from "../services/catalogService";

/**
 * Tool to lookup a client by name or create a new one if not found.
 * Updates the agent state with the active client ID.
 */
export const lookupOrCreateClientTool = tool(
  async ({ name, email, phone, createIfMissing }: { name: string, email?: string, phone?: string, createIfMissing: boolean }) => {
    console.log(`Looking up client: ${name}`);
    
    // 1. Search for existing client
    const clients = await crmService.findClientByName(name);
    
    if (clients.length > 0) {
      // Found matches
      const bestMatch = clients[0]; // Simplification: take the first one
      return {
        message: `Found client: ${bestMatch.name}`,
        client: bestMatch,
        found: true,
        action: "set_active_client",
        clientId: bestMatch.id
      };
    }

    // 2. If not found and requested to create
    if (createIfMissing) {
      console.log(`Creating new client: ${name}`);
      const newClient = await crmService.createClient({
        name,
        email,
        phone
      });
      
      return {
        message: `Created new client: ${newClient.name}`,
        client: newClient,
        found: true,
        created: true,
        action: "set_active_client",
        clientId: newClient.id
      };
    }

    // 3. Not found and not creating
    return {
      message: `Client '${name}' not found. Ask the user if they want to create it.`,
      found: false
    };
  },
  {
    name: "lookup_or_create_client",
    description: "Search for a client by name. If not found, can create a new one. Returns client details and ID.",
    schema: z.object({
      name: z.string().describe("Name of the client or company to search for"),
      email: z.string().optional().describe("Email of the client (for creation)"),
      phone: z.string().optional().describe("Phone number of the client (for creation)"),
      createIfMissing: z.boolean().default(false).describe("Set to true if you want to create the client if it doesn't exist")
    })
  }
);

/**
 * Tool to manage the quote context (create new or resume draft).
 */
export const manageQuoteContextTool = tool(
  async ({ clientId, action, notes }: { clientId: string, action: "check_draft" | "create_new", notes?: string }) => {
    
    if (action === "check_draft") {
      const draft = await estimationService.findDraftEstimation(clientId);
      if (draft) {
        return {
          message: `Found an existing draft quote #${draft.sequential_number} from ${new Date(draft.created_at!).toLocaleDateString()}.`,
          estimation: draft,
          hasDraft: true,
          action: "ask_user_preference", // Ask user if they want to resume or create new
          estimationId: draft.id
        };
      } else {
        return {
          message: "No draft quote found for this client.",
          hasDraft: false
        };
      }
    }

    if (action === "create_new") {
      const newQuote = await estimationService.createEstimation(clientId, notes);
      return {
        message: `Created new quote #${newQuote.sequential_number}.`,
        estimation: newQuote,
        action: "set_active_estimation",
        estimationId: newQuote.id
      };
    }
  },
  {
    name: "manage_quote_context",
    description: "Check for existing draft quotes or create a new quote for a client.",
    schema: z.object({
      clientId: z.string().describe("The UUID of the client"),
      action: z.enum(["check_draft", "create_new"]).describe("Action to perform: check for draft or create new"),
      notes: z.string().optional().describe("Initial notes for the new quote")
    })
  }
);

/**
 * Tool to search for items and add them to the active quote.
 */
export const searchAndAddItemTool = tool(
  async ({ estimationId, searchQuery, quantity, unitOverride }: { estimationId: string, searchQuery: string, quantity: number, unitOverride?: string }) => {
    
    // 1. Search catalog
    const items = await catalogService.searchCatalogItems(searchQuery);
    
    if (items.length === 0) {
      return {
        message: `No items found matching '${searchQuery}'. Please ask for a more specific name or create a custom item.`,
        added: false
      };
    }

    // 2. Select best match (simplification: first one)
    // In a real scenario, we might ask the user to clarify if multiple matches
    const selectedItem = items[0];

    // 3. Add to estimation
    const addedItem = await estimationService.addItemToEstimation(estimationId, {
      itemId: selectedItem.id,
      description: selectedItem.name!, // Use catalog name
      quantity: quantity,
      unit: unitOverride || selectedItem.unit!,
      unitCost: selectedItem.unit_cost!,
      categoryId: selectedItem.category_id!
    });

    return {
      message: `Added '${selectedItem.name}' to quote. Quantity: ${quantity} ${addedItem.unit}. Total: $${addedItem.line_total}`,
      added: true,
      item: addedItem
    };
  },
  {
    name: "search_and_add_item",
    description: "Search for an item in the catalog and add it to the active quote.",
    schema: z.object({
      estimationId: z.string().describe("The UUID of the active quote"),
      searchQuery: z.string().describe("Name or description of the item to search for (e.g. 'concrete', 'rebar')"),
      quantity: z.number().describe("Quantity to add"),
      unitOverride: z.string().optional().describe("Optional unit override (e.g. 'SF', 'LF')")
    })
  }
);

export const crmTools = [
  lookupOrCreateClientTool,
  manageQuoteContextTool,
  searchAndAddItemTool
];
