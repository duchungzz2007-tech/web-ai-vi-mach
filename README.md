# 🌿 Web AI Vi Mạch - Eco Green Edition

Hệ thống Web Chatbot Trí tuệ Nhân tạo Chuyên sâu về **Thiết kế Vi Mạch (VLSI/IC Design), Bán Dẫn và Lập trình Hardware (Verilog/VHDL)** tích hợp **Tra cứu Web Real-time (RAG)** và giao diện phong cách **ChatGPT Eco-Green**.

![Web AI Vi Mach Preview](frontend/css/style.css)

---

## 🌟 Tính năng Nổi bật

- **Giao diện ChatGPT Style**: Thanh bên Sidebar ẩn/mở, khung Chat trôi ở đáy, thiết kế màu xanh lá Eco-Green nhã nhặn.
- **Custom Model Dropdown**: Chọn lựa mô hình AI mượt mà (`vi-mach-ai`, `qwen2.5:1.5b`, `qwen2.5:0.5b`).
- **Tra cứu Web Real-time**: Tự động tìm kiếm thông tin mới nhất trên Internet về các dòng chip (Apple A17 Pro, M3/M4, Snapdragon...) và trích dẫn nguồn thực tế.
- **Tối ưu hóa CPU & GPU**: Hỗ trợ chạy CPU AVX/SIMD High-Performance không phụ thuộc card đồ họa.
- **Định dạng Mã nguồn & Toán học**: Hiển thị code Verilog/C++ kèm nút sao chép nhanh, công thức KaTeX sắc nét.

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy Cục bộ (Local)

### 1. Yêu cầu Tiền đề
- Python 3.10+
- Ollama Engine ([https://ollama.com](https://ollama.com))

### 2. Cài đặt Phụ thuộc
```bash
cd "Web AI Vi Mach"
pip install -r backend/requirements.txt
```

### 3. Tải Mô hình AI
```bash
ollama pull qwen2.5:0.5b
ollama create vi-mach-ai -f ../Modelfile
```

### 4. Chạy Web Server
```bash
python backend/main.py
```
Truy cập trình duyệt tại địa chỉ: `http://localhost:8000`

---

## ☁️ Hướng dẫn Deploy Web Online (Render / Railway / Vercel)

1. Đẩy mã nguồn lên **GitHub**.
2. Trên Render.com / Railway.app:
   - Tạo **Web Service** mới và kết nối với Repository GitHub này.
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `python backend/main.py` hoặc `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
