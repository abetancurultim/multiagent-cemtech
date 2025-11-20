import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { z } from "zod";

const safeEnv = Object.fromEntries(
  Object.entries(process.env).filter(([_, v]) => v !== undefined)
) as Record<string, string>;

/**
 * Adaptador MCP para LangChain
 * Conecta múltiples servidores MCP especializados con LangChain
 */
export class MCPAdapter {
  private client: MultiServerMCPClient | null = null;
  private isInitialized = false;

  /**
   * Configuración de servidores MCP
   */
  private readonly serverConfigs = {
    // Servidor de ventas
    sales: {
      command: "node",
      args: ["src/mcp/servers/salesServer.ts"],
      env: safeEnv,
    },
    // Servidor técnico
    technical: {
      command: "node",
      args: ["src/mcp/servers/technicalServer.ts"],
      env: safeEnv,
    },
    // Servidor de atención al cliente
    customer: {
      command: "node",
      args: ["src/mcp/servers/customerServer.ts"],
      env: safeEnv,
    },
  };

  /**
   * Inicializa el cliente MCP con todos los servidores
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("🔄 Cliente MCP ya inicializado");
      return;
    }

    try {
      console.log("🚀 Inicializando cliente MCP...");

      this.client = new MultiServerMCPClient(this.serverConfigs);

      this.isInitialized = true;
      console.log("✅ Cliente MCP inicializado correctamente");

      // Listar herramientas disponibles para debug
      await this.listAvailableTools();
    } catch (error) {
      console.error("❌ Error inicializando cliente MCP:", error);
      throw new Error(`Failed to initialize MCP client: ${error}`);
    }
  }

  /**
   * Obtiene las herramientas MCP como herramientas de LangChain
   */
  async getTools() {
    if (!this.client || !this.isInitialized) {
      throw new Error("MCP client not initialized. Call initialize() first.");
    }

    try {
      // Obtener herramientas de todos los servidores conectados
      const tools = await this.client.getTools();

      console.log(`🛠️ Herramientas MCP disponibles: ${tools.length}`);

      return tools;
    } catch (error) {
      console.error("❌ Error obteniendo herramientas MCP:", error);
      throw error;
    }
  }

  /**
   * Obtiene herramientas específicas por servidor
   */
  async getToolsByServer(serverName: keyof typeof this.serverConfigs) {
    if (!this.client || !this.isInitialized) {
      throw new Error("MCP client not initialized. Call initialize() first.");
    }

    try {
      const allTools = await this.client.getTools();

      // Filtrar herramientas por servidor basado en el nombre
      const serverTools = allTools.filter((tool) => {
        // Los nombres de herramientas incluyen el prefijo del servidor
        return (
          tool.name.includes(serverName) ||
          tool.description.includes(serverName)
        );
      });

      console.log(
        `🎯 Herramientas del servidor ${serverName}: ${serverTools.length}`
      );

      return serverTools;
    } catch (error) {
      console.error(
        `❌ Error obteniendo herramientas del servidor ${serverName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Lista todas las herramientas disponibles (para debug)
   */
  async listAvailableTools(): Promise<void> {
    if (!this.client || !this.isInitialized) {
      console.warn("⚠️ Cliente MCP no inicializado");
      return;
    }

    try {
      const tools = await this.client.getTools();

      console.log("\n📋 HERRAMIENTAS MCP DISPONIBLES:");
      console.log("================================");

      tools.forEach((tool, index) => {
        console.log(`${index + 1}. 🔧 ${tool.name}`);
        console.log(`   📝 ${tool.description}`);
        console.log(
          `   📊 Parámetros: ${
            Object.keys(tool.schema?.properties || {}).length
          }`
        );
        console.log("");
      });

      console.log(`✅ Total: ${tools.length} herramientas disponibles\n`);
    } catch (error) {
      console.error("❌ Error listando herramientas:", error);
    }
  }

  /**
   * Ejecuta una herramienta específica
   */
  async invokeTool(toolName: string, parameters: any) {
    if (!this.client || !this.isInitialized) {
      throw new Error("MCP client not initialized. Call initialize() first.");
    }

    try {
      console.log(`🔧 Ejecutando herramienta: ${toolName}`);
      console.log(`📋 Parámetros:`, parameters);

      const result = await this.client.invokeTool(toolName, parameters);

      console.log(`✅ Herramienta ${toolName} ejecutada correctamente`);

      return result;
    } catch (error) {
      console.error(`❌ Error ejecutando herramienta ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene información sobre un servidor específico
   */
  async getServerInfo(serverName: keyof typeof this.serverConfigs) {
    if (!this.client || !this.isInitialized) {
      throw new Error("MCP client not initialized. Call initialize() first.");
    }

    const config = this.serverConfigs[serverName];
    const tools = await this.getToolsByServer(serverName);

    return {
      name: serverName,
      config,
      toolCount: tools.length,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
      })),
    };
  }

  /**
   * Verifica el estado de conexión
   */
  isConnected(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Cierra la conexión con todos los servidores
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        console.log("🔌 Desconectando cliente MCP...");
        await this.client.close();
        this.client = null;
        this.isInitialized = false;
        console.log("✅ Cliente MCP desconectado correctamente");
      } catch (error) {
        console.error("❌ Error desconectando cliente MCP:", error);
        throw error;
      }
    }
  }

  /**
   * Reinicia la conexión
   */
  async restart(): Promise<void> {
    console.log("🔄 Reiniciando cliente MCP...");
    await this.disconnect();
    await this.initialize();
  }

  /**
   * Obtiene estadísticas del adaptador
   */
  async getStats() {
    if (!this.isConnected()) {
      return {
        connected: false,
        servers: 0,
        tools: 0,
      };
    }

    try {
      const tools = await this.getTools();
      const servers = Object.keys(this.serverConfigs);

      const serverStats = await Promise.all(
        servers.map(async (serverName) => {
          const info = await this.getServerInfo(
            serverName as keyof typeof this.serverConfigs
          );
          return {
            name: serverName,
            toolCount: info.toolCount,
          };
        })
      );

      return {
        connected: true,
        servers: servers.length,
        tools: tools.length,
        serverDetails: serverStats,
        uptime: Date.now(), // Simplificado para demo
      };
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Instancia singleton del adaptador
export const mcpAdapter = new MCPAdapter();

/**
 * Función helper para inicializar MCP fácilmente
 */
export async function initializeMCP(): Promise<MCPAdapter> {
  if (!mcpAdapter.isConnected()) {
    await mcpAdapter.initialize();
  }
  return mcpAdapter;
}

/**
 * Función helper para obtener herramientas MCP
 */
export async function getMCPTools() {
  const adapter = await initializeMCP();
  return adapter.getTools();
}

/**
 * Función helper para obtener herramientas de un servidor específico
 */
export async function getServerTools(
  serverName: "sales" | "technical" | "customer"
) {
  const adapter = await initializeMCP();
  return adapter.getToolsByServer(serverName);
}

/**
 * Tipos TypeScript para mejor desarrollo
 */
export interface MCPToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

export interface MCPServerConfig {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
}

export interface MCPStats {
  connected: boolean;
  servers?: number;
  tools?: number;
  serverDetails?: Array<{
    name: string;
    toolCount: number;
  }>;
  uptime?: number;
  error?: string;
}
