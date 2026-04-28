from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from groq import Groq
import config

app = Flask(__name__)
CORS(app)

client = Groq(api_key=config.GROQ_API_KEY)

@app.route("/")
def index():
    return render_template("index.html",
                           languages=config.SUPPORTED_LANGUAGES,
                           language_data=config.LANGUAGE_DATA)

@app.route("/api/get_language_data", methods=["GET"])
def get_language_data():
    language = request.args.get("language", "")
    if language not in config.LANGUAGE_DATA:
        return jsonify({"error": "Language not found"}), 404
    return jsonify(config.LANGUAGE_DATA[language])

@app.route("/api/get_topic_info", methods=["POST"])
def get_topic_info():
    data = request.get_json()
    language = data.get("language", "")
    topic = data.get("topic", "")
    category = data.get("category", "")

    if not language or not topic:
        return jsonify({"error": "Missing language or topic"}), 400

    prompt = f"""Give a clear, comprehensive explanation of "{topic}" in {language}.
Category: {category}

Include:
1. What it is (definition)
2. Syntax / usage example with working code
3. Key notes / best practices
4. A practical real-world example

Format with markdown and proper {language} code blocks."""

    try:
        completion = client.chat.completions.create(
            model=config.MODEL_NAME,
            messages=[
                {"role": "system", "content": config.SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=1500
        )
        response_text = completion.choices[0].message.content
        return jsonify({"response": response_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    message = data.get("message", "").strip()
    language = data.get("language", "")
    history = data.get("history", [])

    if not message:
        return jsonify({"error": "Empty message"}), 400

    # Build system message with language context
    system_msg = config.SYSTEM_PROMPT
    if language:
        system_msg += f"\n\nThe user has selected {language} as their primary language. Focus answers on {language} unless they ask about something else."
    else:
        system_msg += "\n\nIMPORTANT: The user has NOT selected a programming language. If their question is programming-related, gently remind them to select a language from the dropdown for better assistance — but still answer general programming questions. If their question is completely unrelated to programming, return the error message."

    # Build messages list with history
    messages = [{"role": "system", "content": system_msg}]
    
    # Add conversation history (last 10 messages to stay within token limits)
    for h in history[-10:]:
        messages.append({"role": h["role"], "content": h["content"]})
    
    messages.append({"role": "user", "content": message})

    try:
        completion = client.chat.completions.create(
            model=config.MODEL_NAME,
            messages=messages,
            temperature=0.5,
            max_tokens=2000
        )
        response_text = completion.choices[0].message.content
        return jsonify({"response": response_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    if not config.GROQ_API_KEY:
        print("ERROR: GROQ_API_KEY not set in .env file!")
    else:
        print("✅ Groq API key loaded successfully")
        print("🚀 Starting server at http://localhost:5000")
    app.run(debug=True, port=5000)