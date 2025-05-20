// geminiClient.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Store your API key in .env
const genAI = new GoogleGenerativeAI("AIzaSyA67yNwJ0neMqZa9gWXIu8d10hr4GWHGws")

// Change from CommonJS exports to ES module exports
export async function checkAnswerWithGemini(prompt) {
  const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash-exp" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}
// module.exports = { checkAnswerWithGemini };
