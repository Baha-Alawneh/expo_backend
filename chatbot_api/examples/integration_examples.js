/**
 * Example: How to integrate the Expo Chatbot API into your application
 * 
 * This file demonstrates how to interact with the chatbot API from:
 * - React/React Native applications
 * - Node.js backend
 * - Plain JavaScript/Fetch API
 */

// ============================================
// Example 1: Using Axios (React/Node.js)
// ============================================

const axios = require('axios');

const CHATBOT_API_URL = 'http://localhost:3001/api/chat';

/**
 * Send a message to the chatbot
 */
async function sendMessage(message, userId = null) {
  try {
    const response = await axios.post(`${CHATBOT_API_URL}/chat`, {
      message: message,
      userId: userId
    });

    return response.data;
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Example usage with Axios
 */
async function exampleAxios() {
  console.log('Example 1: Using Axios\n');
  
  const questions = [
    'What is this expo about?',
    'Show me engineering projects',
    'Tell me about companies offering internships'
  ];

  for (const question of questions) {
    console.log(`Q: ${question}`);
    const result = await sendMessage(question, 'user-123');
    console.log(`A: ${result.message}\n`);
  }
}

// ============================================
// Example 2: Using Fetch API (Browser/React)
// ============================================

/**
 * Send message using native Fetch API
 */
async function sendMessageFetch(message, userId = null) {
  try {
    const response = await fetch('http://localhost:3001/api/chat/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        userId: userId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Example usage with Fetch
 */
async function exampleFetch() {
  console.log('Example 2: Using Fetch API\n');
  
  const result = await sendMessageFetch('What types of projects can be submitted?');
  console.log('Response:', result.message);
}

// ============================================
// Example 3: React Native Integration
// ============================================

/**
 * React Native component example
 * 
 * Copy this into your React Native app
 */
const ReactNativeExample = `
import React, { useState } from 'react';
import { View, TextInput, Button, Text, ScrollView } from 'react-native';
import axios from 'axios';

const CHATBOT_API = 'http://localhost:3001/api/chat/chat';

export default function ChatbotScreen() {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = { role: 'user', text: message };
    setConversation([...conversation, userMessage]);
    setLoading(true);

    try {
      const response = await axios.post(CHATBOT_API, {
        message: message,
        userId: 'user-id' // Replace with actual user ID
      });

      const botMessage = {
        role: 'bot',
        text: response.data.message,
        source: response.data.source
      };

      setConversation(prev => [...prev, botMessage]);
      setMessage('');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <ScrollView style={{ flex: 1 }}>
        {conversation.map((msg, index) => (
          <View key={index} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: msg.role === 'user' ? '#007AFF' : '#E5E5EA',
            padding: 10,
            borderRadius: 10,
            marginVertical: 5,
            maxWidth: '80%'
          }}>
            <Text style={{
              color: msg.role === 'user' ? 'white' : 'black'
            }}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>
      
      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderRadius: 5, padding: 10 }}
          value={message}
          onChangeText={setMessage}
          placeholder="Ask me about the expo..."
        />
        <Button
          title={loading ? "..." : "Send"}
          onPress={sendMessage}
          disabled={loading}
        />
      </View>
    </View>
  );
}
`;

// ============================================
// Example 4: Health Check
// ============================================

async function checkHealth() {
  try {
    const response = await axios.get(`${CHATBOT_API_URL}/health`);
    console.log('Health Status:', response.data);
    return response.data.status === 'healthy';
  } catch (error) {
    console.error('Health check failed:', error.message);
    return false;
  }
}

// ============================================
// Example 5: Get Chatbot Info
// ============================================

async function getChatbotInfo() {
  try {
    const response = await axios.get(`${CHATBOT_API_URL}/info`);
    console.log('Chatbot Info:', response.data.chatbot);
    return response.data.chatbot;
  } catch (error) {
    console.error('Failed to get info:', error.message);
    return null;
  }
}

// ============================================
// Example 6: Chatbot Service Class
// ============================================

class ChatbotClient {
  constructor(apiUrl = 'http://localhost:3001/api/chat', userId = null) {
    this.apiUrl = apiUrl;
    this.userId = userId;
  }

  async sendMessage(message) {
    const response = await axios.post(`${this.apiUrl}/chat`, {
      message,
      userId: this.userId
    });
    return response.data;
  }

  async getHealth() {
    const response = await axios.get(`${this.apiUrl}/health`);
    return response.data;
  }

  async getInfo() {
    const response = await axios.get(`${this.apiUrl}/info`);
    return response.data;
  }
}

/**
 * Example usage of ChatbotClient
 */
async function exampleClient() {
  console.log('Example 6: Using ChatbotClient Class\n');
  
  const chatbot = new ChatbotClient('http://localhost:3001/api/chat', 'user-456');
  
  // Check health
  const health = await chatbot.getHealth();
  console.log('Server Status:', health.status);
  
  // Get info
  const info = await chatbot.getInfo();
  console.log('Chatbot Name:', info.chatbot.name);
  
  // Send messages
  const response1 = await chatbot.sendMessage('What is this expo about?');
  console.log('Response:', response1.message);
}

// ============================================
// Run Examples
// ============================================

async function runAllExamples() {
  console.log('🚀 Expo Chatbot API - Integration Examples\n');
  console.log('='.repeat(60));
  
  // Health check first
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.log('⚠️  Server is not healthy. Make sure it\'s running on port 3001');
    return;
  }
  
  console.log('✓ Server is healthy\n');
  
  // Run examples (comment out what you don't need)
  // await exampleAxios();
  // await exampleFetch();
  await exampleClient();
  
  console.log('\n' + '='.repeat(60));
  console.log('✓ Examples completed!\n');
}

// Uncomment to run examples
// runAllExamples().catch(console.error);

module.exports = {
  sendMessage,
  sendMessageFetch,
  checkHealth,
  getChatbotInfo,
  ChatbotClient,
  ReactNativeExample
};
