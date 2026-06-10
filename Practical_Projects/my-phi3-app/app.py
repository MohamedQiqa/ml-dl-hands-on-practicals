import os
import sys
from flask import Flask, request, jsonify
from llama_cpp import Llama

app = Flask(__name__)
 
base_path = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(base_path, "model", "phi-3-mini-4k-instruct.Q4_K_M.gguf")
 
print(f"--- Loading Model: {model_path} ---", file=sys.stderr)
try:
    llm = Llama(
        model_path=model_path,
        n_ctx=4096,
        n_threads=2,
        verbose=True
    )
    print("--- Model Loaded Successfully ---", file=sys.stderr)
except Exception as e:
    print(f"--- FAILED TO LOAD MODEL: {e} ---", file=sys.stderr)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True, silent=True)
    if not data or "prompt" not in data:
        return jsonify({"error": "No prompt provided"}), 400
        
    prompt = data["prompt"]
    # Phi-3 standard chat template
    full_prompt = f"<|user|>\n{prompt}<|end|>\n<|assistant|>"
    
    output = llm(full_prompt, max_tokens=512, stop=["<|end|>"], echo=False)
    return jsonify({"response": output["choices"][0]["text"].strip()})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
    
    