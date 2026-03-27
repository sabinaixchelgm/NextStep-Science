import os
import base64
from azure.ai.contentsafety import ContentSafetyClient
from azure.core.credentials import AzureKeyCredential
from azure.ai.contentsafety.models import AnalyzeTextOptions, AnalyzeImageOptions, ImageData

endpoint = os.getenv("CONTENT_SAFETY_ENDPOINT")
key = os.getenv("CONTENT_SAFETY_KEY")

if not endpoint or not key:
    client = None
else:
    client = ContentSafetyClient(endpoint, AzureKeyCredential(key))


def check_text(text: str) -> bool:
    if not text or not text.strip():
        return False

    if client is None:
        return False

    response = client.analyze_text(AnalyzeTextOptions(text=text))

    for category in response.categories_analysis:
        if category.severity >= 4:
            return True

    return False


def check_image(image_bytes: bytes) -> bool:
    if not image_bytes:
        return False

    if client is None:
        return False

    encoded = base64.b64encode(image_bytes).decode("utf-8")
    response = client.analyze_image(
        AnalyzeImageOptions(image=ImageData(content=encoded))
    )

    for category in response.categories_analysis:
        if category.severity >= 4:
            return True

    return False