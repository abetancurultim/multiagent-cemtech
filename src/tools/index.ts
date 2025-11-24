// ==========================================
// ÍNDICE DE HERRAMIENTAS PARA AGENTES
// ==========================================

// import { salesTools } from "./salesTools";
// import { technicalTools } from "./technicalTools";
import { crmTools as customerTools } from "./crmTools";

// ==========================================
// EXPORTACIONES INDIVIDUALES POR AGENTE
// ==========================================

// export { salesTools } from "./salesTools";
// export { technicalTools } from "./technicalTools";
export { crmTools as customerTools } from "./crmTools";

// Exportaciones individuales de herramientas de ventas
/*
export {
  getProductCatalogTool,
  calculateQuoteTool,
  getSalesAnalyticsTool,
  getActivePromotionsTool,
  checkInventoryTool,
} from "./salesTools";
*/

// Exportaciones individuales de herramientas técnicas
/*
export {
  diagnoseTechnicalIssueTool,
  scheduleTechnicalVisitTool,
  getTechnicalManualTool,
  checkWarrantyStatusTool,
  schedulePreventiveMaintenanceTool,
} from "./technicalTools";
*/

// Exportaciones individuales de herramientas de servicio al cliente
export {
  lookupOrCreateClientTool,
  manageQuoteContextTool,
  searchAndAddItemTool,
} from "./crmTools";

// ==========================================
// COLECCIÓN COMPLETA DE HERRAMIENTAS
// ==========================================

/**
 * Todas las herramientas disponibles agrupadas por agente
 */
export const allTools = {
  // sales: salesTools,
  // technical: technicalTools,
  customer: customerTools,
};

/**
 * Array plano con todas las herramientas disponibles
 */
export const allToolsArray = [
  // ...salesTools,
  // ...technicalTools,
  ...customerTools,
];

/**
 * Mapeo de agentes a sus herramientas específicas
 */
export const agentToolsMap = {
  // valentina: salesTools, // Agente de Ventas
  // carlos: technicalTools, // Agente Técnico
  maria: customerTools, // Agente de Servicio al Cliente
};

/**
 * Función para obtener herramientas por tipo de agente
 */
export function getToolsByAgent(agentType: "sales" | "technical" | "customer") {
  // @ts-ignore
  return allTools[agentType] || [];
}

/**
 * Función para obtener herramientas por nombre de agente
 */
export function getToolsByAgentName(
  agentName: "valentina" | "carlos" | "maria"
) {
  // @ts-ignore
  return agentToolsMap[agentName] || [];
}

// ==========================================
// LEGACY EXPORTS (PARA COMPATIBILIDAD)
// ==========================================

// Mantener compatibilidad con el archivo tools.ts existente
export {
  contactTool,
  getProductInfoTool,
  troubleshootIssueTool,
} from "./tools";

// ==========================================
// TIPOS DE HERRAMIENTAS
// ==========================================

/**
 * Tipos de agentes disponibles
 */
export type AgentType = "sales" | "technical" | "customer";

/**
 * Nombres de agentes disponibles
 */
export type AgentName = "valentina" | "carlos" | "maria";

/**
 * Tipos de herramientas disponibles
 */
export type ToolType = keyof typeof allTools;
