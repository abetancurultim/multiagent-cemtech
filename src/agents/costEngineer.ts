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
1. **Identify the Need**: If the user asks for "sidewalks", "pads", or "curbs", ALWAYS use 'lookup_item' first to find the correct CODE in the database.
2. **Clarify**: If the user is vague (e.g., "I need concrete"), ask for specifics (thickness, usage) based on the items you found.
3. **Quote**: Once you have the Item Code and Quantity, use 'add_quote_item' to calculate the cost.
4. **Project Context**: You must always have an active 'project_id'. 
   - The system will provide one in the state. 
   - If 'add_quote_item' fails asking for a project ID, ask the user to start a new project.

### RULES:
- NEVER invent prices. Always use the tools.
- NEVER do math yourself for prices. Use 'add_quote_item'.
- Speak professionally but directly (Construction industry style).
- All currency is USD.
`;

// 4. Función auxiliar: "Node" para asegurar que exista un proyecto (Autocorrección)
// Si el estado no tiene proyecto, crea uno "Borrador" automáticamente.
async function ensureProjectNode(state: typeof AgentState.State) {
    if (state.activeProjectId && state.activeProjectId !== "no-project-id") {
        return {}; // Ya tenemos proyecto, no hacemos nada
    }

    console.log("⚠️ No active project found. Creating a Draft Project automatically...");
    
    const { data, error } = await supabase
        .from('projects')
        .insert({ 
            name: 'Draft Estimate (Auto-created)', 
            status: 'draft',
            user_phone: 'test-user' 
        } as any)
        .select('id')
        .single();
    
    if (error || !data) {
        return { messages: [new SystemMessage("SYSTEM ERROR: Could not create a project container in Supabase.")] };
    }

    const projectData = data as any;
    console.log(`✅ Created Draft Project ID: ${projectData.id}`);
    return { activeProjectId: projectData.id };
}

// 5. Construimos el Grafo del Agente
// Usamos createReactAgent pero le inyectamos un paso previo para validar el Proyecto
const costEngineerWorkflow = createReactAgent({
  llm,
  tools,
  stateModifier: SYSTEM_PROMPT,
});

export { costEngineerWorkflow, ensureProjectNode };