// DOM Element References
const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const loader = document.getElementById("loader");

// Conversation history
let conversationHistory = [];

// Initial welcome message
document.addEventListener("DOMContentLoaded", () => {
  const welcomeMessage =
    "Hello! I am Vidhi AI. Please describe the incident you need to report.";

  addMessageToChat("ai", welcomeMessage);

  conversationHistory.push({
    role: "model",
    parts: [
      {
        text: welcomeMessage,
      },
    ],
  });
});

// Event Listeners
sendButton.addEventListener("click", handleUserMessage);

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleUserMessage();
  }
});

/**
 * Handles sending the user's message.
 */
async function handleUserMessage() {
  const message = userInput.value.trim();

  if (!message) return;

  addMessageToChat("user", message);

  userInput.value = "";

  conversationHistory.push({
    role: "user",
    parts: [
      {
        text: message,
      },
    ],
  });

  setLoadingState(true);

  try {
    const aiResponse = await callBackendAPI(conversationHistory);

    if (!aiResponse || !aiResponse.message) {
      throw new Error("Invalid response from backend.");
    }

    addMessageToChat("ai", aiResponse.message);

    conversationHistory.push({
      role: "model",
      parts: [
        {
          text: JSON.stringify(aiResponse),
        },
      ],
    });

console.log("VIDHI AI RESPONSE:", aiResponse);
console.log("INCIDENT FACTS:", aiResponse.incident_facts);
console.log("MISSING INFORMATION:", aiResponse.missing_information);

if (aiResponse.status === "ready_for_analysis") {
  console.log("Incident information is sufficient.");
  console.table(aiResponse.incident_facts);
}
  } catch (error) {
    console.error("Error communicating with backend:", error);

    addMessageToChat(
      "ai",
      "I'm sorry, I encountered an error communicating with the server. Please try again."
    );
  } finally {
    setLoadingState(false);
  }
}

/**
 * Calls the secure backend API.
 */
async function callBackendAPI(history) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      history: history,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

/**
 * Adds a message to the chat.
 */
function addMessageToChat(sender, message) {
  const bubble = document.createElement("div");

  bubble.className = `chat-bubble ${sender}-bubble`;

  // Use textContent instead of innerHTML.
  // AI/user text should never be treated as HTML.
  bubble.textContent = message;

  chatContainer.appendChild(bubble);

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/**
 * Manages loading state.
 */
function setLoadingState(isLoading) {
  if (isLoading) {
    loader.classList.remove("hidden");
    loader.classList.add("flex");

    sendButton.disabled = true;
    userInput.disabled = true;
  } else {
    loader.classList.add("hidden");
    loader.classList.remove("flex");

    sendButton.disabled = false;
    userInput.disabled = false;

    userInput.focus();
  }
}