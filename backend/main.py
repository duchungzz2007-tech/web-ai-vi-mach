import os
import json
import asyncio
from pathlib import Path
from typing import List, Optional
import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ollama_manager import (
    OLLAMA_BASE_URL,
    ensure_ollama_running,
    fetch_available_models,
    is_ollama_running,
)
from web_search import build_web_search_rag_context

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="Web AI Vi Mạch API",
    description="Backend API phục vụ Chatbot AI Vi Mạch & Bán Dẫn kèm Tra cứu Web Real-time",
    version="1.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """Bạn là 'AI Vi Mạch' - Trợ lý Trí tuệ Nhân tạo Chuyên gia về Vi Mạch, Bán Dẫn và Thiết kế Điện tử (Semiconductor & IC Design AI Assistant).
Nhiệm vụ của bạn là giải đáp chính xác, dễ hiểu và chuyên sâu các câu hỏi liên quan đến:
1. Quy trình thiết kế vi mạch (VLSI, ASIC, FPGA, RTL, Logic Synthesis, Layout, DRC/LVS).
2. Ngôn ngữ mô tả phần cứng (Verilog, SystemVerilog, VHDL).
3. Vật liệu và công nghệ bán dẫn (Silicon, GaN, SiC, Quang khắc Lithography, Doping, MOSFET, FinFET, GAAFET).
4. Các dòng chip bán dẫn thương mại thực tế (Apple A17 Pro, Apple M-series, Snapdragon, Intel Core Ultra, Exynos, AMD Ryzen, NVIDIA H100/B200...).
5. Tiêu chuẩn đánh giá hiệu năng, tiêu thụ điện năng và tính thân thiện môi trường của chip điện tử (carbon footprint, recycled materials, process node W/W per FLOP).

Hãy luôn trả lời bằng tiếng Việt lịch sự, trình bày rõ ràng từng mục, phân tích sâu chuyên môn và dẫn nguồn tham khảo nếu có dữ liệu tra cứu."""

class ChatMessage(BaseModel):
    role: str # 'user' or 'assistant' or 'system'
    content: str

class ChatRequest(BaseModel):
    prompt: str
    messages: Optional[List[ChatMessage]] = None
    model: Optional[str] = None
    web_search: Optional[bool] = True

@app.on_event("startup")
def on_startup():
    print("Checking and initializing Ollama backend...")
    ensure_ollama_running()

@app.get("/api/status")
async def get_status():
    running = is_ollama_running()
    models = await fetch_available_models() if running else []
    return {
        "status": "online" if running else "connecting",
        "ollama_running": running,
        "available_models": models,
        "default_model": models[0] if models else "vi-mach-ai"
    }

@app.get("/api/models")
async def get_models():
    models = await fetch_available_models()
    return {"models": models}

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    if not is_ollama_running():
        ensure_ollama_running()
        if not is_ollama_running():
            raise HTTPException(status_code=503, detail="Không thể kết nối tới Ollama AI Engine. Vui lòng kiểm tra lại dịch vụ.")

    models = await fetch_available_models()
    selected_model = req.model if (req.model and req.model in models) else (models[0] if models else "llama3")

    # Perform Web Search RAG if enabled or prompt requires real-time facts
    search_sources = []
    web_context = ""
    if req.web_search:
        try:
            web_context, search_sources = build_web_search_rag_context(req.prompt, max_results=4)
        except Exception as e:
            print("Web Search error:", e)

    # Build prompt/messages with RAG context
    system_prompt_with_rag = SYSTEM_PROMPT
    if web_context:
        system_prompt_with_rag += f"\n\n{web_context}"

    formatted_messages = [{"role": "system", "content": system_prompt_with_rag}]
    if req.messages and len(req.messages) > 0:
        for msg in req.messages:
            formatted_messages.append({"role": msg.role, "content": msg.content})
    else:
        formatted_messages.append({"role": "user", "content": req.prompt})

    payload = {
        "model": selected_model,
        "messages": formatted_messages,
        "stream": True,
        "options": {
            "num_gpu": 0
        }
    }

    async def event_generator():
        try:
            # First send sources metadata chunk if available
            if search_sources:
                yield f"data: {json.dumps({'sources': search_sources}, ensure_ascii=False)}\n\n"

            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json=payload
                ) as response:
                    if response.status_code != 200:
                        err_text = (await response.aread()).decode('utf-8', errors='ignore')
                        if response.status_code == 404:
                            msg = f"🌿 **Hệ thống AI Vi Mạch đã sẵn sàng!**\n\nHiện tại chưa tìm thấy mô hình AI (`{selected_model}`) trong thư mục local `ollama_models`.\n\n### 💡 Hướng dẫn bổ sung Model cho Hệ thống:\n- **Cách 1**: Tải mô hình mới bằng lệnh `ollama pull llama3` (hoặc `qwen2.5`, `phind-codellama`).\n- **Cách 2**: Copy file trọng số mô hình `.gguf` đã có vào thư mục `E:\\AI VI MACH\\ollama_models`.\n\nSau khi thêm model, tải lại trang web để bắt đầu trò chuyện với AI Vi Mạch!"
                            yield f"data: {json.dumps({'content': msg, 'done': True}, ensure_ascii=False)}\n\n"
                        else:
                            yield f"data: {json.dumps({'error': f'Lỗi Ollama ({response.status_code}): {err_text}'}, ensure_ascii=False)}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            content = data.get("message", {}).get("content", "")
                            done = data.get("done", False)
                            
                            chunk = {
                                "content": content,
                                "done": done
                            }
                            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
                            
                            if done:
                                break
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Mount Static Files for Frontend
app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")

@app.get("/")
async def read_index():
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>Frontend index.html chưa tạo!</h1>", status_code=404)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
