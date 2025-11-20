import { graph } from "./supervisor";
import { HumanMessage } from "@langchain/core/messages";

async function testAgents() {
  console.log("🚀 Iniciando pruebas de agentes multiagente...\n");

  const config = {
    configurable: {
      thread_id: `test-${Date.now()}`,
      phone_number: "test-user",
    },
  };

  const testCases = [
    {
      name: "Ventas",
      message:
        "Hola, necesito información sobre una amasadora para mi panadería",
      emoji: "💰",
    },
    {
      name: "Soporte Técnico",
      message:
        "Mi amasadora IA-Mixer 60 no arranca, el motor hace ruido pero no gira",
      emoji: "🔧",
    },
    {
      name: "Atención al Cliente",
      message: "Quiero presentar una queja sobre mi pedido, llegó dañado",
      emoji: "📞",
    },
  ];

  for (const testCase of testCases) {
    try {
      console.log(`${testCase.emoji} Probando ${testCase.name}...`);
      console.log(`Mensaje: "${testCase.message}"`);

      const result = await graph.invoke(
        {
          messages: [new HumanMessage({ content: testCase.message })],
        },
        config
      );

      const lastMessage = result.messages[result.messages.length - 1];
      const agentName = lastMessage.name || "Supervisor";

      console.log(`✅ Respuesta de ${agentName}:`);
      console.log(`${lastMessage.content.substring(0, 200)}...`);
      console.log("─".repeat(50));
    } catch (error) {
      console.error(`❌ Error en prueba de ${testCase.name}:`, error);
    }
  }

  console.log("\n🎉 Pruebas completadas!");
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  testAgents();
}

export { testAgents };
