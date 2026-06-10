const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

let GoogleGenerativeAI;
let genAI;

try {
  const { GoogleGenerativeAI: GoogleGenAI } = require("@google/generative-ai");
  GoogleGenerativeAI = GoogleGenAI;

  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (error) {
  console.log("Gemini API not configured. Using mock responses.");
}

const chatHistory = [];

app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Chat backend is running" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, userId = "default" } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message is required" });
    }

    chatHistory.push({
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
      userId,
    });

    let aiResponse;

    try {
      if (genAI && process.env.GEMINI_API_KEY) {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const conversationHistory = chatHistory
          .slice(-10)
          .map((msg) => `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`)
          .join("\n");

        const prompt = `You are a helpful AI assistant. Keep responses conversational and helpful.

Conversation history:
${conversationHistory}

Latest message: ${message}

Please respond to the latest message:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        aiResponse = response.text();
      } else {
        aiResponse = "I'm a mock AI assistant. Your message was received, but the Gemini API is not configured.";
      }
    } catch (error) {
      console.error("Gemini API Error:", error);
      aiResponse = "Sorry, I encountered an error processing your request. Please try again.";
    }

    chatHistory.push({
      role: "assistant",
      content: aiResponse,
      timestamp: new Date().toISOString(),
      userId,
    });

    res.json({
      message: aiResponse,
      timestamp: new Date().toISOString(),
      success: true,
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({
      error: "Failed to process chat message",
      message: "Sorry, I encountered an error. Please try again.",
      success: false,
    });
  }
});

app.get("/api/chat/history", (req, res) => {
  const { userId = "default" } = req.query;
  const userHistory = chatHistory.filter((msg) => msg.userId === userId);

  res.json({
    history: userHistory,
    count: userHistory.length,
  });
});

app.delete("/api/chat/history", (req, res) => {
  const { userId = "default" } = req.body;
  const initialLength = chatHistory.length;

  for (let i = chatHistory.length - 1; i >= 0; i--) {
    if (chatHistory[i].userId === userId) {
      chatHistory.splice(i, 1);
    }
  }

  res.json({
    message: "Chat history cleared",
    deletedCount: initialLength - chatHistory.length,
  });
});

app.listen(PORT, () => {
  console.log(`Chat backend server running on port ${PORT}`);
  console.log(`Gemini API configured: ${!!genAI}`);
  console.log("Available endpoints:");
  console.log("  GET  /health - Health check");
  console.log("  POST /api/chat - Send chat message");
  console.log("  GET  /api/chat/history - Get chat history");
  console.log("  DELETE /api/chat/history - Clear chat history");
});
