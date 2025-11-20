# Herramientas de Agentes - InduEquipos Andina S.A.S.

## Descripción General

Esta carpeta contiene todas las herramientas especializadas para los agentes del sistema multiagente de InduEquipos Andina S.A.S. Cada agente tiene herramientas específicas para su área de trabajo, siguiendo las mejores prácticas de [LangChain Tools](https://js.langchain.com/docs/concepts/tools/).

## Estructura de Archivos

```
src/tools/
├── index.ts             # Archivo principal con todas las exportaciones
├── salesTools.ts        # Herramientas específicas del agente de ventas
├── technicalTools.ts    # Herramientas específicas del agente técnico
├── customerTools.ts     # Herramientas específicas del servicio al cliente
├── tools.ts             # Herramientas generales (legacy)
└── README.md           # Este archivo
```

## Agentes y sus Herramientas

### 🏢 Agente de Ventas (Valentina Ríos)

**Archivo:** `salesTools.ts`

- **`getProductCatalogTool`** - Obtiene catálogo de productos con filtros
- **`calculateQuoteTool`** - Calcula cotizaciones detalladas con descuentos
- **`getSalesAnalyticsTool`** - Proporciona análisis de ventas y tendencias
- **`getActivePromotionsTool`** - Obtiene promociones activas
- **`checkInventoryTool`** - Verifica disponibilidad de inventario

### 🔧 Agente Técnico (Carlos Restrepo)

**Archivo:** `technicalTools.ts`

- **`diagnoseTechnicalIssueTool`** - Diagnostica problemas técnicos
- **`scheduleTechnicalVisitTool`** - Programa visitas técnicas
- **`getTechnicalManualTool`** - Obtiene manuales técnicos
- **`checkWarrantyStatusTool`** - Verifica estado de garantía
- **`schedulePreventiveMaintenanceTool`** - Programa mantenimiento preventivo

### 🎧 Agente de Servicio al Cliente (María F. Ortiz)

**Archivo:** `customerTools.ts`

- **`searchFAQTool`** - Busca en preguntas frecuentes
- **`trackOrderTool`** - Rastrea órdenes de clientes
- **`manageComplaintTool`** - Gestiona reclamos
- **`getCompanyInfoTool`** - Obtiene información de la empresa
- **`scheduleFollowUpTool`** - Programa llamadas de seguimiento
- **`validateCityTool`** - Valida cobertura de ciudad
- **`contactServiceTool`** - Obtiene información de contacto

## Uso de las Herramientas

### Importación Individual

```typescript
import { getProductCatalogTool } from "../tools/salesTools";
import { diagnoseTechnicalIssueTool } from "../tools/technicalTools";
import { searchFAQTool } from "../tools/customerTools";
```

### Importación por Agente

```typescript
import { salesTools, technicalTools, customerTools } from "../tools";
```

### Importación de Todas las Herramientas

```typescript
import { allTools, allToolsArray } from "../tools";
```

### Uso con Funciones Utilitarias

```typescript
import { getToolsByAgent, getToolsByAgentName } from "../tools";

// Por tipo de agente
const salesTools = getToolsByAgent("sales");
const technicalTools = getToolsByAgent("technical");
const customerTools = getToolsByAgent("customer");

// Por nombre de agente
const valentinaTools = getToolsByAgentName("valentina");
const carlosTools = getToolsByAgentName("carlos");
const mariaTools = getToolsByAgentName("maria");
```

## Características de las Herramientas

### Esquemas con Zod

Todas las herramientas utilizan esquemas de validación con Zod:

```typescript
schema: z.object({
  productId: z.string().min(1).describe("ID del producto"),
  quantity: z.number().int().min(1).describe("Cantidad"),
  customerType: z.enum(["nuevo", "recurrente", "empresarial"]).optional(),
});
```

### Descripciones Detalladas

Cada herramienta tiene descripciones claras para que el modelo LLM pueda entenderlas:

```typescript
description: "Calcula una cotización detallada para productos específicos con descuentos automáticos según tipo de cliente y cantidad.";
```

### Parámetros Opcionales

Uso de valores por defecto y parámetros opcionales:

```typescript
urgency: z.enum(["baja", "media", "alta", "critica"])
  .optional()
  .default("media");
```

## Mejores Prácticas

### 1. Naming Convention

- Los nombres de herramientas son descriptivos y específicos
- Uso de sufijo `Tool` para diferenciación
- Nombres de función en camelCase

### 2. Validación de Entrada

- Todos los parámetros tienen validación con Zod
- Descripciones claras para cada parámetro
- Uso de enums para valores restringidos

### 3. Manejo de Errores

- Las funciones subyacentes manejan errores apropiadamente
- Validación de entrada antes de procesamiento
- Respuestas estructuradas y consistentes

### 4. Documentación

- Cada herramienta tiene comentarios JSDoc
- Parámetros documentados con `.describe()`
- Ejemplos de uso en comentarios

## Integración con Agentes

### Ejemplo de Uso en Agente

```typescript
import { salesTools } from "../tools";

const agentExecutor = createReactAgent({
  llm: chatModel,
  tools: salesTools,
  // ... otras configuraciones
});
```

### Configuración Dinámica

```typescript
import { getToolsByAgent } from "../tools";

function createAgentWithTools(agentType: "sales" | "technical" | "customer") {
  const tools = getToolsByAgent(agentType);
  return createReactAgent({
    llm: chatModel,
    tools,
    // ... configuración específica del agente
  });
}
```

## Datos de Prueba

Las herramientas utilizan datos simulados realistas que incluyen:

- **Productos industriales** por categoría (panadería, cárnicos, chocolates, etc.)
- **Precios** y descuentos basados en volumen y tipo de cliente
- **Técnicos especializados** por zona geográfica
- **Órdenes de compra** con estados de seguimiento
- **Base de conocimientos FAQ** por categoría
- **Información de garantía** por tipo de producto

## Compatibilidad

El sistema mantiene compatibilidad con herramientas legacy:

```typescript
// Importaciones legacy siguen funcionando
import { contactTool, getProductInfoTool } from "../tools/tools";
```

## Extensibilidad

Para agregar nuevas herramientas:

1. Crear la función en el archivo `functions/` correspondiente
2. Crear la herramienta en el archivo `tools/` del agente
3. Agregar la exportación en `index.ts`
4. Actualizar la documentación

## Tipos TypeScript

```typescript
export type AgentType = "sales" | "technical" | "customer";
export type AgentName = "valentina" | "carlos" | "maria";
export type ToolType = keyof typeof allTools;
```

Esta estructura proporciona un sistema robusto, escalable y bien documentado para las herramientas de los agentes del sistema multiagente de InduEquipos Andina S.A.S.