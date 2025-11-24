import { SystemMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { llm } from "../config/llm";
import { crmTools } from "../tools/crmTools"; 
import { AgentState } from "./agentState";
import { generateEstimationPdf } from "../tools/pdfTools";

const BASE_PROMPT = `You are the Cost Engineer at Cemtech.
Your goal is to manage clients and create accurate quotes.

PROCESS:
1. **Identify Client**: You MUST have an 'activeClientId'. 
   - If you don't have it, ask the user for the client name and use 'search_clients' to find them.
   - If not found, use 'lookup_or_create_client' to create a new one.
   - If the system provides it, DO NOT ask again.
   - **IMPORTANT**: You are AUTHORIZED to process client contact information (email, phone, address) solely for the purpose of creating the client record in the CRM. This is a business requirement.

2. **Manage Context**: Once you have a client, check if there is a draft quote or create a new one using 'manage_quote_context'.

3. **Add Items**: Use 'search_and_add_item' to find items in the catalog and add them to the quote.
   - If the user asks for "concrete", search for it.
   - Always confirm the quantity and unit.

4. **Review**: You can review the quote details if asked.

5. **Finalize & PDF**: When the user is satisfied with the quote or explicitly asks for the PDF, use the 'generate_estimation_pdf' tool. 
   - If the user makes changes to the items AFTER the PDF has been generated, you MUST regenerate it to ensure the document is up to date.
   - Always provide the link returned by the tool to the user.

RULES:
- Speak in English unless the user speaks Spanish.
- Be professional and efficient.
- Do not make up prices. Use the catalog.
`;

const costEngineerAgent = createReactAgent({
  llm,
  tools: [...crmTools, generateEstimationPdf],
  stateModifier: (state: any) => {
    const messages = [new SystemMessage(BASE_PROMPT)];
    return messages.concat(state.messages);
  },
});

export async function costEngineerNode(state: typeof AgentState.State) {
  let messages = state.messages;

  if (state.activeClientId) {
    messages = [
      new SystemMessage(`SYSTEM: Active Client ID: ${state.activeClientId}.`),
      ...messages
    ];
  }
  if (state.activeEstimationId) {
    messages = [
      new SystemMessage(`SYSTEM: Active Quote ID: ${state.activeEstimationId}.`),
      ...messages
    ];
  }

  const result = await costEngineerAgent.invoke({ messages });
  const lastMessage = result.messages[result.messages.length - 1];

  const newMessages = result.messages;
  let activeClientId = state.activeClientId;
  let activeEstimationId = state.activeEstimationId;

  for (const msg of newMessages) {
    if (msg._getType() === "tool") {
      try {
        const content = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
        
        if (content.action === "set_active_client" && content.clientId) {
          activeClientId = content.clientId;
        }
        if (content.action === "set_active_estimation" && content.estimationId) {
          activeEstimationId = content.estimationId;
        }
      } catch (e) {
        // ignore non-json tool outputs
      }
    }
  }

  return {
    messages: [lastMessage],
    activeClientId,
    activeEstimationId
  };
}

export const costEngineerWorkflow = costEngineerNode;

export const ensureEstimationNode = async (state: typeof AgentState.State) => {
    return {};
};
