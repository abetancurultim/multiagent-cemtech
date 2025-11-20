import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  activeProjectId: Annotation<string>({
    reducer: (x, y) => y ?? x, 
    default: () => "no-project-id", 
  }),
  // ✅ NUEVO CAMPO: Para que el Supervisor guarde a dónde ir
  next: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "FINISH",
  }),
});