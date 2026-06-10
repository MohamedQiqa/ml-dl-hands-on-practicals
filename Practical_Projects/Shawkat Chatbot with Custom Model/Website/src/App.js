import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";
import splashImage from "./assets/splash.png";

function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        id: "1",
        text: "Hello! I'm Shawkat, your AI assistant. How can I help you today?",
        isUser: false,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await axios.post(
        "/api/chat",
        {
          message: inputText,
          userId: "web_user",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: response.data.message || "Sorry, I encountered an error.",
        isUser: false,
        timestamp: response.data.timestamp || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I could not connect to the server. Please try again.",
        isUser: false,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="app">
      <div className="header">
        <div className="header-content">
          <img src="/icon.png" alt="Shawkat AI" className="header-icon" />
          <h1 className="header-title">Shawkat</h1>
        </div>
      </div>

      <div
        className="messages-container"
        style={{
          backgroundImage: `url(${splashImage})`,
          backgroundSize: "contain",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="messages-overlay">
          <div className="messages-list">
            {messages.map((message) => (
              <div key={message.id} className={`message-bubble ${message.isUser ? "user-bubble" : "ai-bubble"}`}>
                <div className="message-text">{message.text}</div>
                <div className="timestamp">{formatTime(message.timestamp)}</div>
              </div>
            ))}
            {isLoading && (
              <div className="message-bubble ai-bubble">
                <div className="message-text">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div className="input-container">
        <div className="input-row">
          <textarea
            className="text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows="1"
            disabled={isLoading}
          />
          <button
            className={`send-button ${!inputText.trim() || isLoading ? "disabled" : ""}`}
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
