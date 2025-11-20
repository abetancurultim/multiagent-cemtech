import { graph } from "./supervisor";
import { HumanMessage } from "@langchain/core/messages";

async function runChat(userContext: string, input: string) {
  console.log(`\n\n🚀 TEST SCENARIO: ${userContext}`);
  console.log(`👤 User: "${input}"`);

  const inputs = {
    messages: [new HumanMessage(input)],
    activeProjectId: "no-project-id"
  };

  const config = { configurable: { thread_id: "supervisor-test-" + Date.now() } };
  const stream = await graph.stream(inputs, config);

  for await (const chunk of stream) {
    const nodeName = Object.keys(chunk)[0];
    const content = chunk[nodeName];

    // Mostramos solo eventos clave para no ensuciar la consola
    if (nodeName === "supervisor") {
        if (content.next === "FINISH") {
            console.log(`🤖 Supervisor replied directly: "${content.messages[0].content}"`);
        } else {
            console.log(`🔀 Supervisor routed request to: [${content.next}]`);
        }
    }
    
    if (nodeName === "cost_engineer") {
        const lastMsg = content.messages[content.messages.length - 1];
        if (lastMsg.tool_calls?.length > 0) {
             console.log(`🛠️ Cost Engineer is calling tool: ${lastMsg.tool_calls[0].name}`);
        } else {
             console.log(`👷 Cost Engineer says: "${lastMsg.content}"`);
        }
    }
  }
}

async function main() {
  // Caso 1: Saludo (No debería activar al Ingeniero)
  await runChat("General Greeting", "Hello, who are you?");

  // Caso 2: Cotización (Debería activar al Ingeniero y calcular)
  await runChat("Quote Request", "I need a price for 100 SF of 4in sidewalk (CEM-SW-4IN). Just do it.");
}

main().catch(console.error);