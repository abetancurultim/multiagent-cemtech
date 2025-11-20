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

// 4. Nodo Ensure Project (AHORA INYECTA EL ID COMO MENSAJE)
async function ensureProjectNode(state: typeof AgentState.State) {
    let projectId = state.activeProjectId;

    if (!projectId || projectId === "no-project-id") {
        console.log("⚠️ No active project. Creating Draft Estimate...");
        
        type ProjectInsert = {
            name?: string | null;
            status: string;
            user_phone?: string | null;
        };
        
        const newProject: ProjectInsert = { 
            name: 'Draft Estimate (Auto)', 
            status: 'draft', 
            user_phone: 'test-user' 
        };
        
        const { data, error } = await supabase
            .from('projects')
            .insert(newProject)
            .select('id')
            .single<{ id: string }>();
        
        if (error || !data) return { messages: [new SystemMessage("Error creating project DB.")] };
        projectId = data.id;
    }

    // 🔥 TRUCO: Devolvemos el ID en el estado Y un mensaje explícito para el LLM
    return { 
        activeProjectId: projectId,
        messages: [
            new SystemMessage(`SYSTEM UPDATE: The ACTIVE PROJECT ID is "${projectId}". Use this UUID for all DB tools.`)
        ]
    };
}

// 5. Workflow del Agente (Simplificado)
const costEngineerWorkflow = createReactAgent({
  llm,
  tools,
  stateModifier: SYSTEM_PROMPT, // Volvemos al prompt estático, el ID viene en los mensajes
});

export { costEngineerWorkflow, ensureProjectNode };