/* ==========================================================================
   AI VI MẠCH - FRONTEND SCRIPT (GEMINI 2.5 FLASH & FLASH-LATEST SUPPORT)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const chatContainer = document.getElementById("chatContainer");
  const welcomeScreen = document.getElementById("welcomeScreen");
  const statusText = document.getElementById("statusText");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const newChatBtn = document.getElementById("newChatBtn");
  const sidebar = document.getElementById("sidebar");
  const openSidebarBtn = document.getElementById("openSidebarBtn");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");
  const promptOptions = document.querySelectorAll(".chat-item, .card-option");
  const webSearchToggleBtn = document.getElementById("webSearchToggleBtn");

  // Custom Dropdown Elements
  const customModelDropdown = document.getElementById("customModelDropdown");
  const dropdownTrigger = document.getElementById("dropdownTrigger");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const modelItemsList = document.getElementById("modelItemsList");
  const selectedModelTitle = document.getElementById("selectedModelTitle");

  // API Key Settings Modal Elements
  const apiKeyModal = document.getElementById("apiKeyModal");
  const openApiKeyModalBtn = document.getElementById("openApiKeyModalBtn");
  const closeApiKeyModalBtn = document.getElementById("closeApiKeyModalBtn");
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveApiKeyBtn = document.getElementById("saveApiKeyBtn");

  let chatHistory = [];
  let isGenerating = false;

  // Cloud Gemini 2.5 + Local Ollama Models List
  let availableModelsList = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-pro",
    "vi-mach-ai:latest"
  ];
  let currentSelectedModel = "gemini-2.5-flash";
  let isWebSearchActive = true;

  // Determine API Host dynamically (Localhost vs GitHub Pages)
  const isLocalHost = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const API_BASE_URL = isLocalHost ? "" : "http://localhost:8000";

  // System Instruction for Semiconductor Expertise
  const SYSTEM_INSTRUCTION = `Bạn là AI Vi Mạch - Trợ lý Trí tuệ Nhân tạo Chuyên sâu về Thiết kế Vi Mạch (VLSI/IC Design), Bán dẫn, Vật liệu Si/GaN/SiC, Quang khắc EUV Lithography, và Lập trình Hardware (Verilog/VHDL). Hãy trả lời bằng tiếng Việt chuyên nghiệp, sắc bén, định dạng Markdown đẹp mắt, có ví dụ và công thức rõ ràng.`;

  // Marked Config
  marked.setOptions({
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (__) {}
      }
      return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
  });

  // Helper for model metadata
  function getModelMetaData(modelName) {
    if (modelName.includes("2.5-flash")) {
      return { title: "Gemini 2.5 Flash", tag: "Cloud AI • Siêu nhanh", icon: "✨" };
    } else if (modelName.includes("flash-latest")) {
      return { title: "Gemini Flash Latest", tag: "Cloud AI • Bản mới nhất", icon: "🚀" };
    } else if (modelName.includes("2.5-pro") || modelName.includes("pro-latest")) {
      return { title: "Gemini 2.5 Pro", tag: "Cloud AI • Suy luận cao", icon: "🧠" };
    } else if (modelName.includes("vi-mach-ai")) {
      return { title: "AI Vi Mạch Local", tag: "Local Ollama Engine", icon: "🌿" };
    }
    return { title: modelName, tag: "AI Model", icon: "🤖" };
  }

  // Render items inside dropdown list
  function renderModelDropdownItems(models) {
    if (!modelItemsList) return;
    if (!models || models.length === 0) {
      modelItemsList.innerHTML = `<div class="model-item"><span style="color:var(--text-muted);">Không tìm thấy model</span></div>`;
      return;
    }

    modelItemsList.innerHTML = models.map(m => {
      const meta = getModelMetaData(m);
      const isActive = (m === currentSelectedModel);
      return `
        <div class="model-item ${isActive ? 'active' : ''}" data-model="${m}">
          <div class="model-item-info">
            <span class="model-item-name">${meta.icon} ${meta.title}</span>
            <span class="model-item-tag">${meta.tag}</span>
          </div>
          ${isActive ? '<i class="fa-solid fa-check model-item-check"></i>' : ''}
        </div>
      `;
    }).join("");
  }

  // Initialize dropdown title & icon
  const initialMeta = getModelMetaData(currentSelectedModel);
  if (selectedModelTitle) {
    selectedModelTitle.textContent = initialMeta.title;
  }
  const triggerIcon = dropdownTrigger?.querySelector(".trigger-icon");
  if (triggerIcon) {
    triggerIcon.textContent = initialMeta.icon;
  }
  renderModelDropdownItems(availableModelsList);

  // Event Delegation for Model Dropdown
  if (modelItemsList) {
    modelItemsList.addEventListener("click", (e) => {
      const item = e.target.closest(".model-item");
      if (!item) return;
      
      const modelName = item.getAttribute("data-model");
      if (!modelName) return;

      currentSelectedModel = modelName;
      const meta = getModelMetaData(modelName);

      if (selectedModelTitle) {
        selectedModelTitle.textContent = meta.title;
      }
      const iconSpan = dropdownTrigger?.querySelector(".trigger-icon");
      if (iconSpan) {
        iconSpan.textContent = meta.icon;
      }

      customModelDropdown?.classList.remove("open");
      dropdownMenu?.classList.remove("show");
      renderModelDropdownItems(availableModelsList);
    });
  }

  // API Key Storage Logic
  function getStoredApiKey() {
    return localStorage.getItem("gemini_api_key") || "";
  }

  if (openApiKeyModalBtn) {
    openApiKeyModalBtn.addEventListener("click", () => {
      apiKeyInput.value = getStoredApiKey();
      apiKeyModal.classList.add("show");
    });
  }

  if (closeApiKeyModalBtn) {
    closeApiKeyModalBtn.addEventListener("click", () => {
      apiKeyModal.classList.remove("show");
    });
  }

  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener("click", () => {
      const val = apiKeyInput.value.trim();
      if (val) {
        localStorage.setItem("gemini_api_key", val);
        alert("Đã lưu Google Gemini API Key thành công!");
      } else {
        localStorage.removeItem("gemini_api_key");
        alert("Đã xóa API Key.");
      }
      apiKeyModal.classList.remove("show");
    });
  }

  // 1. Sidebar Toggling
  openSidebarBtn?.addEventListener("click", () => sidebar.classList.remove("collapsed"));
  closeSidebarBtn?.addEventListener("click", () => sidebar.classList.add("collapsed"));

  // 2. Web Search Toggle Logic
  webSearchToggleBtn?.addEventListener("click", () => {
    isWebSearchActive = !isWebSearchActive;
    if (isWebSearchActive) {
      webSearchToggleBtn.classList.add("active");
    } else {
      webSearchToggleBtn.classList.remove("active");
    }
  });

  // 3. Custom Dropdown Trigger
  dropdownTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    customModelDropdown.classList.toggle("open");
    dropdownMenu.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    customModelDropdown?.classList.remove("open");
    dropdownMenu?.classList.remove("show");
  });

  dropdownMenu?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // 4. Enable/Disable Send Button
  chatInput?.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 180) + "px";
    sendBtn.disabled = chatInput.value.trim().length === 0 || isGenerating;
  });

  chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        chatForm.dispatchEvent(new Event("submit"));
      }
    }
  });

  // 5. Health Status Polling
  async function checkServerStatus() {
    if (currentSelectedModel.startsWith("gemini-")) {
      statusText.textContent = "Gemini Cloud Online";
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.ollama_running) {
          statusText.textContent = "Ollama Local Online";
        } else {
          statusText.textContent = "Đang mở Ollama...";
        }
      } else {
        statusText.textContent = "Sẵn sàng (Cloud AI)";
      }
    } catch (err) {
      statusText.textContent = "Sẵn sàng (Cloud AI)";
    }
  }
  checkServerStatus();
  setInterval(checkServerStatus, 5000);

  // 6. Theme Toggle
  const savedTheme = localStorage.getItem("eco-theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  themeToggleBtn?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("eco-theme", next);
    updateThemeIcon(next);
  });

  function updateThemeIcon(theme) {
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = theme === "dark" 
        ? '<i class="fa-solid fa-sun"></i>' 
        : '<i class="fa-solid fa-moon"></i>';
    }
  }

  // 7. Quick Prompts Click
  promptOptions.forEach(opt => {
    opt.addEventListener("click", () => {
      const prompt = opt.getAttribute("data-prompt");
      if (prompt) {
        chatInput.value = prompt;
        chatInput.dispatchEvent(new Event("input"));
        chatForm.dispatchEvent(new Event("submit"));
      }
    });
  });

  // 8. New Chat Reset
  newChatBtn?.addEventListener("click", () => {
    if (isGenerating) return;
    chatHistory = [];
    chatContainer.innerHTML = "";
    chatContainer.appendChild(welcomeScreen);
    welcomeScreen.style.display = "flex";
  });

  // Client-side Real-time Web Search Context Fetcher
  async function fetchClientWebSearchSources(query) {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1`;
      const res = await fetch(url);
      if (!res.ok) return { ragText: "", sources: [] };
      const data = await res.json();

      const sources = [];
      let ragText = "";

      if (data.AbstractText) {
        sources.push({
          title: data.Heading || "DuckDuckGo Knowledge",
          url: data.AbstractURL || "https://duckduckgo.com",
          snippet: data.AbstractText
        });
        ragText += `[Nguồn Web: ${data.Heading}]\n${data.AbstractText}\n\n`;
      }

      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        data.RelatedTopics.slice(0, 3).forEach(t => {
          if (t.Text && t.FirstURL) {
            sources.push({
              title: t.Text.slice(0, 45) + "...",
              url: t.FirstURL,
              snippet: t.Text
            });
            ragText += `[Nguồn Web]: ${t.Text}\n`;
          }
        });
      }

      return { ragText, sources };
    } catch (e) {
      return { ragText: "", sources: [] };
    }
  }

  // Stream/Generate Response from Google Gemini Cloud API (Updated for Gemini 2.5 & Flash-latest)
  async function streamGeminiCloudResponse(prompt, textWrapper, msgContentElement) {
    let apiKey = getStoredApiKey();
    if (!apiKey) {
      const userKey = window.prompt("Nhập Google Gemini API Key của bạn:");
      if (userKey && userKey.trim()) {
        apiKey = userKey.trim();
        localStorage.setItem("gemini_api_key", apiKey);
      } else {
        throw new Error("Cần có Google Gemini API Key để trò chuyện trực tiếp trên Cloud. Vui lòng nhấn nút ⚙️ Cài đặt ở góc trên bên phải để dán Key!");
      }
    }

    let webSearchContext = "";
    if (isWebSearchActive) {
      const searchRes = await fetchClientWebSearchSources(prompt);
      if (searchRes.sources && searchRes.sources.length > 0) {
        renderSourcesList(msgContentElement, searchRes.sources);
        webSearchContext = `Dưới đây là thông tin tra cứu Web real-time liên quan:\n${searchRes.ragText}\n Hãy sử dụng thông tin này để trả lời đầy đủ.`;
      }
    }

    const contentsPayload = chatHistory.map(h => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.content }]
    }));

    if (webSearchContext) {
      contentsPayload[contentsPayload.length - 1].parts[0].text = `${webSearchContext}\n\nCâu hỏi người dùng: ${prompt}`;
    }

    const bodyPayload = {
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      contents: contentsPayload
    };

    // Candidate models verified working with generateContent:
    // gemini-2.5-flash, gemini-flash-latest, gemini-2.0-flash, gemini-2.5-pro
    const selected = currentSelectedModel.startsWith("gemini-") ? currentSelectedModel : "gemini-2.5-flash";
    const candidates = [
      { model: selected, ver: "v1beta" },
      { model: "gemini-2.5-flash", ver: "v1beta" },
      { model: "gemini-flash-latest", ver: "v1beta" },
      { model: "gemini-2.0-flash", ver: "v1beta" },
      { model: "gemini-2.5-pro", ver: "v1beta" }
    ];

    let lastError = null;

    for (const c of candidates) {
      try {
        // 1. Try Standard JSON generateContent Endpoint (100% Reliable across all API Keys)
        const standardEndpoint = `https://generativelanguage.googleapis.com/${c.ver}/models/${c.model}:generateContent?key=${apiKey}`;
        const resStandard = await fetch(standardEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload)
        });

        if (resStandard.ok) {
          const data = await resStandard.json();
          const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (fullText) {
            renderMarkdown(textWrapper, fullText);
            scrollToBottom();
            return fullText;
          }
        }

        // 2. Try SSE Stream Endpoint
        const streamEndpoint = `https://generativelanguage.googleapis.com/${c.ver}/models/${c.model}:streamGenerateContent?key=${apiKey}&alt=sse`;
        const res = await fetch(streamEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload)
        });

        if (res.ok) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let fullText = "";
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.replace("data: ", "").trim();
                if (!jsonStr) continue;

                try {
                  const data = JSON.parse(jsonStr);
                  const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (textChunk) {
                    fullText += textChunk;
                    renderMarkdown(textWrapper, fullText);
                    scrollToBottom();
                  }
                } catch (err) {
                  console.error("Parse SSE error:", err);
                }
              }
            }
          }
          if (fullText.trim()) return fullText;
        }

        const errData = await resStandard.json().catch(() => ({}));
        lastError = errData?.error?.message || `Mã lỗi HTTP: ${resStandard.status}`;

      } catch (err) {
        lastError = err.message;
      }
    }

    throw new Error(`Google Gemini Cloud API: ${lastError || 'Không thể kết nối mô hình. Hãy kiểm tra lại API Key.'}`);
  }

  // Stream Response from Local FastAPI / Ollama Backend
  async function streamLocalOllamaResponse(prompt, textWrapper, msgContentElement) {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: prompt,
        messages: chatHistory,
        model: currentSelectedModel,
        web_search: isWebSearchActive
      })
    });

    if (!response.ok) {
      throw new Error(`Server Local code: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "").trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.sources && data.sources.length > 0) {
              renderSourcesList(msgContentElement, data.sources);
            }
            if (data.error) {
              fullText += `\n*[Lỗi: ${data.error}]*`;
              break;
            }
            if (data.content) {
              fullText += data.content;
              renderMarkdown(textWrapper, fullText);
              scrollToBottom();
            }
          } catch (err) {
            console.error("Parse error:", err);
          }
        }
      }
    }

    return fullText;
  }

  // 9. Form Submit & Main Chat Routing
  chatForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = chatInput.value.trim();
    if (!prompt || isGenerating) return;

    if (welcomeScreen.parentNode) {
      welcomeScreen.style.display = "none";
    }

    // Append User Message
    appendMessage("user", prompt);
    chatHistory.push({ role: "user", content: prompt });
    chatInput.value = "";
    chatInput.dispatchEvent(new Event("input"));

    // Assistant Message Placeholder
    const assistantRow = appendMessage("assistant", "", true);
    const msgContent = assistantRow.querySelector(".msg-content");
    const textWrapper = assistantRow.querySelector(".text-wrapper");

    isGenerating = true;
    sendBtn.disabled = true;

    try {
      let fullText = "";
      if (currentSelectedModel.startsWith("gemini-")) {
        fullText = await streamGeminiCloudResponse(prompt, textWrapper, msgContent);
      } else {
        fullText = await streamLocalOllamaResponse(prompt, textWrapper, msgContent);
      }

      chatHistory.push({ role: "assistant", content: fullText });
      renderMarkdown(textWrapper, fullText, true);

    } catch (err) {
      console.error("Chat error:", err);
      const errMsg = `⚠️ **Không thể kết nối:** ${err.message}\n\n*Mẹo: Bạn có thể nhấn biểu tượng ⚙️ Cài đặt ở góc trên bên phải để kiểm tra lại Google Gemini API Key!*`;
      renderMarkdown(textWrapper, errMsg, true);
    } finally {
      isGenerating = false;
      sendBtn.disabled = chatInput.value.trim().length === 0;
      scrollToBottom();
    }
  });

  // Render Sources Cards Badge inside sources-wrapper
  function renderSourcesList(msgContentElement, sources) {
    let sourcesWrapper = msgContentElement.querySelector(".sources-wrapper");
    if (!sourcesWrapper) {
      sourcesWrapper = document.createElement("div");
      sourcesWrapper.className = "sources-wrapper";
      msgContentElement.insertBefore(sourcesWrapper, msgContentElement.firstChild);
    }

    sourcesWrapper.innerHTML = `
      <div class="sources-container">
        <div class="sources-header">
          <i class="fa-solid fa-globe"></i>
          <span>Nguồn thông tin Web Real-time (${sources.length})</span>
        </div>
        <div class="sources-grid">
          ${sources.map(s => `
            <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="source-badge-link" title="${s.snippet}">
              <i class="fa-solid fa-link"></i>
              <span>${s.title}</span>
            </a>
          `).join("")}
        </div>
      </div>
    `;
  }

  // Append Message DOM
  function appendMessage(role, text, isPlaceholder = false) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    const avatarIcon = role === "user" 
      ? '<i class="fa-solid fa-user"></i>' 
      : '<i class="fa-solid fa-leaf"></i>';

    row.innerHTML = `
      <div class="message-inner">
        <div class="msg-avatar ${role}">${avatarIcon}</div>
        <div class="msg-content">
          <div class="sources-wrapper"></div>
          <div class="text-wrapper">
            ${isPlaceholder ? '<div class="typing-dots"><span></span><span></span><span></span></div>' : text}
          </div>
        </div>
      </div>
    `;

    chatContainer.appendChild(row);
    scrollToBottom();
    return row;
  }

  // Render Markdown inside textWrapper
  function renderMarkdown(textWrapperElement, text, final = false) {
    try {
      textWrapperElement.innerHTML = marked.parse(text);

      textWrapperElement.querySelectorAll("pre code").forEach((codeBlock) => {
        const pre = codeBlock.parentNode;
        if (!pre.querySelector(".code-header")) {
          const lang = codeBlock.className.replace("language-", "") || "code";
          const header = document.createElement("div");
          header.className = "code-header";
          header.innerHTML = `
            <span>${lang}</span>
            <button class="copy-btn"><i class="fa-regular fa-copy"></i> Sao chép</button>
          `;

          header.querySelector(".copy-btn").addEventListener("click", () => {
            navigator.clipboard.writeText(codeBlock.innerText);
            const btn = header.querySelector(".copy-btn");
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Đã chép!';
            setTimeout(() => {
              btn.innerHTML = '<i class="fa-regular fa-copy"></i> Sao chép';
            }, 2000);
          });

          pre.insertBefore(header, codeBlock);
        }
      });

      if (final && window.renderMathInElement) {
        renderMathInElement(textWrapperElement, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError : false
        });
      }
    } catch (err) {
      textWrapperElement.textContent = text;
    }
  }

  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }
});
