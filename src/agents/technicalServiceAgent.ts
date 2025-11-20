import dotenv from "dotenv";
import { HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SystemMessage } from "@langchain/core/messages";
import { AgentState } from "./agentState";
import { llm } from "../config/llm";
import { MESSAGES } from "../config/constants";
import { calendarTools } from "../tools/calendarTools";

dotenv.config();

const technicalServiceAgent = createReactAgent({
  llm,
  tools: [...calendarTools],
  stateModifier: new SystemMessage(MESSAGES.SYSTEM_TECHNICAL_PROMPT),
});

export const technicalServiceNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig
) => {
  const result = await technicalServiceAgent.invoke(state, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    messages: [
      new HumanMessage({
        content: lastMessage.content,
        name: "TechnicalService",
      }),
    ],
    next: "supervisor",
  };
};

// technicalServiceNode es un nodo que procesa mensajes para el agente de servicio técnico.
// El nodo invoca el agente de servicio técnico con el estado actual y la configuración proporcionada.
// Luego, devuelve la respuesta del agente de servicio técnico como un mensaje humano.
// El mensaje humano contiene el contenido de la respuesta y el nombre del agente que envió el mensaje.
