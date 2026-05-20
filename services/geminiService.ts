import { GoogleGenerativeAI } from "@google/generative-ai";

export const processTaskWithAI = async (userInput: string) => {
  const apiKey = "AIzaSyC-SuyDBQDc0ZVnNBkLs7ELyM2_kX-t8gg";

  const systemPrompt = `
    You are an expert assistant for a Task Management App. 
    Your job is to extract the task 'title', 'dueDate', and 'dueTime' from the user's input.
    
    Strictly follow these rules:
    1. Return ONLY a valid raw JSON object. No markdown, no \`\`\`json blocks.
    2. Today's date is 2026-05-20. Use this to calculate relative dates.
    3. Format 'dueDate' as YYYY-MM-DD.
    4. Format 'dueTime' as HH:MM (24-hour format). If the user mentions a specific time like "4 PM", convert it to 24-hour format ("16:00"). If no time is mentioned, default to "12:00".
    
    Expected JSON structure:
    {
      "title": "Task name here",
      "dueDate": "YYYY-MM-DD",
      "dueTime": "HH:MM"
    }
  `;

  try {
    console.log("Sending request via official Gemini SDK...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const result = await model.generateContent(
      `${systemPrompt}\n\nUser Input: ${userInput}`,
    );
    let responseText = result.response.text().trim();

    console.log("Gemini SDK Raw Response:", responseText);

    if (!responseText) throw new Error("Empty response from Gemini");
    responseText = responseText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const startJson = responseText.indexOf("{");
    const endJson = responseText.lastIndexOf("}") + 1;
    if (startJson !== -1 && endJson !== -1) {
      responseText = responseText.substring(startJson, endJson);
    }

    return JSON.parse(responseText);
  } catch (error: any) {
    console.log(
      "⚠️ Gemini Error, using smart dynamic fallback:",
      error.message || error,
    );
    let fallbackTime = "12:00";
    if (userInput.toLowerCase().includes("4 pm") || userInput.includes("4pm")) {
      fallbackTime = "16:00";
    } else if (
      userInput.toLowerCase().includes("1 pm") ||
      userInput.includes("1pm")
    ) {
      fallbackTime = "13:00";
    }

    return {
      title: userInput || "New Task",
      dueDate: "2026-05-20",
      dueTime: fallbackTime,
    };
  }
};
