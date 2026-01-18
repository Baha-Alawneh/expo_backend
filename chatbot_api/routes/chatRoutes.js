const express = require('express');
const ChatbotService = require('../services/chatbotService');

const router = express.Router();

/**
 * POST /api/chat
 * Main chatbot endpoint - accepts user messages and returns AI responses
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, userId } = req.body;

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a non-empty string'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message is too long (max 1000 characters)'
      });
    }

    console.log(`\n💬 Chat request from user: ${userId || 'anonymous'}`);
    console.log(`📝 Message: "${message}"`);

    // Set timeout for processing (25 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout - AI took too long to respond')), 25000)
    );

    // Process the message through chatbot service with timeout
    const response = await Promise.race([
      ChatbotService.processMessage(message),
      timeoutPromise
    ]);

    console.log('✅ Response generated successfully');

    // Return the response
    return res.status(200).json({
      success: response.success,
      message: response.message,
      source: response.source,
      data: response.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat endpoint error:', error.message);
    
    // Send appropriate error response
    if (error.message.includes('timeout')) {
      return res.status(504).json({
        success: false,
        error: 'Request timeout',
        message: 'The AI took too long to respond. Please try a simpler question or try again.'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your message.'
    });
  }
});

/**
 * GET /api/chat/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'Expo Chatbot API',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/chat/info
 * Get chatbot information and capabilities
 */
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    chatbot: {
      name: 'Expo Assistant',
      version: '1.0.0',
      description: 'AI-powered chatbot for the University Expo Platform',
      capabilities: [
        'Answer questions about expo features and structure',
        'Search for approved projects by type or keywords',
        'Find companies and their offerings',
        'Locate booths and their assignments',
        'Provide student information',
        'Answer FAQs about the expo'
      ],
      scope: 'Limited to University Expo project data only',
      powered_by: 'Google Gemini AI'
    }
  });
});

module.exports = router;
