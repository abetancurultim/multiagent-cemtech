import dotenv from "dotenv";
import { HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SystemMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { AgentState } from "./agentState";
import { llm } from "../config/llm";
import { MESSAGES } from "../config/constants";
import { salesTools } from "../tools/salesTools";
import { sqlTools } from "../tools/sqlToolKit";

dotenv.config();

// Agente de ventas con herramientas SQL para consultar la base de datos
// Ignora el error de tipo excesivamente profundo
const salesServiceAgent = createReactAgent({
  llm,
  tools: [...sqlTools], 
  stateModifier: new SystemMessage(MESSAGES.SYSTEM_SALES_PROMPT),
});
  
export const salesServiceNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig
) => {
  const result = await salesServiceAgent.invoke(state, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    messages: [
      new HumanMessage({ content: lastMessage.content, name: "SalesService" }),
    ],
    next: "supervisor",
  };
}; 

// salesServiceNode es un nodo que procesa mensajes para el agente de servicio de ventas.
// El nodo invoca el agente de servicio de ventas con el estado actual y la configuración proporcionada.
// Luego, devuelve la respuesta del agente de servicio de ventas como un mensaje humano.
// El mensaje humano contiene el contenido de la respuesta y el nombre del agente que envió el mensaje.
