import admin from "firebase-admin";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
let firebaseApp;

try {
  // Option 1: Using service account file path
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = join(__dirname, "..", process.env.FIREBASE_SERVICE_ACCOUNT_PATH.replace("./", ""));
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  // Option 2: Using environment variables for credentials
  else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  } else {
    console.warn(
      "⚠️  Firebase Admin SDK not initialized. Set FIREBASE_SERVICE_ACCOUNT_PATH or Firebase credentials in .env"
    );
  }

  if (firebaseApp) {
    console.log("✅ Firebase Admin SDK initialized successfully");
  }
} catch (error) {
  console.error("❌ Error initializing Firebase Admin SDK:", error.message);
}

export const messaging = firebaseApp ? admin.messaging() : null;
export const firestore = firebaseApp ? admin.firestore() : null;

// Helper function to send notification to a single device
export const sendNotificationToDevice = async (deviceToken, notification) => {
  if (!messaging) {
    throw new Error("Firebase Admin SDK not initialized");
  }

  const message = {
    token: deviceToken,
    notification: {
      title: notification.title,
      body: notification.description,
    },
    data: {
      icon: notification.icon || "notifications",
      ...notification.data,
    },
  };

  try {
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending notification to device:", error);
    throw error;
  }
};

// Helper function to send notification to multiple devices
export const sendNotificationToDevices = async (deviceTokens, notification) => {
  if (!messaging) {
    throw new Error("Firebase Admin SDK not initialized");
  }

  const message = {
    tokens: deviceTokens,
    notification: {
      title: notification.title,
      body: notification.description,
    },
    data: {
      icon: notification.icon || "notifications",
    },
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error("Error sending notifications to devices:", error);
    throw error;
  }
};

// Helper function to send notification to a topic
export const sendNotificationToTopic = async (topic, notification) => {
  if (!messaging) {
    throw new Error("Firebase Admin SDK not initialized");
  }

  const message = {
    topic: topic,
    notification: {
      title: notification.title,
      body: notification.description,
    },
    data: {
      icon: notification.icon || "notifications",
    },
  };

  try {
    const response = await messaging.send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending notification to topic:", error);
    throw error;
  }
};

export default firebaseApp;
