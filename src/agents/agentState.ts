import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

/**
 * Definimos el estado global de nuestra aplicación.
 * - messages: La historia del chat.
 * - activeProjectId: El ID de la cotización actual (CRÍTICO para el Cost Engineer).
 */
export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  // Agregamos este campo nuevo:
  activeProjectId: Annotation<string>({
    reducer: (x, y) => y ?? x, // El último valor sobrescribe
    default: () => "no-project-id", 
  }),
});