import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Image,
  ImageBackground,
} from "react-native";
import { StatusBar } from "expo-status-bar";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      const response = await fetch("https://5858a2067c73.ngrok-free.app/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "ChatApp/1.0",
        },
        body: JSON.stringify({
          message: inputText,
          userId: "mobile_user",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log("Response:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("Response text:", responseText);
        throw new Error("Server returned invalid JSON");
      }

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: data.message || "Sorry, I encountered an error.",
        isUser: false,
        timestamp: data.timestamp || new Date().toISOString(),
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

  const renderMessage = ({ item }) => (
    <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.aiBubble]}>
      <Text style={[styles.messageText, item.isUser ? styles.userText : styles.aiText]}>{item.text}</Text>
      <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image source={require("./assets/icon.png")} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Shawkat</Text>
        </View>
      </View>

      <ImageBackground source={require("./assets/splash.png")} style={styles.backgroundImage} imageStyle={styles.backgroundImageStyle}>
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
        />
      </ImageBackground>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            multiline
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>{isLoading ? "..." : "Send"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#4A90E2",
    padding: 20,
    paddingTop: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 32,
    height: 32,
    marginRight: 10,
    borderRadius: 16,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.85,
    resizeMode: "cover",
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 10,
    paddingBottom: 20,
  },
  messageBubble: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 12,
    maxWidth: "80%",
  },
  userBubble: {
    backgroundColor: "rgba(74, 144, 226, 0.9)",
    alignSelf: "flex-end",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.5,
    elevation: 6,
  },
  aiBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  messageText: {
    fontSize: 16,
  },
  userText: {
    color: "white",
  },
  aiText: {
    color: "#333",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 15,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  sendButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});
