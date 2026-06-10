export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://localhost:3000'  // Development
    : 'https://your-production-api.com',  // Production

  TIMEOUT: 10000,

  ENDPOINTS: {
    HEALTH: '/health',
    CHAT: '/api/chat',
    CHAT_HISTORY: '/api/chat/history',
  },
};

export const APP_CONFIG = {
  USER_ID: 'mobile_user',
  MAX_MESSAGE_LENGTH: 1000,
  CHAT_HISTORY_LIMIT: 100,
};