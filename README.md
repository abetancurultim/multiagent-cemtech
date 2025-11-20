
# 🏗️ Cemtech AI Cost Engine

> **Multi-Agent System for Automated Concrete Quoting via WhatsApp.**

This project is a vertical tool for **Cemtech** (Atlanta, GA) designed to automate the quoting process (Takeoff & Estimating) through an intelligent conversational interface.

---

## 📖 Project Context

The goal is to reduce the time sales engineers spend processing manual requests. The system enables:


1. **Quote via Chat:** Calculate quantities and prices through natural conversation (Text or Audio).
2. **Hybrid Management:** Store multimedia files (Blueprints, Photos, Audios) in the cloud and structured data in a relational database.
3. **Human Handoff:** A "traffic light" system where a human can take control of the chat, automatically pausing the AI.


---

## 🛠️ Technology Stack (Hybrid Architecture)

The system uses a robust and scalable architecture:

* **Runtime:** Node.js (TypeScript).
* **AI Orchestration:** [LangGraph](https://langchain-ai.github.io/langgraph/) (Supervisor-Worker Architecture with Persistence).
* **LLM:** OpenAI (GPT-4o for reasoning, Whisper-1 for audio transcription).
* **Database (Data):** [Supabase](https://supabase.com/) (PostgreSQL) - User management, chat history, projects, and price catalog.
* **Storage (Files):** [Firebase Storage](https://firebase.google.com/) - Receiving and hosting audios, images, and PDFs from WhatsApp.
* **Channel:** WhatsApp Business API (via **Twilio**).

---

## 🧩 System Architecture

The information flow follows a strict pattern to ensure integrity and traceability:


### 1. Messaging Flow

1. **Input:** User sends a message (Text/Audio/Image) to WhatsApp.
2. **Webhook:** Twilio forwards the event to our server (`/whatsapp/webhook`).
3. **Media Handler:**
    * If there are files, they are downloaded from Twilio and uploaded to **Firebase Storage**.
    * If it is Audio, it is transcribed to text using **OpenAI Whisper**.
4. **Persistence:** The message is saved in **Supabase** (`messages` and `chat_history`).

### 2. Control Logic (Human Handoff)

Before activating the AI, the system checks the `chat_on` flag in the `chat_history` table in Supabase:

* 🔴 **`chat_on = true`:** A human is attending. The AI does **NOT** run.
* 🟢 **`chat_on = false`:** The AI processes the message and responds.

### 3. AI Graph (LangGraph)

If the AI is active, the **Supervisor Agent** routes the intent:

* 👷 **Cost Engineer:** Expert agent in calculations. Uses tools (`lookup_item`, `add_quote_item`) to interact with the price database.
* (Future) **Blueprint Analyst:** Vision agent to read blueprints.
* (Future) **PDF Generator:** Agent to render deliverables.

---

## 📂 Project Structure

```bash
src/
├── agents/           # Agent definitions (Graph Nodes)
│   ├── costEngineer.ts    # Quoting logic
│   └── agentState.ts      # Global graph state interface
├── config/           # Service configuration
│   ├── firebase.ts        # Firebase Storage initialization
│   ├── supabase.ts        # Database client
│   └── llm.ts             # OpenAI configuration
├── routes/           # API Endpoints
│   └── chatRoutes.ts      # Main Twilio webhook
├── services/         # Data layer
│   └── chatHistoryService.ts # CRUD abstraction for Supabase
├── tools/            # Tools (Function Calling)
│   ├── costTools.ts       # Search and Quoting tools
│   └── ...
├── utils/            # Utilities
│   └── mediaHandler.ts    # Pipeline: Twilio -> Firebase -> Whisper
├── supervisor.ts     # Graph and Router configuration
└── index.ts          # Server entry point
```

---

## 🚀 Installation and Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd multiagent-cemtech
npm install
```

### 2. Environment Variables

Create a `.env` file at the root with the following credentials:

```env
PORT=3031

# --- AI ---
OPENAI_API_KEY="sk-..."

# --- Database (Supabase) ---
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="your-service-role-key" # Needed to bypass RLS if applicable

# --- Files (Firebase) ---
FIREBASE_API_KEY="..."
FIREBASE_AUTH_DOMAIN="..."
FIREBASE_PROJECT_ID="..."
FIREBASE_STORAGE_BUCKET="..."
FIREBASE_MESSAGING_SENDER_ID="..."
FIREBASE_APP_ID="..."

# --- Communication (Twilio) ---
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="whatsapp:+1..."
```

### 3. Run in Development

Start Server:

```bash
npm run dev
```

Expose Port (Ngrok):

```bash
ngrok http 3031
```

Configure Webhook: In Twilio Console > WhatsApp Sandbox Settings, paste your Ngrok URL: `https://your-ngrok-url.app/whatsapp/webhook`

---

## 💾 Data Model (SQL Supabase)

The system requires the following main tables in Supabase:

* **chat_history:** Session control (client_number, chat_on).
* **messages:** Chat history (sender, message, url, twilio_sid).
* **projects:** Quotation header.
* **project_items:** Quoted items detail.
* **assemblies:** Catalog of sellable items.
* **resources:** Catalog of base resources.

---
