const User = require("../models/User");

// Sends push notifications via Expo's push service — no Firebase project
// setup needed. Works with Expo push tokens (e.g. "ExponentPushToken[...]")
// stored on User.fcmToken.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const isExpoPushToken = (token) =>
  typeof token === "string" && token.startsWith("ExponentPushToken");

// Expo requires batches of 100 messages max per request
const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

/**
 * Fire-and-forget push send. Never throws — logs and swallows errors so a
 * notification failure can never break the admin action that triggered it.
 * @param {string[]} tokens
 * @param {{ title: string, body: string, data?: object }} message
 */
const sendPushNotifications = async (tokens, { title, body, data = {} }) => {
  const validTokens = [...new Set(tokens)].filter(isExpoPushToken);
  if (validTokens.length === 0) return;

  for (const batch of chunk(validTokens, 100)) {
    const messages = batch.map((to) => ({ to, title, body, data, sound: "default" }));
    try {
      await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });
    } catch (err) {
      console.error("Push notification send failed:", err.message);
    }
  }
};

// Finds Expo push tokens for every student matching a given
// department/level/semester (i.e. everyone who should see this entry).
const getStudentTokens = async ({ department, level, semester }) => {
  const students = await User.find({
    isStudent: true,
    department,
    level,
    semester,
    fcmToken: { $ne: null },
  }).select("fcmToken");
  return students.map((s) => s.fcmToken);
};

module.exports = { sendPushNotifications, getStudentTokens };