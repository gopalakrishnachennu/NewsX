// Firebase Configuration
// Replace with your Firebase project config
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// OpenAI Configuration
export const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || "",
  model: "gpt-4-turbo-preview",
  visionModel: "gpt-4-vision-preview",
};

// App Configuration
export const appConfig = {
  name: "Post Designer",
  description: "AI-Powered Social Media Post Designer for Indian Audiences",
  version: "1.0.0",
  
  // Default dimensions for different platforms
  platforms: {
    instagram: { width: 1080, height: 1350, name: "Instagram Post" },
    instagramStory: { width: 1080, height: 1920, name: "Instagram Story" },
    twitter: { width: 1200, height: 675, name: "Twitter/X Post" },
    linkedin: { width: 1200, height: 627, name: "LinkedIn Post" },
    facebook: { width: 1200, height: 630, name: "Facebook Post" },
  },
  
  // Feature tiers
  tiers: {
    free: {
      name: "Free",
      templatesLimit: 10,
      aiGenerationsPerMonth: 0,
      batchSizeLimit: 1,
      brandKitsLimit: 1,
      canRemoveWatermark: false,
      canAccessApi: false,
    },
    pro: {
      name: "Pro",
      templatesLimit: -1, // unlimited
      aiGenerationsPerMonth: 100,
      batchSizeLimit: 10,
      brandKitsLimit: 5,
      canRemoveWatermark: true,
      canAccessApi: false,
    },
    enterprise: {
      name: "Enterprise",
      templatesLimit: -1,
      aiGenerationsPerMonth: -1,
      batchSizeLimit: 100,
      brandKitsLimit: -1,
      canRemoveWatermark: true,
      canAccessApi: true,
    },
  },
};
