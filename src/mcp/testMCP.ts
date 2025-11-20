import { mcpAdapter, initializeMCP } from "./adapters/mcpAdapter.js";

/**
 * Script de prueba para verificar el funcionamiento de los servidores MCP
 */
async function testMCPServers() {
  console.log("🧪 INICIANDO PRUEBAS DE SERVIDORES MCP");
  console.log("=====================================\n");

  try {
    // 1. Inicializar el adaptador MCP
    console.log("1️⃣ Inicializando adaptador MCP...");
    const adapter = await initializeMCP();

    // 2. Verificar conexión
    console.log(`✅ Estado de conexión: ${adapter.isConnected()}`);

    // 3. Obtener estadísticas
    console.log("\n2️⃣ Obteniendo estadísticas...");
    const stats = await adapter.getStats();
    console.log("📊 Estadísticas MCP:", JSON.stringify(stats, null, 2));

    // 4. Listar herramientas disponibles
    console.log("\n3️⃣ Listando herramientas disponibles...");
    await adapter.listAvailableTools();

    // 5. Probar herramientas del servidor de ventas
    console.log("4️⃣ PROBANDO SERVIDOR DE VENTAS");
    console.log("==============================");

    try {
      console.log("\n🛍️ Probando: get_product_catalog");
      const catalogResult = await adapter.invokeTool("get_product_catalog", {
        category: "camaras",
        inStock: true,
      });
      console.log("📋 Resultado catálogo:", catalogResult);

      console.log("\n💰 Probando: calculate_quote");
      const quoteResult = await adapter.invokeTool("calculate_quote", {
        productId: "CAM001",
        quantity: 5,
        customerType: "empresarial",
        includeInstallation: true,
      });
      console.log("📋 Resultado cotización:", quoteResult);
    } catch (error) {
      console.error("❌ Error en pruebas de ventas:", error);
    }

    // 6. Probar herramientas del servidor técnico
    console.log("\n5️⃣ PROBANDO SERVIDOR TÉCNICO");
    console.log("============================");

    try {
      console.log("\n🔧 Probando: diagnose_technical_issue");
      const diagnosisResult = await adapter.invokeTool(
        "diagnose_technical_issue",
        {
          issueDescription: "La cámara no enciende y no responde",
          productModel: "CAM001",
          symptoms: ["no enciende", "sin luces"],
          urgency: "alta",
        }
      );
      console.log("📋 Resultado diagnóstico:", diagnosisResult);

      console.log("\n🛡️ Probando: check_warranty_status");
      const warrantyResult = await adapter.invokeTool("check_warranty_status", {
        serialNumber: "CAM001-2023-001234",
        productModel: "CAM001",
        purchaseDate: "2023-06-15",
      });
      console.log("📋 Resultado garantía:", warrantyResult);
    } catch (error) {
      console.error("❌ Error en pruebas técnicas:", error);
    }

    // 7. Probar herramientas del servidor de atención al cliente
    console.log("\n6️⃣ PROBANDO SERVIDOR DE ATENCIÓN AL CLIENTE");
    console.log("===========================================");

    try {
      console.log("\n❓ Probando: search_faq");
      const faqResult = await adapter.invokeTool("search_faq", {
        query: "formas de pago",
        category: "pagos",
      });
      console.log("📋 Resultado FAQ:", faqResult);

      console.log("\n📦 Probando: track_order");
      const trackResult = await adapter.invokeTool("track_order", {
        identifier: "ORD-2024-001",
      });
      console.log("📋 Resultado seguimiento:", trackResult);

      console.log("\n🏢 Probando: get_company_info");
      const infoResult = await adapter.invokeTool("get_company_info", {
        infoType: "contacto",
      });
      console.log("📋 Resultado información:", infoResult);
    } catch (error) {
      console.error("❌ Error en pruebas de atención al cliente:", error);
    }

    // 8. Obtener información de cada servidor
    console.log("\n7️⃣ INFORMACIÓN DETALLADA DE SERVIDORES");
    console.log("======================================");

    const servers = ["sales", "technical", "customer"] as const;

    for (const serverName of servers) {
      try {
        console.log(`\n📊 Servidor: ${serverName.toUpperCase()}`);
        const serverInfo = await adapter.getServerInfo(serverName);
        console.log(`   🔧 Herramientas: ${serverInfo.toolCount}`);
        console.log("   📋 Lista de herramientas:");
        serverInfo.tools.forEach((tool, index) => {
          console.log(`      ${index + 1}. ${tool.name}: ${tool.description}`);
        });
      } catch (error) {
        console.error(
          `❌ Error obteniendo info del servidor ${serverName}:`,
          error
        );
      }
    }

    // 9. Estadísticas finales
    console.log("\n8️⃣ ESTADÍSTICAS FINALES");
    console.log("=======================");
    const finalStats = await adapter.getStats();
    console.log(
      "📈 Estadísticas finales:",
      JSON.stringify(finalStats, null, 2)
    );

    console.log("\n✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE");
  } catch (error) {
    console.error("❌ Error durante las pruebas:", error);
    throw error;
  } finally {
    // Limpiar conexiones
    console.log("\n🧹 Limpiando conexiones...");
    try {
      await mcpAdapter.disconnect();
      console.log("✅ Conexiones cerradas correctamente");
    } catch (error) {
      console.error("❌ Error cerrando conexiones:", error);
    }
  }
}

/**
 * Función para probar un servidor específico
 */
async function testSpecificServer(
  serverName: "sales" | "technical" | "customer"
) {
  console.log(`🧪 PROBANDO SERVIDOR: ${serverName.toUpperCase()}`);
  console.log("=".repeat(30 + serverName.length));

  try {
    const adapter = await initializeMCP();
    const tools = await adapter.getToolsByServer(serverName);

    console.log(
      `🛠️ Herramientas disponibles en ${serverName}: ${tools.length}`
    );

    tools.forEach((tool, index) => {
      console.log(`${index + 1}. 🔧 ${tool.name}`);
      console.log(`   📝 ${tool.description}`);
      console.log("");
    });

    // Probar una herramienta específica según el servidor
    if (serverName === "sales") {
      const result = await adapter.invokeTool("get_product_catalog", {
        category: "todos",
      });
      console.log("📋 Resultado de prueba:", result);
    } else if (serverName === "technical") {
      const result = await adapter.invokeTool("get_technical_manual", {
        productModel: "CAM001",
        documentType: "manual_usuario",
      });
      console.log("📋 Resultado de prueba:", result);
    } else if (serverName === "customer") {
      const result = await adapter.invokeTool("search_faq", {
        query: "garantía",
        category: "garantias",
      });
      console.log("📋 Resultado de prueba:", result);
    }
  } catch (error) {
    console.error(`❌ Error probando servidor ${serverName}:`, error);
  } finally {
    await mcpAdapter.disconnect();
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    const serverName = args[0] as "sales" | "technical" | "customer";
    if (["sales", "technical", "customer"].includes(serverName)) {
      await testSpecificServer(serverName);
    } else {
      console.error("❌ Servidor no válido. Use: sales, technical, o customer");
      process.exit(1);
    }
  } else {
    await testMCPServers();
  }
}

// Ejecutar si es el archivo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("💥 Error fatal en las pruebas:", error);
    process.exit(1);
  });
}

export { testMCPServers, testSpecificServer };
