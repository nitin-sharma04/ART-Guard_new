# server.py

import os
import base64
import re
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from urllib.parse import urlparse
from typing import List, Dict, Optional, Tuple, Any

# --- AI Detector Import / Mock ---
try:
    from ai.detector import detector, AVIF_SUPPORTED as DETECTOR_AVIF_SUPPORT
    AI_DETECTOR_AVAILABLE = detector.model is not None and detector.processor is not None
    if AI_DETECTOR_AVAILABLE: print("SERVER: Actual AI detector instance loaded.")
    else: raise ImportError("Model/Processor failed in detector")
except ImportError as import_err:
    print(f"!!! SERVER WARNING: Failed import: {import_err}. Using MOCK data. !!!")
    AI_DETECTOR_AVAILABLE = False; DETECTOR_AVIF_SUPPORT = False
    import random
    def mock_compare_func(source_id, target_path):
        is_avif = target_path.lower().endswith('.avif'); fail_chance = 0.80 if is_avif and not DETECTOR_AVIF_SUPPORT else 0.05 # Use correct AVIF flag check
        if random.random() < fail_chance: return None
        return {'similarity': random.random()}
    mock_detector = type('MockDetector', (object,), {'compare_source_to_target_path': mock_compare_func})()
# --- End AI Detector ---

app = Flask(__name__)
CORS(app, resources={r"/scan": {"origins": "chrome-extension://dhjhonpflgalcakmjllmgmdffgjedenh"}})

NFT_DATASET_DIR = os.path.join(app.root_path, 'nft-dataset')
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'}
PLAGIARISM_THRESHOLD = 85.0 # Percentage (Tune this!)

# --- Validation Helpers ---
def validate_image_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        return bool(parsed.scheme in ('http', 'https') and parsed.netloc and any(parsed.path.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS))
    except Exception: return False

def validate_base64_image(base64_string: str) -> bool:
    try: return isinstance(base64_string, str) and base64_string.startswith('data:image/') and ';base64,' in base64_string
    except Exception: return False

# --- API Routes ---
@app.route('/')
def index(): return jsonify({'status': 'ArtGuard API running', 'version': '0.2.6'}) # Version bump

@app.route('/favicon.ico')
def favicon():
    static_folder = os.path.join(app.root_path, 'static'); favicon_path = os.path.join(static_folder, 'favicon.ico')
    if os.path.exists(favicon_path): return send_from_directory(static_folder, 'favicon.ico', mimetype='image/vnd.microsoft.icon')
    else: return '', 204

@app.route('/scan', methods=['POST'])
def scan():
    if not request.is_json: return jsonify({"success": False, "message": "Content-Type must be application/json"}), 415
    data = request.json
    if not data: return jsonify({"success": False, "message": "No JSON data provided"}), 400

    source_type = data.get('sourceType'); source_identifier = data.get('sourceImageIdentifier')
    if not source_type or source_identifier is None: return jsonify({"success": False, "message": "Missing 'sourceType' or 'sourceImageIdentifier'"}), 400

    # Validate source format
    if source_type == 'url':
        if not isinstance(source_identifier, str) or not validate_image_url(source_identifier): return jsonify({"success": False, "message": f"Invalid source image URL format or unsupported extension."}), 400
    elif source_type == 'upload':
        if not isinstance(source_identifier, str) or not validate_base64_image(source_identifier): return jsonify({"success": False, "message": "Invalid base64 image data format."}), 400
    else: return jsonify({"success": False, "message": f"Invalid sourceType: '{source_type}'."}), 400

    # --- Locate/List Dataset Images ---
    if not os.path.isdir(NFT_DATASET_DIR): print(f"FATAL ERROR: NFT Dataset directory not found: {NFT_DATASET_DIR}"); return jsonify({"success": False, "message": "Server error: NFT dataset path invalid."}), 500
    try:
        all_files = os.listdir(NFT_DATASET_DIR)
        dataset_image_files = sorted([f for f in all_files if os.path.isfile(os.path.join(NFT_DATASET_DIR, f)) and os.path.splitext(f)[1].lower() in ALLOWED_EXTENSIONS])
        if not dataset_image_files: return jsonify({"success": False, "message": "No compatible images found in dataset directory."}), 500
        print(f"Found {len(dataset_image_files)} images in dataset for comparison.")
    except Exception as e: print(f"Error listing dataset directory '{NFT_DATASET_DIR}': {e}"); return jsonify({"success": False, "message": "Server error: Could not read NFT dataset directory."}), 500

    # --- Perform Comparisons ---
    comparison_results: List[Dict] = []; print(f"Starting comparisons for source type '{source_type}'...")
    comparison_function = detector.compare_source_to_target_path if AI_DETECTOR_AVAILABLE else mock_detector.compare_source_to_target_path
    source_load_failed = False

    for filename in dataset_image_files:
        target_image_path = os.path.join(NFT_DATASET_DIR, filename)
        # Reset variables for each iteration CORRECTLY
        similarity_percent: Optional[float] = None # Explicitly type hint Optional
        is_plagiarized: bool = False
        error_message: Optional[str] = None
        try:
            result_dict = comparison_function(source_identifier, target_image_path)

            # Check for critical source load error first
            if isinstance(result_dict, dict) and result_dict.get("error") == "Source image failed to load":
                 print("CRITICAL: Source image failed to load, stopping comparisons.")
                 source_load_failed = True; error_message = "Source image failed to load/decode by server"
                 comparison_results.append({ "target_image": "SOURCE_FAILURE", "similarity_percentage": None, "is_plagiarized": False, "error": error_message })
                 break # Exit loop

            # Process valid comparison result
            if result_dict and isinstance(result_dict.get('similarity'), (int, float)):
                similarity_score_0_1 = max(0.0, min(1.0, result_dict['similarity']))
                similarity_percent = similarity_score_0_1 * 100
                is_plagiarized = similarity_percent >= PLAGIARISM_THRESHOLD
                 # Optional: Log the actual calculated similarity
                # print(f"Compared with {filename}: Real Similarity {similarity_percent:.2f}%")
            else:
                # Comparison failed for this specific pair
                error_message = "Comparison failed by detector"
                print(f"Warning: {error_message} for target: {filename}")

        except Exception as e:
            # Unexpected error during the loop/call
            error_message = "Server error during comparison processing"
            print(f"ERROR processing comparison for '{filename}': {e}")
            # import traceback; traceback.print_exc() # For debugging

        # Append result (unless source failed and we broke early)
        if not source_load_failed:
             # --- FIX: REMOVED THE FAULTY HARDCODED OVERWRITE ---
             # The variables similarity_percent, is_plagiarized, error_message
             # now hold the correct values calculated above or default error states.
             comparison_results.append({
                "target_image": filename,
                "similarity_percentage": round(similarity_percent, 2) if similarity_percent is not None else None,
                "is_plagiarized": is_plagiarized, # Use the calculated/default value
                "error": error_message
             })
             # --- END FIX ---
    # End of loop

    if source_load_failed:
         return jsonify({"success": False, "message": "Server error: Could not load the provided source image.", "results": comparison_results}), 500

    print(f"Finished comparisons. Processed {len(comparison_results)} dataset images.")

    # Define robust sorting key function
    def sort_key(item: Dict) -> Tuple[int, float]:
        sim = item.get('similarity_percentage')
        return (1, sim) if sim is not None else (0, 0.0)

    comparison_results.sort(key=sort_key, reverse=True)

    return jsonify({ "success": True, "results": comparison_results, "message": f"Scan completed." })

# --- Main Execution ---
if __name__ == '__main__':
    print("-" * 60); print(f"ArtGuard Backend Initializing...")
    print(f"Expecting NFT Dataset At: {NFT_DATASET_DIR}")
    if not os.path.isdir(NFT_DATASET_DIR): print("!!! CRITICAL ERROR: NFT Dataset directory NOT found! !!!")
    else:
        # Import AVIF support status correctly after AI detector might have been mocked
        if AI_DETECTOR_AVAILABLE:
             from ai.detector import AVIF_SUPPORTED as DETECTOR_AVIF_SUPPORT
        else:
             DETECTOR_AVIF_SUPPORT = AVIF_SUPPORTED_MOCK # Use the mock status
        print(f"--> Pillow AVIF support detected: {'YES' if DETECTOR_AVIF_SUPPORT else 'NO'}")
    print(f"--> AI Detector Available: {'YES' if AI_DETECTOR_AVAILABLE else 'NO - Using Mock Data!'}")
    print(f"--> Starting Flask server on http://0.0.0.0:5001 (Debug: {app.debug})")
    print(f"--> Allowing requests from origin: chrome-extension://dhjhonpflgalcakmjllmgmdffgjedenh")
    print("-" * 60)
    app.run(host='0.0.0.0', port=5001, debug=True)

# --- End server.py ---