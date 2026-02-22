/***********************
 * DOM ELEMENTS
 ***********************/
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-btn');
const modeToggle = document.querySelector('.mode-toggle');
const voiceToggle = document.querySelector('.voice-toggle');
const imageUpload = document.getElementById('image-upload');

/***********************
 * API CONFIGURATION
 ***********************/
const API_CONFIG = {
  WEATHER_API_KEY: 'b8445be7ec4cade10f1134d880b84f58',
  GEMINI_API_KEY: 'AIzaSyDUaPxRfTNnlgETLkmPjk-Cn-ejma4TJ8M'
};

const GEMINI_MODEL = 'Gemini 3.1 Pro';
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/***********************
 * STATE VARIABLES
 ***********************/
let recognition = null;
let synthesis = window.speechSynthesis;
let isVoiceMode = false;

/***********************
 * INITIALIZATION
 ***********************/
document.addEventListener('DOMContentLoaded', () => {
  initializeVoiceRecognition();
  addWelcomeMessage();
  setupEventListeners();
});

/***********************
 * CHAT UI
 ***********************/
function addMessage(text, sender) {
  const msg = document.createElement('div');
  msg.className = `message ${sender}-message`;
  msg.innerHTML = `<div class="message-content">${text}</div>`;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/***********************
 * VOICE RECOGNITION
 ***********************/
function initializeVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window)) return;

  recognition = new webkitSpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    handleUserInput(text);
  };
}

/***********************
 * SPEAK RESPONSE
 ***********************/
function speakResponse(text) {
  if (!synthesis || !isVoiceMode) return;
  synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  synthesis.speak(utterance);
}

/***********************
 * GEMINI TEXT REQUEST
 ***********************/
async function geminiTextRequest(prompt) {
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${API_CONFIG.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024
      }
    })
  });

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
}

/***********************
 * GEMINI IMAGE REQUEST
 ***********************/
async function geminiImageRequest(base64, mimeType) {
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${API_CONFIG.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Analyze this agricultural image and give Description, Analysis, Recommendations.' },
            {
              inlineData: {
                mimeType,
                data: base64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048
      }
    })
  });

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Image analysis failed.';
}

/***********************
 * HANDLE USER INPUT
 ***********************/
async function handleUserInput(input) {
  addMessage(input, 'user');
  addMessage('GreenGrok is thinking...', 'ai');

  try {
    const prompt = `
You are GreenGrok, an agricultural assistant.
User query: "${input}"

Format:
Main Answer:
Key Points:
Recommendations:
`;

    const response = await geminiTextRequest(prompt);

    chatMessages.lastChild.remove();
    addMessage(response.replace(/\n/g, '<br>'), 'ai');
    speakResponse(response);
  } catch (err) {
    chatMessages.lastChild.remove();
    addMessage('Error getting response.', 'ai');
  }
}

/***********************
 * IMAGE UPLOAD HANDLER
 ***********************/
imageUpload.addEventListener('change', () => {
  const file = imageUpload.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    addMessage('Analyzing image...', 'ai');

    const base64 = reader.result.split(',')[1];
    const result = await geminiImageRequest(base64, file.type);

    chatMessages.lastChild.remove();
    addMessage(result.replace(/\n/g, '<br>'), 'ai');
    speakResponse(result);
  };
  reader.readAsDataURL(file);
});

/***********************
 * EVENT LISTENERS
 ***********************/
function setupEventListeners() {
  sendBtn.addEventListener('click', () => {
    if (userInput.value.trim()) {
      handleUserInput(userInput.value.trim());
      userInput.value = '';
    }
  });

  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
  });

  voiceToggle.addEventListener('click', () => {
    isVoiceMode = !isVoiceMode;
    if (isVoiceMode) recognition?.start();
    else recognition?.stop();
  });

  modeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
  });

  voiceBtn.addEventListener('click', () => recognition?.start());
}

/***********************
 * WELCOME MESSAGE
 ***********************/
function addWelcomeMessage() {
  const msg = "Hello! I'm GreenGrok 🌱 Your AI farming assistant. How can I help today?";
  addMessage(msg, 'ai');
  speakResponse(msg);
}
