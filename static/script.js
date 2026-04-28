// =============================================
// STATE
// =============================================
let selectedLanguage = "";
let selectedTab = "libraries";
let chatHistory = [];
let isLoading = false;

// =============================================
// DOM REFS
// =============================================
const languageSelect = document.getElementById("language-select");
const topicsPanel = document.getElementById("topics-panel");
const topicsList = document.getElementById("topics-list");
const chatArea = document.getElementById("chat-area");
const messagesContainer = document.getElementById("messages-container");
const welcomeScreen = document.getElementById("welcome-screen");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const clearBtn = document.getElementById("clear-chat");
const currentLangDisplay = document.getElementById("current-lang-display");
const topicBreadcrumb = document.getElementById("topic-breadcrumb");
const hintText = document.getElementById("hint-text");
const inputHint = document.querySelector(".input-hint");
const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.getElementById("sidebar");
const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

// =============================================
// MARKED CONFIG
// =============================================
marked.setOptions({
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});

// =============================================
// LANGUAGE SELECTION
// =============================================
languageSelect.addEventListener("change", function () {
    selectedLanguage = this.value;
    if (selectedLanguage) {
        topicsPanel.style.display = "flex";
        topicsPanel.style.flexDirection = "column";
        currentLangDisplay.textContent = selectedLanguage;
        hintText.textContent = `✅ Asking about ${selectedLanguage}`;
        inputHint.className = "input-hint ok";
        loadTopics(selectedTab);
    } else {
        topicsPanel.style.display = "none";
        currentLangDisplay.textContent = "No language selected";
        hintText.textContent = "⚠️ No language selected — general programming questions only";
        inputHint.className = "input-hint warning";
    }
    topicBreadcrumb.textContent = "";
});

document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", function () {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        selectedTab = this.dataset.tab;
        loadTopics(selectedTab);
    });
});

function loadTopics(tab) {
    if (!selectedLanguage || !LANGUAGE_DATA[selectedLanguage]) return;
    const items = LANGUAGE_DATA[selectedLanguage][tab] || [];
    topicsList.innerHTML = "";
    items.forEach(item => {
        const btn = document.createElement("button");
        btn.className = "topic-item";
        btn.textContent = item;
        btn.addEventListener("click", () => showTopicInfo(item, tab));
        topicsList.appendChild(btn);
    });
}

// =============================================
// TOPIC INFO MODAL
// =============================================
async function showTopicInfo(topic, category) {
    modalTitle.textContent = `${topic} — ${selectedLanguage}`;
    modalBody.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
    modalOverlay.style.display = "flex";
    topicBreadcrumb.textContent = `→ ${topic}`;

    try {
        const res = await fetch("/api/get_topic_info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language: selectedLanguage, topic, category })
        });
        const data = await res.json();
        if (data.error) {
            modalBody.innerHTML = `<p style="color:var(--red)">${data.error}</p>`;
        } else {
            modalBody.innerHTML = marked.parse(data.response);
            modalBody.querySelectorAll("pre code").forEach(el => hljs.highlightElement(el));
        }
    } catch (err) {
        modalBody.innerHTML = `<p style="color:var(--red)">Error loading topic info. Please try again.</p>`;
    }
}

modalClose.addEventListener("click", () => {
    modalOverlay.style.display = "none";
    topicBreadcrumb.textContent = "";
});
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.style.display = "none";
        topicBreadcrumb.textContent = "";
    }
});

// =============================================
// COPY HELPER
// =============================================
function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add("copied");
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg> Copied!`;
        setTimeout(() => {
            btn.classList.remove("copied");
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
            </svg> Copy`;
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
    });
}

// =============================================
// TYPEWRITER EFFECT
// =============================================
// Streams markdown text into a container token by token
// keeping scroll position stable at the user's current view
async function typewriterStream(container, fullText, chatAreaEl) {
    const allChars = fullText;
    let charIndex = 0;
    const CHARS_PER_TICK = 4;
    const TICK_MS = 16;

    const wasAtBottom = (chatAreaEl.scrollHeight - chatAreaEl.scrollTop - chatAreaEl.clientHeight) < 80;

    return new Promise((resolve) => {
        function tick() {
            if (charIndex >= allChars.length) {
                // Final pass — full markdown with syntax highlighting
                container.innerHTML = marked.parse(fullText);
                container.querySelectorAll("pre code").forEach(el => hljs.highlightElement(el));
                container.querySelectorAll("pre").forEach(pre => addCodeCopyBtn(pre));
                if (wasAtBottom) chatAreaEl.scrollTop = chatAreaEl.scrollHeight;
                resolve();
                return;
            }

            charIndex = Math.min(charIndex + CHARS_PER_TICK, allChars.length);
            const partial = allChars.slice(0, charIndex);

            // Always render as markdown — even partial text
            // Append a zero-width space cursor marker at end
            const withCursor = partial + "\u200B";
            container.innerHTML = marked.parse(withCursor);

            // Remove syntax highlighting during stream (too slow per tick)
            // Just let the hljs theme CSS color the blocks naturally

            // Append blinking cursor to last text node
            appendCursor(container);

            if (wasAtBottom) chatAreaEl.scrollTop = chatAreaEl.scrollHeight;

            setTimeout(tick, TICK_MS);
        }
        tick();
    });
}

function appendCursor(container) {
    // Find the deepest last text-containing element and append cursor span there
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let lastTextNode = null;
    let node;
    while ((node = walker.nextNode())) {
        if (node.textContent.trim()) lastTextNode = node;
    }
    if (lastTextNode) {
        const cursor = document.createElement("span");
        cursor.className = "cursor-blink";
        cursor.textContent = "▌";
        lastTextNode.parentNode.insertBefore(cursor, lastTextNode.nextSibling);
    }
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, "<br>");
}

function addCodeCopyBtn(preEl) {
    // Avoid adding duplicate buttons
    if (preEl.querySelector(".code-copy-btn")) return;
    const code = preEl.querySelector("code");
    if (!code) return;
    const btn = document.createElement("button");
    btn.className = "code-copy-btn";
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
    </svg> Copy code`;
    btn.addEventListener("click", () => copyToClipboard(code.innerText, btn));
    preEl.style.position = "relative";
    preEl.appendChild(btn);
}

// =============================================
// CHAT MESSAGES
// =============================================
function addUserMessage(text) {
    if (welcomeScreen.style.display !== "none") {
        welcomeScreen.style.display = "none";
    }

    const msg = document.createElement("div");
    msg.className = "message user";
    msg.innerHTML = `
        <div class="msg-avatar user-avatar">U</div>
        <div class="msg-content">
            <div class="msg-meta">
                <span class="msg-name">You</span>
                <button class="copy-msg-btn" title="Copy message">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
                    </svg> Copy
                </button>
            </div>
            <div class="msg-bubble">${escapeHtml(text).replace(/\n/g, "<br>")}</div>
        </div>`;

    msg.querySelector(".copy-msg-btn").addEventListener("click", function () {
        copyToClipboard(text, this);
    });

    messagesContainer.appendChild(msg);

    // Scroll ONLY the new user message into view — keep top of chat stable
    msg.scrollIntoView({ behavior: "smooth", block: "end" });
    return msg;
}

async function addAIMessage(text, isError = false) {
    const msg = document.createElement("div");
    msg.className = "message ai";
    msg.innerHTML = `
        <div class="msg-avatar ai-avatar">⟨/⟩</div>
        <div class="msg-content">
            <div class="msg-meta">
                <span class="msg-name">CodeMind AI</span>
                <span class="ai-badge">AI</span>
            </div>
            <div class="msg-bubble${isError ? " error" : ""}">
                <div class="ai-response-body"></div>
            </div>
        </div>`;

    messagesContainer.appendChild(msg);

    const responseBody = msg.querySelector(".ai-response-body");

    if (isError) {
        responseBody.innerHTML = `<span style="color:var(--red)">${text}</span>`;
    } else {
        // Typewriter stream — does NOT auto-scroll to bottom
        await typewriterStream(responseBody, text, chatArea);
    }

    return msg;
}

function addTypingIndicator() {
    const msg = document.createElement("div");
    msg.className = "message ai";
    msg.id = "typing-indicator";
    msg.innerHTML = `
        <div class="msg-avatar ai-avatar">⟨/⟩</div>
        <div class="msg-content">
            <div class="msg-meta"><span class="msg-name">CodeMind AI</span></div>
            <div class="msg-bubble">
                <div class="loading-dots"><span></span><span></span><span></span></div>
            </div>
        </div>`;
    messagesContainer.appendChild(msg);
    // Scroll just enough to show the typing indicator
    msg.scrollIntoView({ behavior: "smooth", block: "end" });
}

function removeTypingIndicator() {
    const el = document.getElementById("typing-indicator");
    if (el) el.remove();
}

// =============================================
// SEND MESSAGE
// =============================================
async function sendMessage(message) {
    if (!message.trim() || isLoading) return;

    isLoading = true;
    sendBtn.disabled = true;
    chatInput.value = "";
    chatInput.style.height = "auto";

    addUserMessage(message);
    chatHistory.push({ role: "user", content: message });
    addToHistory(message, selectedLanguage);
    addTypingIndicator();

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                language: selectedLanguage,
                history: chatHistory.slice(0, -1)
            })
        });
        const data = await res.json();
        removeTypingIndicator();

        if (data.error) {
            await addAIMessage(`❌ Error: ${data.error}`, true);
        } else {
            await addAIMessage(data.response);
            chatHistory.push({ role: "assistant", content: data.response });
        }
    } catch (err) {
        removeTypingIndicator();
        await addAIMessage("❌ Network error. Make sure the server is running.", true);
    }

    isLoading = false;
    sendBtn.disabled = false;
    chatInput.focus();
}

// =============================================
// HISTORY SYSTEM
// =============================================
const HISTORY_KEY = "codemind_history";

function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch { return []; }
}

function saveHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addToHistory(question, language) {
    const history = loadHistory();
    const entry = {
        id: Date.now(),
        question: question.trim(),
        language: language || "General",
        timestamp: new Date().toISOString()
    };
    // Avoid duplicate consecutive entries
    if (history.length && history[0].question === entry.question) return;
    history.unshift(entry);
    // Keep max 200 entries
    if (history.length > 200) history.splice(200);
    saveHistory(history);
}

function deleteHistoryItem(id) {
    const history = loadHistory().filter(h => h.id !== id);
    saveHistory(history);
    renderHistoryPanel(document.getElementById("history-search").value);
}

function clearAllHistory() {
    if (confirm("Clear all history? This cannot be undone.")) {
        localStorage.removeItem(HISTORY_KEY);
        renderHistoryPanel("");
    }
}

function formatHistoryDate(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function formatHistoryTime(isoString) {
    return new Date(isoString).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function renderHistoryPanel(filterText = "") {
    const list = document.getElementById("history-list");
    const history = loadHistory();
    const query = filterText.toLowerCase().trim();

    const filtered = query
        ? history.filter(h =>
            h.question.toLowerCase().includes(query) ||
            h.language.toLowerCase().includes(query))
        : history;

    if (!filtered.length) {
        list.innerHTML = `<div class="history-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" opacity="0.3">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                <polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <p>${query ? "No results found" : "No history yet"}</p>
            <span>${query ? "Try a different search" : "Your questions will appear here"}</span>
        </div>`;
        return;
    }

    // Group by date
    const groups = {};
    filtered.forEach(item => {
        const label = formatHistoryDate(item.timestamp);
        if (!groups[label]) groups[label] = [];
        groups[label].push(item);
    });

    list.innerHTML = "";
    Object.entries(groups).forEach(([dateLabel, items]) => {
        const groupEl = document.createElement("div");
        groupEl.className = "history-date-group";
        groupEl.innerHTML = `<span class="history-date-label">${dateLabel}</span>`;

        items.forEach(item => {
            const el = document.createElement("div");
            el.className = "history-item";
            el.innerHTML = `
                <button class="history-item-btn" title="${item.question}">
                    <div class="history-item-q">${item.question}</div>
                    <div class="history-item-meta">
                        <span class="history-item-lang">${item.language}</span>
                        <span class="history-item-time">${formatHistoryTime(item.timestamp)}</span>
                    </div>
                </button>
                <button class="history-item-del" title="Delete">✕</button>`;

            // Click item — reload that question into chat
            el.querySelector(".history-item-btn").addEventListener("click", () => {
                closeHistoryPanel();
                // Set language if it was recorded
                if (item.language !== "General" && item.language) {
                    languageSelect.value = item.language;
                    languageSelect.dispatchEvent(new Event("change"));
                }
                chatInput.value = item.question;
                sendMessage(item.question);
            });

            // Delete item
            el.querySelector(".history-item-del").addEventListener("click", (e) => {
                e.stopPropagation();
                deleteHistoryItem(item.id);
            });

            groupEl.appendChild(el);
        });

        list.appendChild(groupEl);
    });
}

function openHistoryPanel() {
    document.getElementById("history-panel").classList.add("open");
    document.getElementById("history-overlay").classList.add("open");
    document.getElementById("history-btn").classList.add("active");
    renderHistoryPanel(document.getElementById("history-search").value);
}

function closeHistoryPanel() {
    document.getElementById("history-panel").classList.remove("open");
    document.getElementById("history-overlay").classList.remove("open");
    document.getElementById("history-btn").classList.remove("active");
}

// History panel event listeners
document.getElementById("history-btn").addEventListener("click", () => {
    const panel = document.getElementById("history-panel");
    panel.classList.contains("open") ? closeHistoryPanel() : openHistoryPanel();
});
document.getElementById("history-close").addEventListener("click", closeHistoryPanel);
document.getElementById("history-overlay").addEventListener("click", closeHistoryPanel);
document.getElementById("history-clear-all").addEventListener("click", clearAllHistory);
document.getElementById("history-search").addEventListener("input", function () {
    renderHistoryPanel(this.value);
});

// =============================================
// EVENT LISTENERS
// =============================================
sendBtn.addEventListener("click", () => sendMessage(chatInput.value));

chatInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(this.value);
    }
});

chatInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 140) + "px";
});

clearBtn.addEventListener("click", () => {
    messagesContainer.innerHTML = "";
    chatHistory = [];
    welcomeScreen.style.display = "block";
});

menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove("open");
    }
});

function quickAsk(question) {
    chatInput.value = question;
    sendMessage(question);
}