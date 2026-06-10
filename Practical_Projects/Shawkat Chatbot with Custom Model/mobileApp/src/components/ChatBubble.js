import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ChatBubble = ({ message, isUser, timestamp }) => {
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
          {message}
        </Text>
        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.aiTimestamp]}>
          {formatTime(timestamp)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userBubble: {
    backgroundColor: '#4A90E2',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#333333',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: '#E6F2FF',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: '#999999',
    textAlign: 'left',
  },
});

export default ChatBubble;