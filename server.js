// server.js

const express = require("express");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

app.get(["/api/health", "/"], (_req, res) => {
  res.status(200).json({ status: "ok" });
});

function validateIncidentFacts(facts) {
  const requiredFields = [
    "incident_description",
    "date_time",
    "location",
    "complainant_or_victim",
    "accused_or_persons_involved",
    "actions",
    "force_threat_or_weapon",
    "injury_damage_or_loss",
  ];

  const missingFields = requiredFields.filter((field) => {
    const fact = facts?.[field];

    return (
      !fact ||
      typeof fact !== "object" ||
      fact.source !== "user" ||
      typeof fact.value !== "string" ||
      fact.value.trim() === ""
    );
  });

  return {
    ready: missingFields.length === 0,
    missingFields,
  };
}

// Vercel's api/chat.js function invokes this app with the function-local
// path `/`, while local Express uses `/api/chat`; support both paths.
app.post(["/api/chat", "/"], async (req, res) => {
  const { history } = req.body;

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: "API key is not configured on the server.",
    });
  }

  if (!Array.isArray(history) || history.length === 0) {
    return res.status(400).json({
      error: "Conversation history is required.",
    });
  }

  const normalizedHistory = history.map((content) => {
    if (
      !content ||
      !["user", "model"].includes(content.role) ||
      !Array.isArray(content.parts) ||
      content.parts.length === 0
    ) {
      return null;
    }

    const parts = content.parts.map((part) => {
      if (!part || typeof part.text !== "string" || part.text.trim() === "") {
        return null;
      }

      return { text: part.text };
    });

    return parts.some((part) => part === null)
      ? null
      : { role: content.role, parts };
  });

  if (normalizedHistory.some((content) => content === null)) {
    return res.status(400).json({
      error: "Conversation history format is invalid.",
    });
  }

  const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  const apiUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const systemInstruction = `
You are Vidhi AI, an AI-assisted preliminary FIR information-gathering
assistant for Indian police officers.

PHASE 1 OBJECTIVE:
Collect sufficient factual information about an incident before any legal
analysis is performed.

IMPORTANT:
- Do NOT suggest legal sections.
- Do NOT mention BNS, IPC, BNSS, BSA, or other legal provisions.
- Do NOT provide legal conclusions.
- Do NOT provide landmark judgments.
- Do NOT invent facts.
- Only use facts explicitly provided by the officer.
- Ask only ONE follow-up question at a time.

You must maintain the following incident facts:

1. incident_description
   What happened?

2. date_time
   When did it happen?

3. location
   Where did it happen?

4. complainant_or_victim
   Who is the complainant or victim?

5. accused_or_persons_involved
   Who is accused or involved, if known?

6. actions
   What exactly did each relevant person do?

7. force_threat_or_weapon
   Was force, threat, intimidation, or a weapon involved?

8. injury_damage_or_loss
   Were there injuries, property damage, financial loss, or other harm?

9. witnesses
   Are there witnesses?

10. evidence
    Is there any known evidence such as CCTV, photographs, documents,
    messages, medical records, weapons, or other material?

For every fact, return both "value" and "source".

SOURCE RULES:

- "user":
  Use ONLY when the officer explicitly provided the information.

- "inferred":
  Use when the information is reasonably implied but was not explicitly
  provided by the officer.

- "not_provided":
  Use when the information is unavailable.

IMPORTANT:
- Inferred information MUST NOT be treated as confirmed fact.
- Never convert an inference into a user-provided fact.
- If the officer says "I don't know", use source "not_provided".
- Do not invent names, identities, dates, injuries, weapons, witnesses,
  evidence, or other details.

REQUIRED FACTS BEFORE READY:

A required fact is complete ONLY when its source is "user".

Facts with source "inferred" or "not_provided" do NOT satisfy the required
information requirement.

The following facts must have source "user" before the status can become
"ready_for_analysis":
- incident_description
- date_time
- location
- complainant_or_victim
- accused_or_persons_involved
- actions
- force_threat_or_weapon
- injury_damage_or_loss

Witnesses and evidence should be recorded when available, but their absence
does not automatically prevent completion.

If a required fact is not confirmed by the officer:
- status must be "collecting"
- ask ONE question to obtain that fact
- do not treat an inferred fact as confirmed

If any required fact is missing or unclear:
- status must be "collecting"
- ask ONE specific question addressing the most important missing fact
- do not ask multiple questions in one message

If all required facts are sufficiently understood:
- status must be "ready_for_analysis"
- message should tell the officer that the incident information has been
  collected and is ready for the next analysis phase
- do not perform legal analysis yet

Return ONLY valid JSON matching the provided schema.
`;

const factSchema = {
  type: "object",
  properties: {
    value: {
      type: "string",
    },
    source: {
      type: "string",
      enum: ["user", "inferred", "not_provided"],
    },
  },
  required: ["value", "source"],
};

const responseSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["collecting", "ready_for_analysis"],
    },

    message: {
      type: "string",
      description:
        "One response shown to the officer. During collection, this must be one targeted question.",
    },

incident_facts: {
  type: "object",
  properties: {
    incident_description: factSchema,
    date_time: factSchema,
    location: factSchema,
    complainant_or_victim: factSchema,
    accused_or_persons_involved: factSchema,
    actions: factSchema,
    force_threat_or_weapon: factSchema,
    injury_damage_or_loss: factSchema,
    witnesses: factSchema,
    evidence: factSchema,
  },
  required: [
    "incident_description",
    "date_time",
    "location",
    "complainant_or_victim",
    "accused_or_persons_involved",
    "actions",
    "force_threat_or_weapon",
    "injury_damage_or_loss",
    "witnesses",
    "evidence",
  ],
},

    missing_information: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },

  required: [
    "status",
    "message",
    "incident_facts",
    "missing_information",
  ],
};

   try {
    const contents = normalizedHistory;

    const maxRetries = 2;
    let geminiResponse;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const controller = new AbortController();
      const geminiTimeout = setTimeout(() => controller.abort(), 15_000);

      try {
        console.log("Calling Gemini...");
        console.log("Gemini model:", GEMINI_MODEL);
        console.log("Gemini API key exists:", !!GEMINI_API_KEY);
        console.log("History messages:", history.length);
        console.log(
          "History characters:",
          JSON.stringify(history).length
        );

        geminiResponse = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: systemInstruction,
                },
              ],
            },
            contents,
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema,
            },
          }),
          signal: controller.signal,
        });

        console.log("Gemini responded:", geminiResponse.status);
      } catch (error) {
        if (error.name === "AbortError") {
          console.error("Gemini request timed out after 15 seconds");

          return res.status(504).json({
            error: "Gemini API request timed out.",
          });
        }

        throw error;
      } finally {
        clearTimeout(geminiTimeout);
      }

      if (geminiResponse.status !== 503) {
        break;
      }

      const errorBody = await geminiResponse.text();

      console.error("Gemini HTTP status:", geminiResponse.status);
      console.error("Gemini HTTP status text:", geminiResponse.statusText);
      console.error("Gemini API Error:", errorBody);

      if (attempt === maxRetries) {
        return res.status(503).json({
          error: "Gemini is temporarily unavailable. Please try again shortly.",
        });
      }

      console.warn(
        `Gemini returned 503. Retrying attempt ${attempt + 1}/${maxRetries}...`
      );
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1_000));
    }

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();

      console.error("Gemini HTTP status:", geminiResponse.status);
      console.error("Gemini HTTP status text:", geminiResponse.statusText);
      console.error("Gemini API Error:", errorBody);

      return res.status(geminiResponse.status).json({
        error: "Gemini API request failed.",
        geminiStatus: geminiResponse.status,
        details: errorBody,
      });
    }

    const data = await geminiResponse.json();

    const responseText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Gemini returned an empty response.");
    }

    let structuredResponse;

try {
  structuredResponse = JSON.parse(responseText);
} catch (parseError) {
  console.error("Failed to parse Gemini JSON:", responseText);

  throw new Error("Gemini returned invalid structured data.");
}

// Backend-controlled validation
const validation = validateIncidentFacts(
  structuredResponse.incident_facts
);

if (!validation.ready) {
  structuredResponse.status = "collecting";
  structuredResponse.missing_information = validation.missingFields;
} else {
  structuredResponse.status = "ready_for_analysis";
  structuredResponse.missing_information = [];
}

res.json(structuredResponse);
  } catch (error) {
    console.error("Error in /api/chat endpoint:", error);

    res.status(500).json({
      error: "An internal server error occurred.",
    });
  }
});

// Vercel imports this Express app as a serverless function. Locally, this
// file can still be started directly with `npm start`.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
