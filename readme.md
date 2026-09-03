# Vidhi AI Chatbot

## Deploy on Vercel

This project is ready to deploy as an Express application with static files in
`public/` and the API route at `/api/chat`.

1. Push this `Vidhi-AI` folder to a GitHub repository.
2. In Vercel, select **Add New → Project** and import that repository. If this
   folder is inside a larger repository, set Vercel's **Root Directory** to
   `Vidhi-AI`.
3. Select the **Other** framework preset. No build command or output directory
   is required.
4. In **Settings → Environment Variables**, add `GEMINI_API_KEY` with your
   Gemini API key. Add it to Production and Preview if you want preview
   deployments to call Gemini too.
   Optionally add `GEMINI_MODEL` (for example, `gemini-2.5-flash`) to select a
   model without changing the code.
5. Deploy. The site is served at `/`; the backend is served at `/api/chat`.

`GEMINI_API_KEY` must stay only in Vercel's environment-variable settings and
in your local `.env` file. Never put it in frontend JavaScript or commit `.env`.

After changing an environment variable, redeploy so that the new deployment
receives it. You can verify the deployed backend at `/api/health`.

**Vidhi AI** is an interactive, AI-powered chatbot designed to assist Indian police officers in the preliminary stages of drafting a First Information Report (FIR). By understanding the details of a complainant's incident through a natural conversation, the chatbot suggests appropriate legal sections from the Indian Penal Code (IPC) and other relevant acts, along with landmark judgments to provide context.

The primary goal is to reduce errors in citing legal sections due to lack of immediate legal expertise, thereby ensuring a more accurate FIR and aiding the subsequent investigation process.

---

## Features

- **Conversational Interface**: An intuitive chat window for easy interaction.
- **Interactive Guidance**: The AI asks clarifying questions to gather necessary details, guiding the officer through the reporting process.
- **Legal Section Suggestions**: Identifies and suggests relevant legal sections based on the incident's description.
- **Verifiable Sources**: Provides direct links to official sources (like [indiacode.nic.in](https://www.indiacode.nic.in/)) for each suggested legal section.
- **Landmark Judgements**: Cites relevant landmark court cases to provide legal precedent and context.
- **Secure API Key Handling**: Utilizes a Node.js backend to protect the Google Gemini API key, ensuring it is never exposed to the client-side.

---

## Tech Stack

### Frontend:

- **HTML5**
- **CSS3 (Tailwind CSS)**
- **Vanilla JavaScript**

### Backend:

- **Node.js**
- **Express.js**

### Core AI:

- **Google Gemini API**

---

## Getting Started

Follow these instructions to set up the project locally for development and testing.

### Prerequisites

- **Node.js (v14.x or higher)** installed on your machine (comes with npm).

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/vidhi-ai-chatbot.git
   cd vidhi-ai
   ```
2. **Install backend dependencies**

   ```bash
    npm install
   ```

3. **Create the Environment File**

- Create a new file named **.env** in the root of your project folder. This file will store your secret API key.
- Add your Google Gemini API key:
  ```
  GEMINI_API_KEY=YOUR_ACTUAL_API_KEY_HERE
  ```

4. Run the server
   ```bash
    node server.js
   ```
   You should see:
   ```
   Server is running on http://localhost:3000
   ```

### Usage

Once the server is running, open your browser and navigate to:

```
http://localhost:3000
```

The Vidhi AI Chatbot interface will load, and you can start interacting with it immediately.
