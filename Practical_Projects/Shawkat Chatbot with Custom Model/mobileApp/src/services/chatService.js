const BASE_URL = 'https://c4a882ce50ff.ngrok-free.app';

class ChatService {
  constructor() {
    this.baseUrl = BASE_URL;
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      if (response.ok) {
        const data = await response.json();
        return data.status === 'OK';
      }
      return false;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async sendMessage(message, userId = 'default') {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send message');
      }

      return {
        message: data.message,
        timestamp: data.timestamp,
        success: true,
      };
    } catch (error) {
      console.error('Send message failed:', error);
      throw error;
    }
  }

  async getChatHistory(userId = 'default') {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/history?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.history || [];
    } catch (error) {
      console.error('Get chat history failed:', error);
      throw error;
    }
  }

  async clearChatHistory(userId = 'default') {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/history`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Clear chat history failed:', error);
      throw error;
    }
  }

  setBaseUrl(newUrl) {
    this.baseUrl = newUrl;
  }

  getBaseUrl() {
    return this.baseUrl;
  }
}

export const chatService = new ChatService();