import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { AgentState } from "./agents/agentState";
import { costEngineerWorkflow, ensureProjectNode } from "./agents/costEngineer";

/**
 * 🧠 EL SUPERVISOR
 * Analiza la intención del usuario y decide:
 * 1. ¿Es sobre costos/cotizaciones? -> Manda al 'cost_engineer'
 * 2. ¿Es saludo/pregunta general? -> Responde él mismo.
 */

const supervisorModel = new ChatOpenAI({ 
  model: "gpt-5-nano-2025-08-07",
});

const SUPERVISOR_PROMPT = `You are the Lead Supervisor at Cemtech AI.
Your goal is to route user requests to the correct specialist or answer general questions yourself.

### WORKERS:
1. **cost_engineer**: Handles calculating prices, quotes, adding items (sidewalks, curbs, pads), or looking up materials.

### ROUTING LOGIC:
- If the user mentions "price", "quote", "estimate", "cost", "sidewalk", "concrete", "add item", or specific measurements -> RETURN JSON: { "next": "cost_engineer" }
- If the user says "Hello", "Who are you?", or general chat -> RETURN JSON: { "next": "FINISH", "reply": "Your friendly greeting here" }

You must always return JSON.
`;

// Nodo del Supervisor
async function supervisorNode(state: typeof AgentState.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  // Pedimos al LLM que decida en formato JSON
  const response = await supervisorModel.invoke([
    new SystemMessage(SUPERVISOR_PROMPT),
    lastMessage
  ]);

  let decision;
  try {
    // Limpiamos el string por si el LLM mete markdown ```json ... ```
    const cleanJson = response.content.toString().replace(/```json|```/g, '').trim();
    decision = JSON.parse(cleanJson);
  } catch (e) {
    console.log("⚠️ Error parsing supervisor JSON, defaulting to cost_engineer");
    decision = { next: "cost_engineer" };
  }

  if (decision.next === "cost_engineer") {
      console.log("🔀 Supervisor: Routing to Cost Engineer");
      return { next: "cost_engineer" };
  }

  // Si decide responder él mismo (FINISH)
  return { 
      next: "FINISH", 
      messages: [new HumanMessage(decision.reply || "Hello! How can I help with your concrete project?")] 
  };
}

// Construcción del Grafo Maestro
const workflow = new StateGraph(AgentState)
  // Definimos los Nodos
  .addNode("ensure_project", ensureProjectNode) // 1. Siempre revisamos que haya proyecto
  .addNode("supervisor", supervisorNode)        // 2. El jefe decide
  .addNode("cost_engineer", costEngineerWorkflow) // 3. El experto trabaja

  // Definimos las Conexiones (Edges)
  .addEdge("__start__", "ensure_project") 
  .addEdge("ensure_project", "supervisor")
  
  // Lógica Condicional del Supervisor
  .addConditionalEdges(
      "supervisor", 
      (x: any) => x.next,
      {
        "cost_engineer": "cost_engineer",
        "FINISH": END
      }
  )

  // El Cost Engineer termina su turno y volvemos a END (o al supervisor en futuros ciclos)
  .addEdge("cost_engineer", END);

export const graph = workflow.compile();