from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os
import json

# Load .env file manually (no extra dependency needed)
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, value = line.partition('=')
                    os.environ.setdefault(key.strip(), value.strip())

load_env()

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_MODEL   = 'gemini-2.0-flash'
GEMINI_URL     = f'https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent'

# ── Serve Frontend ──────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# ── API Endpoint ─────────────────────────────────────────────────────────────

@app.route('/api/evaluate', methods=['POST'])
def evaluate():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name           = data.get('name', '')
    role           = data.get('role', '')
    manager_rating = data.get('managerRating', 0)
    peer_rating    = data.get('peerRating', 0)
    self_rating    = data.get('selfRating', 0)
    comments       = data.get('comments', '')

    # Use API key from request if not set on server (fallback)
    api_key = GEMINI_API_KEY or data.get('apiKey', '')

    if not api_key:
        return jsonify({'error': 'Gemini API key is not configured on the server. Please add it to .env'}), 500

    prompt_text = f"""
You are an AI performance review assistant designed to generate fair, consistent, and unbiased employee evaluations.
Analyze the following data:
- Employee Name: {name}
- Role: {role}
- Manager Rating (1-5): {manager_rating}
- Peer Rating (1-5): {peer_rating}
- Self Rating (1-5): {self_rating}
- Comments: {comments}

Instructions:
1. Calculate overall performance understanding based on ratings.
2. Identify strengths and positive behaviors.
3. Identify areas for improvement.
4. Check for any inconsistency or rating mismatch (possible bias).
5. Generate a professional and neutral performance review.
6. Suggest 2-3 actionable goals for improvement.
7. Keep the tone fair, constructive, and unbiased.
8. Do NOT favor any single feedback source.

Format your response strictly as JSON with exactly these keys:
{{
  "summary": "Overall Performance Summary string",
  "strengths": ["list", "of", "key strengths"],
  "areas": ["list", "of", "areas of improvement"],
  "goals": ["list", "of", "future goals"]
}}
Return ONLY valid JSON.
    """

    payload = {
        'contents': [{'parts': [{'text': prompt_text}]}],
        'generationConfig': {'responseMimeType': 'application/json'}
    }

    try:
        resp = requests.post(
            f'{GEMINI_URL}?key={api_key}',
            headers={'Content-Type': 'application/json'},
            json=payload,
            timeout=30
        )

        if not resp.ok:
            err_msg = resp.json().get('error', {}).get('message', f'HTTP {resp.status_code}')
            return jsonify({'error': err_msg}), resp.status_code

        resp_data = resp.json()
        candidates = resp_data.get('candidates', [])
        if not candidates:
            return jsonify({'error': 'Gemini returned no candidates. Safety filters may have triggered.'}), 500

        text_content = candidates[0]['content']['parts'][0]['text']
        # Strip markdown code fences if present
        clean = text_content.replace('```json', '').replace('```', '').strip()
        evaluation = json.loads(clean)
        return jsonify(evaluation), 200

    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request to Gemini timed out. Please try again.'}), 504
    except json.JSONDecodeError:
        return jsonify({'error': 'Failed to parse Gemini response as JSON.'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f'\n[*] Smart HR Assist running at: http://localhost:{port}\n')
    app.run(host='0.0.0.0', port=port, debug=True)
