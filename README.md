
# 🏗️ Cemtech AI Multi-Agent System

> **Next-Generation Automated Quoting & Customer Service Engine for WhatsApp.**

This project is a sophisticated **Multi-Agent System** designed for **Ultim Marketing** to automate complex interactions including quoting (Takeoff & Estimating), client management, and customer service through a natural conversational interface on WhatsApp.

---

## 🌟 Key Features

*   **🧠 Multi-Agent Architecture:** Powered by **LangGraph**, the system uses a "Supervisor" agent to intelligently route user requests to specialized agents (Cost Engineer, Customer Service, etc.).
*   **💬 Omnichannel & Multimodal:** Handles **Text**, **Voice Notes** (transcribed via Whisper), and **Images** seamlessly through WhatsApp.
*   **📊 Integrated CRM:** Deep integration with **Supabase** to manage Clients, Projects, and Estimations in real-time.
*   **⚡ Real-time Quoting:** Capable of searching catalogs, calculating costs, and generating draft quotes on the fly.

---

## 🛠️ Technology Stack

*   **Runtime:** Node.js (TypeScript)
*   **Orchestration:** [LangGraph](https://langchain-ai.github.io/langgraph/) (Stateful Multi-Agent Graph)
*   **LLM:** OpenAI (**GPT-4o** for reasoning, **Whisper-1** for audio)
*   **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
*   **Storage:** [Firebase Storage](https://firebase.google.com/) (Media persistence)
*   **Messaging:** WhatsApp Business API (via **Twilio**)

---

## 🧩 System Architecture

The system follows a **Supervisor-Worker** pattern:

1.  **Ingestion:**
    *   User sends a message to WhatsApp.
    *   **Twilio** forwards the webhook to our Express server.
    *   **Media Handler** processes audio/images (upload to Firebase + Transcribe).
    *   Message is saved to **Supabase** history.

2.  **Orchestration (The Brain):**
    *   The **Supervisor Agent** analyzes the conversation history and intent.
    *   It decides whether to reply directly (General Chat) or route to a specialist.

3.  **Specialized Agents:**
    *   👷 **Cost Engineer:** Handles technical quoting tasks.
        *   *Tools:* `lookup_or_create_client`, `manage_quote_context`, `search_and_add_item`.
    *   🤝 **Customer Service:** (In Development) Handles FAQs, order tracking, and company info.

4.  **Execution:**
    *   The selected agent executes tools (DB queries, calculations).
    *   The final response is sent back to the user via Twilio.

---

## 📂 Project Structure

```bash
src/
├── agents/           # Agent Definitions (The "Workers")
│   ├── costEngineer.ts    # Logic for quoting and estimation
│   └── agentState.ts      # Shared state interface for the graph
├── config/           # Configuration & Clients
│   ├── supabase.ts        # Database connection
│   ├── firebase.ts        # Storage connection
│   └── llm.ts             # OpenAI setup
├── functions/        # Core Business Logic
│   └── costFunctions.ts   # Pure functions for calculations
├── routes/           # API Routes
│   └── chatRoutes.ts      # Main entry point (Twilio Webhook)
├── services/         # Data Access Layer (DAL)
│   ├── crmService.ts      # Client management
│   ├── estimationService.ts # Quote management
│   └── chatHistoryService.ts # Message persistence
├── tools/            # LangChain Tools
│   ├── crmTools.ts        # Tools for Client/Quote manipulation
│   ├── costTools.ts       # Tools for Catalog/Pricing
│   └── index.ts           # Tool exports and mapping
├── supervisor.ts     # Main Graph Definition & Routing Logic
└── index.ts          # Server Entry Point
```

---

## 🚀 Installation & Setup

### 1. Prerequisites
*   Node.js (v18+)
*   Supabase Project
*   Firebase Project
*   Twilio Account (WhatsApp Sandbox or Live)
*   OpenAI API Key

### 2. Installation

```bash
git clone <repo-url>
cd multiagent-cemtech
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:

```env
PORT=3031

# --- AI ---
OPENAI_API_KEY="sk-..."

# --- Database (Supabase) ---
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# --- Storage (Firebase) ---
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

### 4. Running the Server

**Development Mode:**
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
npm start
```

### 5. Webhook Configuration
Expose your local server using Ngrok:
```bash
ngrok http 3031
```
Set the Twilio Webhook URL to: `https://your-ngrok-url.app/cemtech/receive-message`

---

## 💾 Database Schema (Supabase)

Key tables required for operation:

*   `chat_history`: Manages session state and human-handoff flags (`chat_on`).
*   `messages`: Stores the full conversation log.
*   `clients`: CRM data for customers.
*   `estimations`: Headers for quotes/estimates.
*   `estimation_items`: Line items for each quote.
*   `items`: Product catalog with pricing.
