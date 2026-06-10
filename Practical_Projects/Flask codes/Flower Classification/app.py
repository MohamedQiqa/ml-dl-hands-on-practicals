from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
import numpy as np

app = Flask(__name__)
CORS(app)  # Cross-Origin Resource Sharing


class IrisNet(nn.Module):
    def __init__(self):
        super(IrisNet, self).__init__()
        self.layer1 = nn.Linear(4, 16)
        self.relu = nn.ReLU()
        self.layer2 = nn.Linear(16, 3)
        self.softmax = nn.Softmax(dim=1)

    def forward(self, x):
        x = self.layer1(x)
        x = self.relu(x)
        x = self.layer2(x)
        x = self.softmax(x)
        return x

model = IrisNet()
state_dict = torch.load('iris_weights.pth', map_location=torch.device('cpu'), weights_only=True)
model.load_state_dict(state_dict)
model.eval()


@app.route('/health', methods=['GET'])  # route an incoming URL path to the specific Python function that should be executed
def health():
    return {'status': 'healthy (PyTorch)'}


@app.route('/predict', methods=['POST']) # 4 features .. return one of the three classes 
def predict():
    try:
        data = request.json
        features_list = data['features']
        features_tensor = torch.tensor([features_list], dtype=torch.float32)

        with torch.no_grad():
            probabilities = model(features_tensor)
            prediction = torch.argmax(probabilities, dim=1).item()
            probs_list = probabilities[0].tolist()

        return jsonify({
            'prediction': prediction,
            'probability': probs_list
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400


if __name__ == '__main__':
    app.run(host='localhost', port=8080)

# in another terminal you can run..
# curl http://localhost:8080/health
# curl -X POST http://localhost:8080/predict -H "Content-Type: application/json" -d "{\"features\": [1.1, 13.5, 1.4, 4.2]}"
