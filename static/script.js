// =============================================
// STATE
// =============================================
let selectedLanguage = "";
let selectedTab = "libraries";
let chatHistory = [];
let isLoading = false;
let stopRequested = false;
let currentSessionId = null;

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
    highlight: (code, lang) => {
        if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
        return hljs.highlightAuto(code).value;
    },
    breaks: true, gfm: true
});

// =============================================
// THEME TOGGLE
// =============================================
function initTheme() {
    const saved = localStorage.getItem("codemind_theme") || "dark";
    applyTheme(saved);
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("codemind_theme", theme);
    const darkIcon = document.getElementById("theme-icon-dark");
    const lightIcon = document.getElementById("theme-icon-light");
    const hljsTheme = document.getElementById("hljs-theme");
    if (theme === "light") {
        darkIcon.style.display = "none";
        lightIcon.style.display = "block";
        hljsTheme.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";
    } else {
        darkIcon.style.display = "block";
        lightIcon.style.display = "none";
        hljsTheme.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css";
    }
}

document.getElementById("theme-btn").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
});

// =============================================
// HAMBURGER MENU (points 1 & 2)
// =============================================
const hamburgerBtn = document.getElementById("hamburger-btn");
const hamburgerDropdown = document.getElementById("hamburger-dropdown");

hamburgerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = hamburgerDropdown.classList.contains("open");
    hamburgerDropdown.classList.toggle("open", !isOpen);
    hamburgerBtn.classList.toggle("open", !isOpen);
});

// Close hamburger when clicking outside
document.addEventListener("click", (e) => {
    if (!hamburgerBtn.contains(e.target) && !hamburgerDropdown.contains(e.target)) {
        hamburgerDropdown.classList.remove("open");
        hamburgerBtn.classList.remove("open");
    }
});

// =============================================
// NEW CHAT (point 3)
// =============================================
document.getElementById("new-chat-btn").addEventListener("click", () => {
    // Close the dropdown
    hamburgerDropdown.classList.remove("open");
    hamburgerBtn.classList.remove("open");

    // Save current session then create a fresh one
    saveCurrentSession();
    const newSession = createSession("New Chat");
    loadSession(newSession.id);
});

// =============================================
// SESSIONS
// =============================================
const SESSIONS_KEY = "codemind_sessions";
const ACTIVE_KEY = "codemind_active_session";

function getSessions() {
    try { return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || []; }
    catch { return []; }
}

function saveSessions(sessions) {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function createSession(name) {
    const session = {
        id: Date.now().toString(),
        name: name || "New Chat",
        language: "",
        messages: [],    // {role, content}
        history: [],     // chatHistory array
        created: new Date().toISOString()
    };
    const sessions = getSessions();
    sessions.unshift(session);
    saveSessions(sessions);
    return session;
}

function loadSession(sessionId) {
    const sessions = getSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    currentSessionId = sessionId;
    localStorage.setItem(ACTIVE_KEY, sessionId);

    // Restore language
    selectedLanguage = session.language || "";
    languageSelect.value = selectedLanguage;
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

    // Restore chat history
    chatHistory = session.history || [];

    // Re-render messages
    messagesContainer.innerHTML = "";
    if (session.messages && session.messages.length > 0) {
        welcomeScreen.style.display = "none";
        session.messages.forEach(m => {
            if (m.role === "user") addUserMessage(m.content, false);
            else addAIMessageStatic(m.content);
        });
    } else {
        welcomeScreen.style.display = "block";
    }

    renderSessionsList();
    closeSessions();
}

function saveCurrentSession() {
    if (!currentSessionId) return;
    const sessions = getSessions();
    const idx = sessions.findIndex(s => s.id === currentSessionId);
    if (idx === -1) return;
    sessions[idx].language = selectedLanguage;
    sessions[idx].history = chatHistory;
    saveSessions(sessions);
}

function saveMessageToSession(role, content) {
    if (!currentSessionId) return;
    const sessions = getSessions();
    const idx = sessions.findIndex(s => s.id === currentSessionId);
    if (idx === -1) return;
    if (!sessions[idx].messages) sessions[idx].messages = [];
    sessions[idx].messages.push({ role, content });
    // Update session name from first user message
    if (role === "user" && sessions[idx].messages.filter(m => m.role === "user").length === 1) {
        sessions[idx].name = content.slice(0, 40) + (content.length > 40 ? "…" : "");
    }
    saveSessions(sessions);
}

function renderSessionsList() {
    const list = document.getElementById("sessions-list");
    const sessions = getSessions();
    if (!sessions.length) {
        list.innerHTML = `<div class="history-empty"><p>No sessions yet</p><span>Click "+ New" to start</span></div>`;
        return;
    }
    list.innerHTML = sessions.map(s => `
        <div class="session-item ${s.id === currentSessionId ? "active" : ""}" data-id="${s.id}">
            <button class="session-item-btn">
                <div class="session-name">${s.name}</div>
                <div class="session-meta">${new Date(s.created).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
            </button>
            <div class="session-actions">
                <button class="session-action-btn rename" title="Rename">✏️</button>
                <button class="session-action-btn del" title="Delete">🗑</button>
            </div>
        </div>`).join("");

    list.querySelectorAll(".session-item").forEach(el => {
        el.querySelector(".session-item-btn").addEventListener("click", () => loadSession(el.dataset.id));
        el.querySelector(".rename").addEventListener("click", e => {
            e.stopPropagation();
            const newName = prompt("Rename session:", el.querySelector(".session-name").textContent);
            if (!newName) return;
            const sessions = getSessions();
            const s = sessions.find(s => s.id === el.dataset.id);
            if (s) { s.name = newName; saveSessions(sessions); renderSessionsList(); }
        });
        el.querySelector(".del").addEventListener("click", e => {
            e.stopPropagation();
            if (!confirm("Delete this session?")) return;
            let sessions = getSessions().filter(s => s.id !== el.dataset.id);
            saveSessions(sessions);
            if (el.dataset.id === currentSessionId) {
                if (sessions.length) loadSession(sessions[0].id);
                else { currentSessionId = null; messagesContainer.innerHTML = ""; welcomeScreen.style.display = "block"; }
            }
            renderSessionsList();
        });
    });
}

function openSessions() {
    document.getElementById("sessions-panel").classList.add("open");
    document.getElementById("sessions-overlay").classList.add("open");
    document.getElementById("sessions-btn").classList.add("active");
    renderSessionsList();
}
function closeSessions() {
    document.getElementById("sessions-panel").classList.remove("open");
    document.getElementById("sessions-overlay").classList.remove("open");
    document.getElementById("sessions-btn").classList.remove("active");
}

document.getElementById("sessions-btn").addEventListener("click", () => {
    document.getElementById("sessions-panel").classList.contains("open") ? closeSessions() : openSessions();
});
document.getElementById("sessions-close").addEventListener("click", closeSessions);
document.getElementById("sessions-overlay").addEventListener("click", closeSessions);
document.getElementById("new-session-btn").addEventListener("click", () => {
    saveCurrentSession();
    const s = createSession("New Chat");
    loadSession(s.id);
});

// =============================================
// EXPORT CHAT
// =============================================
document.getElementById("export-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("export-dropdown").classList.toggle("open");
});
document.addEventListener("click", () => document.getElementById("export-dropdown").classList.remove("open"));

document.getElementById("export-md").addEventListener("click", () => {
    const sessions = getSessions();
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session || !session.messages?.length) { alert("No messages to export."); return; }

    let md = `# CodeMind Chat Export\n**Session:** ${session.name}\n**Date:** ${new Date().toLocaleString()}\n\n---\n\n`;
    session.messages.forEach(m => {
        md += m.role === "user"
            ? `### 🧑 You\n${m.content}\n\n`
            : `### 🤖 CodeMind AI\n${m.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `codemind-${Date.now()}.md`; a.click();
    URL.revokeObjectURL(url);
});

document.getElementById("export-pdf").addEventListener("click", () => {
    const sessions = getSessions();
    const session = sessions.find(s => s.id === currentSessionId);
    if (!session || !session.messages?.length) { alert("No messages to export."); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40, pageW = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;

    const addText = (text, fontSize, color, bold) => {
        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        const lines = doc.splitTextToSize(text, pageW);
        lines.forEach(line => {
            if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
            doc.text(line, margin, y);
            y += fontSize * 1.4;
        });
    };

    addText("CodeMind Chat Export", 20, [30, 30, 30], true);
    addText(`Session: ${session.name}`, 11, [100, 100, 100], false);
    addText(`Exported: ${new Date().toLocaleString()}`, 11, [100, 100, 100], false);
    y += 10;

    session.messages.forEach(m => {
        y += 8;
        if (m.role === "user") {
            addText("You:", 12, [9, 105, 218], true);
        } else {
            addText("CodeMind AI:", 12, [26, 127, 55], true);
        }
        const plain = m.content.replace(/```[\s\S]*?```/g, "[code block]").replace(/[#*_`]/g, "");
        addText(plain, 11, [50, 50, 50], false);
        y += 6;
    });

    doc.save(`codemind-${Date.now()}.pdf`);
});

// =============================================
// VOICE INPUT
// =============================================
let recognition = null;
const voiceBtn = document.getElementById("voice-btn");

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        voiceBtn.classList.add("listening");
        voiceBtn.title = "Listening... click to stop";
    };

    recognition.onresult = (e) => {
        const transcript = Array.from(e.results).map(r => r[0].transcript).join("");
        chatInput.value = transcript;
        chatInput.style.height = "auto";
        chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + "px";
    };

    recognition.onend = () => {
        voiceBtn.classList.remove("listening");
        voiceBtn.title = "Voice input";
    };

    recognition.onerror = () => {
        voiceBtn.classList.remove("listening");
        voiceBtn.title = "Voice input";
    };

    voiceBtn.addEventListener("click", () => {
        if (voiceBtn.classList.contains("listening")) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });
} else {
    voiceBtn.style.display = "none";
}

// =============================================
// CODE EXECUTION
// =============================================
async function runCode(code, language, outputEl, btn) {
    btn.disabled = true;
    btn.textContent = "▶ Running...";
    outputEl.style.display = "block";
    outputEl.className = "code-output";
    outputEl.textContent = "Executing...";

    // Strip markdown fences before sending
    const cleanCode = code
        .replace(/^```[a-zA-Z+#\-]*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();

    try {
        const res = await fetch("/api/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: cleanCode, language: language || selectedLanguage || "python" })
        });
        const data = await res.json();
        if (data.error) {
            outputEl.className = "code-output error";
            outputEl.textContent = "Error: " + data.error;
        } else {
            outputEl.textContent = data.output || "(no output)";
            outputEl.className = "code-output" + (data.status?.toLowerCase().includes("error") ? " error" : "");
        }
    } catch (err) {
        outputEl.className = "code-output error";
        outputEl.textContent = "Network error — is the server running?";
    }

    btn.disabled = false;
    btn.innerHTML = "▶ Run again";
}

function attachRunButtons(container) {
    container.querySelectorAll("pre").forEach(pre => {
        if (pre.querySelector(".run-code-btn")) return;
        const code = pre.querySelector("code");
        if (!code) return;

        const cls = code.className || "";
        const langMatch = cls.match(/language-(\w+)/);
        const lang = langMatch ? langMatch[1] : (selectedLanguage || "python");

        const runnable = ["python", "javascript", "java", "c", "cpp", "csharp", "ruby", "go", "rust", "typescript", "php", "swift", "kotlin"].includes(lang.toLowerCase());
        if (!runnable) return;

        const wrap = document.createElement("div");
        const btn = document.createElement("button");
        const outLabel = document.createElement("div");
        const outEl = document.createElement("div");

        btn.className = "run-code-btn";
        btn.innerHTML = "▶ Run code";
        outLabel.className = "code-output-label";
        outLabel.textContent = "Output";
        outEl.className = "code-output";
        outEl.style.display = "none";

        // Use innerText to get clean code without fences
        btn.addEventListener("click", () => runCode(code.innerText, lang, outEl, btn));

        wrap.appendChild(btn);
        wrap.appendChild(outLabel);
        wrap.appendChild(outEl);
        pre.after(wrap);
    });
}

// =============================================
// LANGUAGE SELECTION
// =============================================
languageSelect.addEventListener("change", function () {
    selectedLanguage = this.value;
    saveCurrentSession();
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
// TOPIC MODAL
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
            attachRunButtons(modalBody);
        }
    } catch (err) {
        modalBody.innerHTML = `<p style="color:var(--red)">Error loading topic info.</p>`;
    }
}

modalClose.addEventListener("click", () => { modalOverlay.style.display = "none"; topicBreadcrumb.textContent = ""; });
modalOverlay.addEventListener("click", e => { if (e.target === modalOverlay) { modalOverlay.style.display = "none"; topicBreadcrumb.textContent = ""; } });

// =============================================
// COPY HELPER
// =============================================
function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add("copied");
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!`;
        setTimeout(() => {
            btn.classList.remove("copied");
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/></svg> Copy`;
        }, 2000);
    });
}

// =============================================
// TYPEWRITER
// =============================================
async function typewriterStream(container, fullText, chatAreaEl) {
    let charIndex = 0;
    const CHARS_PER_TICK = 4, TICK_MS = 16;
    const wasAtBottom = (chatAreaEl.scrollHeight - chatAreaEl.scrollTop - chatAreaEl.clientHeight) < 80;

    return new Promise(resolve => {
        function tick() {
            if (stopRequested) {
                const partial = fullText.slice(0, charIndex);
                container.innerHTML = marked.parse(partial || "*Response stopped.*");
                container.querySelectorAll("pre code").forEach(el => hljs.highlightElement(el));
                container.querySelectorAll("pre").forEach(pre => addCodeCopyBtn(pre));
                attachRunButtons(container);
                const tag = document.createElement("span");
                tag.className = "stopped-tag"; tag.textContent = "⏹ Stopped";
                container.appendChild(tag);
                resolve(); return;
            }
            if (charIndex >= fullText.length) {
                container.innerHTML = marked.parse(fullText);
                container.querySelectorAll("pre code").forEach(el => hljs.highlightElement(el));
                container.querySelectorAll("pre").forEach(pre => addCodeCopyBtn(pre));
                attachRunButtons(container);
                if (wasAtBottom) chatAreaEl.scrollTop = chatAreaEl.scrollHeight;
                resolve(); return;
            }
            charIndex = Math.min(charIndex + CHARS_PER_TICK, fullText.length);
            container.innerHTML = marked.parse(fullText.slice(0, charIndex) + "\u200B");
            appendCursor(container);
            if (wasAtBottom) chatAreaEl.scrollTop = chatAreaEl.scrollHeight;
            setTimeout(tick, TICK_MS);
        }
        tick();
    });
}

function appendCursor(container) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let lastNode = null, node;
    while ((node = walker.nextNode())) { if (node.textContent.trim()) lastNode = node; }
    if (lastNode) {
        const cursor = document.createElement("span");
        cursor.className = "cursor-blink"; cursor.textContent = "▌";
        lastNode.parentNode.insertBefore(cursor, lastNode.nextSibling);
    }
}

function addCodeCopyBtn(pre) {
    if (pre.querySelector(".code-copy-btn")) return;
    const code = pre.querySelector("code"); if (!code) return;
    const btn = document.createElement("button");
    btn.className = "code-copy-btn";
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/></svg> Copy code`;
    btn.addEventListener("click", () => copyToClipboard(code.innerText, btn));
    pre.style.position = "relative"; pre.appendChild(btn);
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}

// =============================================
// MESSAGES
// =============================================
function addUserMessage(text, save = true) {
    if (welcomeScreen.style.display !== "none") welcomeScreen.style.display = "none";
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
    msg.querySelector(".copy-msg-btn").addEventListener("click", function () { copyToClipboard(text, this); });
    messagesContainer.appendChild(msg);
    msg.scrollIntoView({ behavior: "smooth", block: "end" });
    if (save) saveMessageToSession("user", text);
    return msg;
}

function addAIMessageStatic(text) {
    if (welcomeScreen.style.display !== "none") welcomeScreen.style.display = "none";
    const msg = document.createElement("div");
    msg.className = "message ai";
    msg.innerHTML = `
        <div class="msg-avatar ai-avatar">⟨/⟩</div>
        <div class="msg-content">
            <div class="msg-meta"><span class="msg-name">CodeMind AI</span><span class="ai-badge">AI</span></div>
            <div class="msg-bubble"><div class="ai-response-body"></div></div>
        </div>`;
    const body = msg.querySelector(".ai-response-body");
    body.innerHTML = marked.parse(text);
    body.querySelectorAll("pre code").forEach(el => hljs.highlightElement(el));
    body.querySelectorAll("pre").forEach(pre => addCodeCopyBtn(pre));
    attachRunButtons(body);
    messagesContainer.appendChild(msg);
    return msg;
}

async function addAIMessage(text, isError = false) {
    if (welcomeScreen.style.display !== "none") welcomeScreen.style.display = "none";
    const msg = document.createElement("div");
    msg.className = "message ai";
    msg.innerHTML = `
        <div class="msg-avatar ai-avatar">⟨/⟩</div>
        <div class="msg-content">
            <div class="msg-meta"><span class="msg-name">CodeMind AI</span><span class="ai-badge">AI</span></div>
            <div class="msg-bubble${isError ? " error" : ""}"><div class="ai-response-body"></div></div>
        </div>`;
    messagesContainer.appendChild(msg);
    const body = msg.querySelector(".ai-response-body");
    if (isError) {
        body.innerHTML = `<span style="color:var(--red)">${text}</span>`;
    } else {
        await typewriterStream(body, text, chatArea);
        saveMessageToSession("assistant", text);
    }
    return msg;
}

function addTypingIndicator() {
    const msg = document.createElement("div");
    msg.className = "message ai"; msg.id = "typing-indicator";
    msg.innerHTML = `
        <div class="msg-avatar ai-avatar">⟨/⟩</div>
        <div class="msg-content">
            <div class="msg-meta"><span class="msg-name">CodeMind AI</span></div>
            <div class="msg-bubble"><div class="loading-dots"><span></span><span></span><span></span></div></div>
        </div>`;
    messagesContainer.appendChild(msg);
    msg.scrollIntoView({ behavior: "smooth", block: "end" });
}
function removeTypingIndicator() { document.getElementById("typing-indicator")?.remove(); }

// =============================================
// SEND / STOP
// =============================================
function setSendState(state) {
    if (state === "stop") {
        sendBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>`;
        sendBtn.title = "Stop generating";
        sendBtn.classList.add("stop-mode");
        sendBtn.disabled = false;
    } else {
        sendBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        sendBtn.title = "Send message";
        sendBtn.classList.remove("stop-mode");
        sendBtn.disabled = false;
    }
}

async function sendMessage(message) {
    if (!message.trim() || isLoading) return;
    isLoading = true; stopRequested = false;
    setSendState("stop");
    chatInput.value = ""; chatInput.style.height = "auto";

    addUserMessage(message);
    addToHistory(message, selectedLanguage);
    chatHistory.push({ role: "user", content: message });
    saveCurrentSession();
    addTypingIndicator();

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, language: selectedLanguage, history: chatHistory.slice(0, -1) })
        });
        const data = await res.json();
        removeTypingIndicator();
        if (stopRequested) {
            await addAIMessage("*Response stopped by user.*");
        } else if (data.error) {
            await addAIMessage(`❌ Error: ${data.error}`, true);
        } else {
            await addAIMessage(data.response);
            if (!stopRequested) chatHistory.push({ role: "assistant", content: data.response });
        }
    } catch (err) {
        removeTypingIndicator();
        if (!stopRequested) await addAIMessage("❌ Network error.", true);
    }

    isLoading = false; stopRequested = false;
    setSendState("send");
    saveCurrentSession();
    chatInput.focus();
}

// =============================================
// HISTORY
// =============================================
const HISTORY_KEY = "codemind_history";

function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
}
function saveHistory(h) { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }

function addToHistory(question, language) {
    const history = loadHistory();
    const entry = { id: Date.now(), question: question.trim(), language: language || "General", timestamp: new Date().toISOString() };
    if (history.length && history[0].question === entry.question) return;
    history.unshift(entry);
    if (history.length > 200) history.splice(200);
    saveHistory(history);
}

function deleteHistoryItem(id) { saveHistory(loadHistory().filter(h => h.id !== id)); renderHistoryPanel(document.getElementById("history-search").value); }

function clearAllHistory() { if (confirm("Clear all history?")) { localStorage.removeItem(HISTORY_KEY); renderHistoryPanel(""); } }

function formatHistoryDate(iso) {
    const d = new Date(iso), now = new Date();
    const yes = new Date(now); yes.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return "Today";
    if (d.toDateString() === yes.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
function formatHistoryTime(iso) { return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); }

function renderHistoryPanel(filterText = "") {
    const list = document.getElementById("history-list");
    const history = loadHistory();
    const query = filterText.toLowerCase().trim();
    const filtered = query ? history.filter(h => h.question.toLowerCase().includes(query) || h.language.toLowerCase().includes(query)) : history;

    if (!filtered.length) {
        list.innerHTML = `<div class="history-empty"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" opacity="0.3"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><p>${query ? "No results" : "No history yet"}</p><span>${query ? "Try another search" : "Your questions will appear here"}</span></div>`;
        return;
    }

    const groups = {};
    filtered.forEach(item => { const l = formatHistoryDate(item.timestamp); if (!groups[l]) groups[l] = []; groups[l].push(item); });
    list.innerHTML = "";
    Object.entries(groups).forEach(([label, items]) => {
        const g = document.createElement("div"); g.className = "history-date-group";
        g.innerHTML = `<span class="history-date-label">${label}</span>`;
        items.forEach(item => {
            const el = document.createElement("div"); el.className = "history-item";
            el.innerHTML = `
                <button class="history-item-btn" title="${item.question}">
                    <div class="history-item-q">${item.question}</div>
                    <div class="history-item-meta">
                        <span class="history-item-lang">${item.language}</span>
                        <span class="history-item-time">${formatHistoryTime(item.timestamp)}</span>
                    </div>
                </button>
                <button class="history-item-del" title="Delete">✕</button>`;
            el.querySelector(".history-item-btn").addEventListener("click", () => {
                closeHistoryPanel();
                if (item.language !== "General") { languageSelect.value = item.language; languageSelect.dispatchEvent(new Event("change")); }
                chatInput.value = item.question;
                sendMessage(item.question);
            });
            el.querySelector(".history-item-del").addEventListener("click", e => { e.stopPropagation(); deleteHistoryItem(item.id); });
            g.appendChild(el);
        });
        list.appendChild(g);
    });
}

function openHistoryPanel() {
    document.getElementById("history-panel").classList.add("open");
    document.getElementById("history-overlay").classList.add("open");
    // Mark the hamburger btn as active when history is open
    hamburgerBtn.classList.add("open");
    hamburgerDropdown.classList.remove("open");
    renderHistoryPanel(document.getElementById("history-search").value);
}
function closeHistoryPanel() {
    document.getElementById("history-panel").classList.remove("open");
    document.getElementById("history-overlay").classList.remove("open");
    hamburgerBtn.classList.remove("open");
}

// History button is now inside the hamburger dropdown
document.getElementById("history-btn").addEventListener("click", () => {
    hamburgerDropdown.classList.remove("open");
    hamburgerBtn.classList.remove("open");
    document.getElementById("history-panel").classList.contains("open") ? closeHistoryPanel() : openHistoryPanel();
});
document.getElementById("history-close").addEventListener("click", closeHistoryPanel);
document.getElementById("history-overlay").addEventListener("click", closeHistoryPanel);
document.getElementById("history-clear-all").addEventListener("click", clearAllHistory);
document.getElementById("history-search").addEventListener("input", function () { renderHistoryPanel(this.value); });

// =============================================
// RANDOM QUICK QUESTIONS
// =============================================
const ALL_QUICK_QUESTIONS = [
    "What is a decorator in Python?", "Explain async/await in JavaScript",
    "How does a linked list work?", "What is Big O notation?",
    "Explain recursion with an example", "What is the difference between == and === in JavaScript?",
    "How do pointers work in C?", "What is a closure in JavaScript?",
    "Explain OOP concepts with examples", "What is the difference between stack and heap memory?",
    "How does garbage collection work in Java?", "What is a REST API?",
    "Explain the concept of multithreading", "What is a binary search tree?",
    "How does SQL JOIN work?", "What is the difference between list and tuple in Python?",
    "Explain the MVC design pattern", "What are lambda functions?",
    "How does hashing work?", "What is a deadlock in programming?",
    "Explain promises in JavaScript", "What is the difference between abstract class and interface?",
    "How does memory management work in C++?", "What is tail recursion?",
    "Explain the difference between GET and POST requests",
];

window.addEventListener("load", () => {
    const container = document.getElementById("quick-starts");
    if (!container) return;
    const pool = [...ALL_QUICK_QUESTIONS];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    container.innerHTML = pool.slice(0, 4).map(q =>
        `<button class="quick-btn" onclick="quickAsk('${q.replace(/'/g, "\\'")}')">${q}</button>`
    ).join("");
});

// =============================================
// EVENT LISTENERS
// =============================================
sendBtn.addEventListener("click", () => {
    if (isLoading) { stopRequested = true; } else { sendMessage(chatInput.value); }
});

chatInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(this.value); }
});

chatInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 140) + "px";
});

menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
document.addEventListener("click", e => {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) sidebar.classList.remove("open");
});

function quickAsk(q) { chatInput.value = q; sendMessage(q); }

// =============================================
// INIT
// =============================================
initTheme();

const sessions = getSessions();
const savedActive = localStorage.getItem(ACTIVE_KEY);
const target = sessions.find(s => s.id === savedActive) || sessions[0];
if (target) {
    loadSession(target.id);
} else {
    const s = createSession("New Chat");
    loadSession(s.id);
}
