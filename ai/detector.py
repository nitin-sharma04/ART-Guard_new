# ai/detector.py

import os
import base64
import requests
import numpy as np
from PIL import Image
from io import BytesIO
from typing import Optional, Dict
import torch
from transformers import CLIPProcessor, CLIPModel
from sklearn.metrics.pairwise import cosine_similarity
import re # <--- Added missing import

# --- Pillow AVIF Check ---
AVIF_SUPPORTED = False
try:
    from PIL import features
    AVIF_SUPPORTED = features.check('avif') # Check general AVIF support
    print(f"DETECTOR: Pillow AVIF feature support detected: {AVIF_SUPPORTED}")
    if not AVIF_SUPPORTED:
        print("DETECTOR WARNING: Pillow AVIF support NOT detected. "
              "Install 'pillow-avif-plugin' and system libs (libavif/libheif).")
except ImportError:
    print("DETECTOR WARNING: Pillow not found or PIL.features not available.")
except Exception as e:
    print(f"DETECTOR WARNING: Error checking AVIF support: {e}")

class ImageDetector:
    def __init__(self, model_name="openai/clip-vit-base-patch16"):
        """Initializes the detector by loading the CLIP model and processor."""
        self.processor = None
        self.model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"DETECTOR: Initializing CLIP model on device: {self.device}")
        try:
            # Ensure processor and model match
            self.processor = CLIPProcessor.from_pretrained(model_name)
            self.model = CLIPModel.from_pretrained(model_name).to(self.device)
            self.model.eval() # Set model to evaluation mode
            print(f"DETECTOR: CLIP model '{model_name}' loaded successfully.")
        except Exception as e:
            print(f"DETECTOR CRITICAL ERROR: Failed to load CLIP model/processor: {e}")
            # Keep self.model and self.processor as None

    def _load_image(self, image_source: str) -> Optional[Image.Image]:
        """Loads an image from URL, Base64 data URL, or local path. Converts to RGB."""
        try:
            image = None
            source_info = f"{str(image_source)[:50]}..." # For logging

            if isinstance(image_source, str) and image_source.startswith('data:image'):
                header, encoded = image_source.split(',', 1)
                # Optional: Validate header slightly
                if not re.match(r'data:image/(png|jpeg|jpg|gif|webp|avif);base64', header):
                     print(f"DETECTOR WARNING: Unexpected base64 header format: {header[:30]}")
                image_data = base64.b64decode(encoded)
                image = Image.open(BytesIO(image_data))
                # print(f"DETECTOR: Loaded image from Base64 data.")

            elif isinstance(image_source, str) and image_source.startswith(('http://', 'https://')):
                headers = {'User-Agent': 'ArtGuardExtension/1.0 (CLIP Backend)'}
                response = requests.get(image_source, stream=True, timeout=15, headers=headers)
                response.raise_for_status()
                image_data_bytes = BytesIO(response.content)
                image = Image.open(image_data_bytes)
                # print(f"DETECTOR: Loaded image from URL: {source_info}")

            elif isinstance(image_source, str) and os.path.exists(image_source):
                ext = os.path.splitext(image_source)[1].lower()
                if ext not in {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'}:
                    print(f"DETECTOR WARNING: Unsupported local file extension '{ext}' for: {os.path.basename(image_source)}")
                    return None
                if ext == '.avif' and not AVIF_SUPPORTED:
                    print(f"DETECTOR ERROR: Cannot load AVIF '{os.path.basename(image_source)}' - Pillow AVIF support missing.")
                    return None
                image = Image.open(image_source)
                # print(f"DETECTOR: Loaded image from Path: {os.path.basename(image_source)}")
            else:
                 print(f"DETECTOR ERROR: Cannot load image. Invalid source type or path/URL: {source_info}")
                 return None

            # --- Ensure image is loaded and converted to RGB ---
            if image:
                image.load() # Load image data fully
                return image.convert("RGB")
            return None

        except FileNotFoundError:
             print(f"DETECTOR ERROR: Local file not found: {image_source}")
        except requests.exceptions.RequestException as e:
            print(f"DETECTOR ERROR: Failed to download URL {source_info}: {e}")
        except Image.UnidentifiedImageError:
             print(f"DETECTOR ERROR: Cannot identify image file (corrupted/unsupported?) for source: {source_info}")
        except ValueError as e: # Catches certain PIL/Base64 errors
             print(f"DETECTOR ERROR: Value error processing image source '{source_info}': {e}")
        except Exception as e:
            print(f"DETECTOR ERROR: Generic error loading image source '{source_info}': {e}")
        return None # Return None on any error during loading

    def _get_image_embedding(self, image: Image.Image) -> Optional[np.ndarray]:
        """Generates CLIP embedding. Returns NumPy array or None."""
        if self.model is None or self.processor is None: return None
        if not isinstance(image, Image.Image): return None
        try:
            # Ensure image is RGB before processing (should be handled by _load_image)
            rgb_image = image if image.mode == "RGB" else image.convert("RGB")
            inputs = self.processor(images=rgb_image, return_tensors="pt", padding=True, truncation=True).to(self.device)
            with torch.no_grad():
                image_features = self.model.get_image_features(**inputs)
            return image_features.cpu().numpy()
        except Exception as e:
            print(f"DETECTOR ERROR: Failed embedding generation: {e}")
            return None

    def compare_source_to_target_path(self, source_identifier: str, target_path: str) -> Optional[Dict[str, float]]:
        """Compares source (URL/Base64) to a target (local path). Returns {'similarity': score_0_to_1} or None."""
        if self.model is None or self.processor is None:
             print("DETECTOR ERROR: Cannot compare, model not loaded.")
             return None

        # Load images (errors handled within _load_image)
        source_img = self._load_image(source_identifier)
        if source_img is None: return None

        target_img = self._load_image(target_path)
        if target_img is None: return None

        # Get embeddings (errors handled within _get_image_embedding)
        source_embedding = self._get_image_embedding(source_img)
        target_embedding = self._get_image_embedding(target_img)

        if source_embedding is None or target_embedding is None:
            print(f"DETECTOR FAIL: Could not get embeddings for comparison involving {os.path.basename(target_path)}")
            return None

        # Calculate Cosine Similarity
        try:
            # Reshape needed if embedding is 1D (shouldn't be for CLIP image features, but safe check)
            if source_embedding.ndim == 1: source_embedding = source_embedding.reshape(1, -1)
            if target_embedding.ndim == 1: target_embedding = target_embedding.reshape(1, -1)

            sim = cosine_similarity(source_embedding, target_embedding)[0][0]
            similarity_score_0_1 = max(0.0, min(1.0, float(sim))) # Clamp result 0-1
            return {'similarity': similarity_score_0_1}

        except Exception as e:
            print(f"DETECTOR ERROR: Failed similarity calculation between source and {os.path.basename(target_path)}: {e}")
            return None

# --- Initialize Global Detector Instance ---
# This runs when the module is first imported by server.py
detector = ImageDetector()
# --- End ai/detector.py ---