const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

let GoogleGenerativeAI;
let genAI;

try {
  const { GoogleGenerativeAI: GoogleGenAI } = require('@google/generative-ai');
  GoogleGenerativeAI = GoogleGenAI;

  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (error) {
  console.log('Gemini API not configured. Using mock responses.');
}

const chatHistory = [];

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Chat backend is running' });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId = 'default' } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    chatHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      userId
    });

    let aiResponse;

    try {
      if (genAI && process.env.GEMINI_API_KEY) {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Build conversation context
        const conversationHistory = chatHistory.slice(-10).map(msg =>
          `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
        ).join('\n');

        const prompt = `You are a helpful AI assistant. Keep responses conversational and helpful.

Conversation history:
${conversationHistory}