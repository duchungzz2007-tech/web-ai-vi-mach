/* ==========================================================================
   AI VI MẠCH - FRONTEND SCRIPT (FIXED MODEL DROPDOWN SELECTION & GITHUB PAGES)
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

  let chatHistory = [];
  let isGenerating = false;
  let availableModelsList = ["vi-mach-ai:latest", "qwen2.5:1.5b", "qwen2.5:0.5b"];
  let currentSelectedModel = "vi-mach-ai:latest";
  let isWebSearchActive = true;

  // Determine API Host dynamically (Localhost vs GitHub Pages)
  const isLocalHost = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const API_BASE_URL = isLocalHost ? "" : "http://localhost:8000";

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
    if (modelName.includes("vi-mach-ai")) {
      return { title: "AI Vi Mạch Local", tag: "Chuyên biệt Bán Dẫn", icon: "🌿" };
    } else if (modelName.includes("1.5b")) {
      return { title: "Qwen 2.5 (1.5B)", tag: "Tốc độ & Suy luận cao", icon: "⚡" };
    } else if (modelName.includes("0.5b")) {
      return { title: "Qwen 2.5 (0.5B)", tag: "Siêu nhẹ & Nhanh", icon: "🚀" };
    }
    return { title: modelName, tag: "Ollama Model", icon: "🤖" };
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

  // Immediately initialize dropdown list and selected model title
  const initialMeta = getModelMetaData(currentSelectedModel);
  if (selectedModelTitle) {
    selectedModelTitle.textContent = initialMeta.title;
  }
  const triggerIcon = dropdownTrigger?.querySelector(".trigger-icon");
  if (triggerIcon) {
    triggerIcon.textContent = initialMeta.icon;
  }
  renderModelDropdownItems(availableModelsList);

  // Event Delegation for Dropdown Model Selection (Bulletproof Click Handling)
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

      customModelDropdown.classList.remove("open");
      dropdownMenu.classList.remove("show");
      renderModelDropdownItems(availableModelsList);
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

  // 3. Custom Glassmorphic Model Dropdown Trigger Logic
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
    try {
      const res = await fetch(`${API_BASE_URL}/api/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.ollama_running) {
          statusText.textContent = "Ollama Online";
          if (data.available_models && data.available_models.length > 0) {
            availableModelsList = data.available_models;
            if (!availableModelsList.includes(currentSelectedModel)) {
              currentSelectedModel = availableModelsList[0];
            }
            const meta = getModelMetaData(currentSelectedModel);
            if (selectedModelTitle) selectedModelTitle.textContent = meta.title;
            const iconSpan = dropdownTrigger?.querySelector(".trigger-icon");
            if (iconSpan) iconSpan.textContent = meta.icon;
            renderModelDropdownItems(availableModelsList);
          }
        } else {
          statusText.textContent = "Đang mở Ollama...";
        }
      } else {
        statusText.textContent = "Sẵn sàng (Local Engine)";
      }
    } catch (err) {
      statusText.textContent = isLocalHost ? "Ngoại tuyến" : "Sẵn sàng (Local Engine)";
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

  // 9. Form Submit & Streaming Chat
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
        throw new Error(`Server code: ${response.status}`);
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
              
              // Handle Sources Render inside msgContent
              if (data.sources && data.sources.length > 0) {
                renderSourcesList(msgContent, data.sources);
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

      chatHistory.push({ role: "assistant", content: fullText });
      renderMarkdown(textWrapper, fullText, true);

    } catch (err) {
      console.error("Streaming error:", err);
      const serverNotice = `🌿 **Giao diện Web AI Vi Mạch đã sẵn sàng!**\n\nĐể kết nối với AI Engine và sinh câu trả lời cục bộ trên máy của bạn:\n1. Hãy mở file **Run_Web_AI_ViMach.bat** trong thư mục dự án.\n2. Hoặc khởi chạy backend server tại \`http://localhost:8000\`.\n\n*(Chi tiết chi tiết xem tại file README.md trong mã nguồn)*.`;
      renderMarkdown(textWrapper, serverNotice, true);
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

  // Append Message DOM (Clean Layout Guarantee)
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
