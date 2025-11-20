import { costEngineerWorkflow, ensureProjectNode } from "./agents/costEngineer.js";
import { HumanMessage } from "@langchain/core/messages";
import { AgentState } from "./agents/agentState.js";
import { StateGraph } from "@langchain/langgraph";

async function main() {
  console.log("🚀 Iniciando Test Fase 1: Cost Engineer...\n");

  // 1. Montamos un grafo pequeño solo para probar este agente con la inyección de proyecto
  const workflow = new StateGraph(AgentState)
    .addNode("ensure_project", ensureProjectNode)
    .addNode("engineer", costEngineerWorkflow)
    .addEdge("__start__", "ensure_project")
    .addEdge("ensure_project", "engineer")
    .addEdge("engineer", "__end__"); // En la app real, esto volvería al Supervisor

  const app = workflow.compile();

  // 2. Simulamos una conversación
  // El usuario pide algo vago primero, luego específico.
  const inputs = {
    messages: [
      new HumanMessage("Add exactly 600 SF of 4in Sidewalk (Code: CEM-SW-4IN) to the project. No questions, just do it."),
    ],
    activeProjectId: "no-project-id" // Forzamos a que cree uno nuevo
  };

  console.log("👤 User: Add exactly 600 SF of 4in Sidewalk (Code: CEM-SW-4IN) to the project. No questions, just do it.");
  
  const config = { configurable: { thread_id: "test-thread-1" } };

  // Ejecutamos el stream para ver qué hace
  const stream = await app.stream(inputs, config);

  for await (const chunk of stream) {
    const nodeName = Object.keys(chunk)[0];
    const content = chunk[nodeName];

    console.log(`\n--- 🔄 Step: ${nodeName} ---`);
    
    if (nodeName === "engineer") {
        // Ver los mensajes del agente
        const lastMsg = content.messages[content.messages.length - 1];
        if (lastMsg.tool_calls?.length > 0) {
             console.log(`🛠️ TOOL CALL: ${lastMsg.tool_calls[0].name}`);
             console.log(`   Args: ${JSON.stringify(lastMsg.tool_calls[0].args)}`);
        } else {
             console.log(`🤖 Agent:\n${lastMsg.content}`);
        }
    }
    
    if (content.activeProjectId) {
        console.log(`💾 State Updated: Project ID = ${content.activeProjectId}`);
    }
  }
}

main().catch(console.error);