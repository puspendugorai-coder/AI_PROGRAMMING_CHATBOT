# 🤖 CodeMind: AI Programming Assistant

CodeMind is a sophisticated full-stack AI chatbot specialized which helps to answer any type of questions regarding different programming languages.. It also explains about different features of programming languages..

---

## 🚀 Live Demo
Experience the assistant live on Hugging Face Spaces:

[**👉Click here to open**](https://alphacoder7206-ai-programming-chatbot.hf.space)

---

## ✨ Key Features
- **Context-Aware Programming Intelligence:** Powered by Llama-3.3-70B for high-accuracy coding help.
- **Interactive Topic Explorer:** Instant access to curated data on libraries, modules, keywords, and OOP concepts for major languages.
- **Modern UI/UX:** Built with a dark-themed, responsive interface using "Syne" and "JetBrains Mono" typography.
- **Persistent Chat History:** Uses browser local storage to keep track of your previous queries and learning path.
- **Rich Markdown Support:** Full syntax highlighting for code blocks using `Highlight.js`.

## 🛠️ Tech Stack
- **Backend:** Python (Flask), Groq Cloud SDK
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla ES6)
- **AI Model:** Llama-3.3-70b-versatile
- **Containerization:** Docker
- **Deployment:** Hugging Face Spaces / GitHub

## 📂 Project Structure
```text
├── app.py              # Flask server routes and AI logic
├── config.py           # Application constants and language data
├── Dockerfile          # Container configuration for deployment
├── requirements.txt    # Python dependencies
├── static/
│   ├── script.js       # Frontend state management and API calls
│   └── style.css       # Custom UI styling
└── templates/
    └── index.html      # Main application interface
