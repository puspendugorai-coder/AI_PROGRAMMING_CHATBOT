from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from groq import Groq
import config
import requests as http_requests
import os
import re

app = Flask(__name__)
CORS(app)

client = Groq(api_key=config.GROQ_API_KEY)

# ---------- helpers ----------

NON_PROGRAMMING_RESPONSE = (
    "❌ This question is not related to programming. "
    "Please ask a programming-related question."
)

PROGRAMMING_CLASSIFIER_PROMPT = """You are a strict classifier. 
Decide whether the following user message is related to programming, coding, 
software development, algorithms, data structures, databases, computer science, 
or technology (broadly).

Reply with ONLY one word: YES or NO.

User message: {message}"""


def is_programming_related(message: str) -> bool:
    """Ask the LLM to classify whether the message is programming-related."""
    try:
        result = client.chat.completions.create(
            model=config.MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": PROGRAMMING_CLASSIFIER_PROMPT.format(message=message),
                }
            ],
            temperature=0.0,
            max_tokens=5,
        )
        verdict = result.choices[0].message.content.strip().upper()
        return verdict.startswith("YES")
    except Exception:
        # On error, allow the message through (fail-open)
        return True


# ---------- routes ----------

@app.route("/")
def index():
    return render_template(
        "index.html",
        languages=config.SUPPORTED_LANGUAGES,
        language_data=config.LANGUAGE_DATA,
    )


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
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            max_tokens=1500,
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

    # ── Point 4: classify before sending to main model ──
    if not is_programming_related(message):
        return jsonify({"response": NON_PROGRAMMING_RESPONSE})

    # Build system message with language context
    system_msg = config.SYSTEM_PROMPT
    if language:
        system_msg += (
            f"\n\nThe user has selected {language} as their primary language. "
            f"Focus answers on {language} unless they ask about something else."
        )
    else:
        system_msg += (
            "\n\nIMPORTANT: The user has NOT selected a programming language. "
            "If their question is programming-related, gently remind them to select "
            "a language from the dropdown for better assistance — but still answer "
            "general programming questions."
        )

    messages = [{"role": "system", "content": system_msg}]
    for h in history[-10:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    try:
        completion = client.chat.completions.create(
            model=config.MODEL_NAME,
            messages=messages,
            temperature=0.5,
            max_tokens=2000,
        )
        response_text = completion.choices[0].message.content
        return jsonify({"response": response_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Points 5 & 6: robust code execution ──

# Piston language name/version mapping
LANG_MAP = {
    "python":     ("python",     "3.10.0"),
    "javascript": ("javascript", "18.15.0"),
    "java":       ("java",       "15.0.2"),
    "c":          ("c",          "10.2.0"),
    "cpp":        ("c++",        "10.2.0"),
    "c++":        ("c++",        "10.2.0"),
    "csharp":     ("csharp",     "6.12.0"),
    "c#":         ("csharp",     "6.12.0"),
    "ruby":       ("ruby",       "3.0.1"),
    "go":         ("go",         "1.16.2"),
    "rust":       ("rust",       "1.50.0"),
    "typescript": ("typescript", "5.0.3"),
    "php":        ("php",        "8.2.3"),
    "swift":      ("swift",      "5.3.3"),
    "kotlin":     ("kotlin",     "1.8.20"),
    "r":          ("r",          "4.1.1"),
    "sql":        ("sqlite3",    "3.36.0"),
}

PISTON_API = "https://emkc.org/api/v2/piston/execute"


def clean_code(code: str, language: str) -> str:
    """Strip markdown fences that may have been passed in from the frontend."""
    # Remove ```lang ... ``` or ``` ... ```
    fenced = re.sub(r"^```[a-zA-Z+#]*\n?", "", code.strip(), flags=re.IGNORECASE)
    fenced = re.sub(r"\n?```$", "", fenced.strip())
    return fenced.strip()


@app.route("/api/execute", methods=["POST"])
def execute_code():
    data = request.get_json()
    raw_code = data.get("code", "")
    language = data.get("language", "python").strip().lower()

    if not raw_code.strip():
        return jsonify({"error": "No code provided", "status": "Error"}), 400

    # Clean any markdown fences the frontend may have sent
    code = clean_code(raw_code, language)

    lang_name, lang_version = LANG_MAP.get(language, ("python", "3.10.0"))

    payload = {
        "language": lang_name,
        "version": lang_version,
        "files": [{"name": f"main.{language}", "content": code}],
        "stdin": "",
        "args": [],
        "compile_timeout": 10,
        "run_timeout": 5,
    }

    try:
        response = http_requests.post(
            PISTON_API,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=20,
        )
        response.raise_for_status()
        result = response.json()

        compile_stage = result.get("compile", {})
        run_stage     = result.get("run", {})

        # Prefer run output; fall back to compile output for compiled-language errors
        stdout = run_stage.get("stdout", "").strip()
        stderr = run_stage.get("stderr", "").strip()
        compile_err = compile_stage.get("stderr", "").strip() if compile_stage else ""

        if stdout:
            output = stdout
            status = "Success"
        elif stderr:
            output = stderr
            status = "Error"
        elif compile_err:
            output = compile_err
            status = "Compile Error"
        else:
            output = "(No output)"
            status = "Success"

        return jsonify({"output": output, "status": status})

    except http_requests.exceptions.Timeout:
        return jsonify({"error": "Execution timed out", "status": "Error"}), 504
    except http_requests.exceptions.RequestException as e:
        return jsonify({"error": f"Execution service error: {str(e)}", "status": "Error"}), 502
    except Exception as e:
        return jsonify({"error": str(e), "status": "Error"}), 500


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=7860)
