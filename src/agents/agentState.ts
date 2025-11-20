import { END, Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => {
      const combined = x.concat(y);
      // Mantener solo los últimos 10 mensajes para evitar exceder el contexto
      return combined.slice(-10);
    },
    default: () => [],
  }),

  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => END,
  }),
});

// Explicación de código:
// --------------------------------
// AgentState es una anotación que contiene el estado de un agente en particular.
// En este caso, el estado de un agente es una lista de mensajes y el siguiente mensaje a enviar.
// El estado de un agente es un objeto que contiene dos propiedades:
// - messages: una lista de mensajes que el agente ha recibido.
// - next: el siguiente mensaje que el agente enviará.
// Ambas propiedades son anotaciones que contienen valores de tipo específico.
