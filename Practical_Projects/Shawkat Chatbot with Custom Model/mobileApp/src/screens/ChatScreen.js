import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import ChatBubble from '../components/ChatBubble';
import ChatInput from '../components/ChatInput';
import { chatService } from '../services/chatService';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    checkConnection();
    loadWelcomeMessage();
  }, []);

  const checkConnection = async () => {
    try {
      const isHealthy = await chatService.checkHealth();
      setIsConnected(isHealthy);
      if (!isHealthy) {
        Alert.alert(
          'Connection Error',
          'Unable to connect to chat service. Please check if the backend server is running.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      setIsConnected(false);
      console.error('Health check failed:', error);
    }
  };

  const loadWelcomeMessage = () => {
    const welcomeMessage = {
      id: 'welcome',
      message: "Hello! I'm your AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMessage]);
  };

  const handleSendMessage = async (messageText) => {
    if (!isConnected) {
      Alert.alert('Connection Error', 'Not connected to chat service');
      return;
    }

    const userMessage = {
      id: Date.now().toString() + '_user',
      message: messageText,
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage(messageText);

      const aiMessage = {
        id: Date.now().toString() + '_ai',
        message: response.message,
        isUser: false,
        timestamp: response.timestamp,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);

      const errorMessage = {
        id: Date.now().toString() + '_error',
        message: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);

      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            loadWelcomeMessage();
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }) => (
    <ChatBubble
      message={item.message}
      isUser={item.isUser}
      timestamp={item.timestamp}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
        <Text style={styles.statusText}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>
      <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
        <Ionicons name="trash-outline" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateText}>Start a conversation!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <LinearGradient
        colors={['#E3F2FD', '#FFFFFF']}
        style={styles.gradient}
      >
        {renderHeader()}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyContent
          ]}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            disabled={!isConnected}
          />
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  clearButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default ChatScreen;