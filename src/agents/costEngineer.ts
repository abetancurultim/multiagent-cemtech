import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { AgentState } from "./agentState"; // Asegúrate de que la ruta sea correcta
import { lookupItemTool, addQuoteItemTool } from "../tools/costTools";
import { supabase } from "../config/supabase";
import { SystemMessage } from "@langchain/core/messages";

const llm = new ChatOpenAI({ 
    model: "gpt-5-mini-2025-08-07",
});

// 2. Definir las Herramientas disponibles
const tools = [lookupItemTool, addQuoteItemTool];

// 3. El System Prompt (La personalidad del Ingeniero)
const SYSTEM_PROMPT = `You are the Senior Cost Engineer at Cemtech, a concrete contractor in Atlanta.
Your goal is to generate accurate quotes based on the user's requests.

### CRITICAL INSTRUCTIONS:
1. **Identify the Need**: If the user asks for "sidewalks", "pads", or "curbs", ALWAYS use 'lookup_item' first to find the correct ID in the database.
2. **Clarify**: If the user is vague (e.g., "I need concrete"), ask for specifics (thickness, usage) based on the items you found.
3. **Quote**: Once you have the Item ID and Quantity, use 'add_quote_item' to calculate the cost.
4. **Estimation Context**: You must always have an active 'estimation_id'. 
   - The system will provide one in the state. 
   - If 'add_quote_item' fails asking for an estimation ID, ask the user to start a new estimation.

### RULES:
- NEVER invent prices. Always use the tools.
- NEVER do math yourself for prices. Use 'add_quote_item'.
- Speak professionally but directly (Construction industry style).
- All currency is USD.
`;

// 4. Nodo Ensure Estimation (AHORA INYECTA EL ID COMO MENSAJE)
async function ensureEstimationNode(state: typeof AgentState.State) {
    let estimationId = state.activeEstimationId;
    let clientId = state.activeClientId;

    // 1. Ensure Client
    if (!clientId || clientId === "no-client-id") {
        console.log("⚠️ No active client. Creating Default Client...");
        
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .insert({ name: 'Default Client', email: 'default@example.com' } as any)
            .select('id')
            .single<{ id: string }>();
        
        if (clientError || !clientData) return { messages: [new SystemMessage("Error creating client DB.")] };
        clientId = clientData.id;
    }

    // 2. Ensure Estimation
    if (!estimationId || estimationId === "no-estimation-id") {
        console.log("⚠️ No active estimation. Creating Draft Estimation...");
        
        const { data: estData, error: estError } = await supabase
            .from('estimations')
            .insert({ 
                client_id: clientId,
                status: 'draft',
                net_total: 0
            } as any)
            .select('id')
            .single<{ id: string }>();
        
        if (estError || !estData) return { messages: [new SystemMessage("Error creating estimation DB.")] };
        estimationId = estData.id;
    }

    // 🔥 TRUCO: Devolvemos el ID en el estado Y un mensaje explícito para el LLM
    return { 
        activeClientId: clientId,
        activeEstimationId: estimationId,
        messages: [
            new SystemMessage(`SYSTEM UPDATE: The ACTIVE ESTIMATION ID is "${estimationId}". Use this UUID for 'add_quote_item'.`)
        ]
    };
}

// 5. Workflow del Agente (Simplificado)
const costEngineerWorkflow = createReactAgent({
  llm,
  tools,
  stateModifier: SYSTEM_PROMPT, // Volvemos al prompt estático, el ID viene en los mensajes
});

export { costEngineerWorkflow, ensureEstimationNode };