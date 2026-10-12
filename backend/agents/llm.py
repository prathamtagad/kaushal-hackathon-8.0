import os
import json
import httpx
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from backend.config import settings
from backend.models import AgentOffer, Ask

class LLMClient(ABC):
    @abstractmethod
    async def generate_offer(
        self,
        system_prompt: str,
        user_prompt: str,
        zone_id: str,
        ask: Ask
    ) -> Dict[str, Any]:
        """Returns parsed dictionary matching AgentOffer schema."""
        pass

class MockLLMClient(LLMClient):
    """Deterministic offline mock LLM client with zero network dependency."""
    async def generate_offer(
        self,
        system_prompt: str,
        user_prompt: str,
        zone_id: str,
        ask: Ask
    ) -> Dict[str, Any]:
        from backend.agents.fallback import generate_fallback_offer
        from backend.sim.scenarios import scenario_manager
        
        # Parse state from prompt to find headroom if possible
        headroom = {"hvac": 25.0, "lighting": 12.0, "flexible": 18.0}
        offer = generate_fallback_offer(
            zone_id=zone_id,
            ask=ask,
            headroom_kw=headroom,
            is_exam_week=scenario_manager.is_exam_week(),
            temp_offset=scenario_manager.get_temp_offset()
        )
        return offer.model_dump()

class GeminiLLMClient(LLMClient):
    """Google Gemini API client with structured JSON output."""
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

    async def generate_offer(
        self,
        system_prompt: str,
        user_prompt: str,
        zone_id: str,
        ask: Ask
    ) -> Dict[str, Any]:
        if not self.api_key:
            return await MockLLMClient().generate_offer(system_prompt, user_prompt, zone_id, ask)

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        }
        
        async with httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_S) as client:
            response = await client.post(
                f"{self.base_url}?key={self.api_key}",
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            candidate_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(candidate_text)

def get_llm_client() -> LLMClient:
    mode = os.getenv("LLM_MODE", settings.LLM_MODE).lower()
    provider = os.getenv("LLM_PROVIDER", settings.LLM_PROVIDER).lower()
    gemini_key = os.getenv("GEMINI_API_KEY", settings.GEMINI_API_KEY)

    if mode == "mock" or not gemini_key:
        return MockLLMClient()
    
    if provider == "gemini":
        return GeminiLLMClient(gemini_key)
    
    # Default fallback
    return MockLLMClient()
