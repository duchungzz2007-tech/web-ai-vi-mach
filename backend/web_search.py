import logging
from typing import List, Dict
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("web_search")

def search_web_ddg(query: str, max_results: int = 4) -> List[Dict[str, str]]:
    results = []
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            ddg_gen = ddgs.text(query, max_results=max_results)
            for r in ddg_gen:
                results.append({
                    "title": r.get("title", ""),
                    "snippet": r.get("body", r.get("snippet", "")),
                    "url": r.get("href", r.get("url", ""))
                })
    except Exception as e:
        logger.warning(f"DuckDuckGo DDGS search failed: {e}. Trying HTML fallback...")

    # Fallback to direct HTML search if DDGS returns empty or fails
    if not results:
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            params = {"q": query}
            resp = httpx.get("https://html.duckduckgo.com/html/", params=params, headers=headers, timeout=6.0)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                for item in soup.find_all("div", class_="result")[:max_results]:
                    title_a = item.find("a", class_="result__a")
                    snippet_div = item.find("a", class_="result__snippet")
                    if title_a and snippet_div:
                        results.append({
                            "title": title_a.get_text(strip=True),
                            "snippet": snippet_div.get_text(strip=True),
                            "url": title_a.get("href", "")
                        })
        except Exception as ex:
            logger.error(f"HTML Web Search fallback failed: {ex}")

    return results

def build_web_search_rag_context(query: str, max_results: int = 4):
    results = search_web_ddg(query, max_results=max_results)
    
    if not results:
        return "", []

    rag_text = "\n\n=== DỮ LIỆU TRA CỨU WEB REAL-TIME ==="
    rag_text += f"\nCâu hỏi gốc người dùng: {query}\n"
    rag_text += "Dưới đây là thông tin thực tế mới nhất tìm kiếm được trên Internet. Hãy dựa vào dữ liệu này để trả lời chính xác, khách quan và trích dẫn các nguồn tham khảo:\n\n"

    sources = []
    for idx, item in enumerate(results, 1):
        title = item.get("title", "")
        snippet = item.get("snippet", "")
        url = item.get("url", "")
        
        rag_text += f"[{idx}] {title}\nURL: {url}\nNội dung: {snippet}\n\n"
        sources.append({"title": title, "url": url, "snippet": snippet})

    rag_text += "=== KẾT THÚC DỮ LIỆU TRA CỨU ===\n\n"
    rag_text += "Hãy tổng hợp câu trả lời bằng tiếng Việt, trình bày rõ ràng từng luận điểm, đánh giá tính thân thiện môi trường / thông số kỹ thuật thực tế và dẫn link các nguồn [Nguồn X](URL) ở cuối bài."

    return rag_text, sources

if __name__ == "__main__":
    context, sources = build_web_search_rag_context("Đánh giá con chip Apple A17 pro có thân thiện với môi trường không")
    print(context)
    print("Sources:", sources)
