import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { AgentState } from "./agents/agentState";
import { costEngineerWorkflow, ensureProjectNode } from "./agents/costEngineer";

/**
 * 🧠 EL SUPERVISOR (ROUTER)
 * Versión Final: Saludo estandarizado para evitar errores de generación.
 */

const supervisorModel = new ChatOpenAI({ 
    model: "gpt-4o", 
    temperature: 0 
});

const SUPERVISOR_PROMPT = `You are the Lead Supervisor at Cemtech AI.
Your goal is to route user requests to the correct specialist or answer general questions yourself.

### WORKERS:
1. **cost_engineer**: The SPECIALIST for costs, prices, quotes, estimates, materials (concrete, rebar), and adding items (sidewalks, curbs, pads, bollards).

### DECISION LOGIC (Follow Strictly):

**CASE 1: COST ENGINEER**
IF the user mentions:
- "price", "quote", "estimate", "cost", "how much"
- Specific items: "sidewalk", "concrete", "curb", "pad", "ramp", "bollard"
- Actions: "add item", "calculate", "do it", "run numbers"
-> RETURN JSON: { "next": "cost_engineer" }

**CASE 2: GENERAL CHAT**
IF the user says "Hello", "Hi", "Who are you?", "Thanks", or "Help":
-> RETURN JSON: { "next": "FINISH", "reply": "Hello! I am Cemtech AI, your automated cost estimator. I can help you quote sidewalks, curbs, pads, and more. How can I help you today?" }

**IMPORTANT:**
- You MUST return ONLY a valid JSON object.
- If the request implies ANY calculation or database lookup, route to 'cost_engineer'.
`;

// Nodo del Supervisor
async function supervisorNode(state: typeof AgentState.State) {
  const messages = state.messages;
  
  // Buscamos el último mensaje HUMANO para ignorar inyecciones de sistema
  const lastHumanMessage = messages.slice().reverse().find(m => m._getType() === "human");
  const messageToAnalyze = lastHumanMessage || messages[messages.length - 1];

  console.log(`🧐 Supervisor analyzing: "${messageToAnalyze.content.slice(0, 50)}..."`);

  const response = await supervisorModel.invoke([
    new SystemMessage(SUPERVISOR_PROMPT),
    messageToAnalyze
  ]);

  let decision;
  try {
    const cleanJson = response.content.toString()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
    
    decision = JSON.parse(cleanJson);
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.log(`⚠️ JSON Parse Error: ${errorMessage}`);
    // Ante la duda, asumir que es trabajo para el ingeniero
    decision = { next: "cost_engineer" };
  }

  if (decision.next === "cost_engineer") {
      console.log("🔀 Supervisor Decision: -> [Cost Engineer]");
      return { next: "cost_engineer" };
  }

  console.log("🔀 Supervisor Decision: -> [Direct Reply]");
  return { 
      next: "FINISH", 
      messages: [new HumanMessage(decision.reply || "I can help with concrete quotes.")] 
  };
}

// Construcción del Grafo Maestro
const workflow = new StateGraph(AgentState)
  .addNode("ensure_project", ensureProjectNode)
  .addNode("supervisor", supervisorNode)
  .addNode("cost_engineer", costEngineerWorkflow)

  .addEdge("__start__", "ensure_project")
  .addEdge("ensure_project", "supervisor")
  
  .addConditionalEdges(
      "supervisor", 
      (x: typeof AgentState.State) => x.next, 
      {
          "cost_engineer": "cost_engineer",
          "FINISH": END
      }
  )

  .addEdge("cost_engineer", END);

export const graph = workflow.compile();