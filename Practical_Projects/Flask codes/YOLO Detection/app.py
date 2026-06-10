import os
os.environ['CUDA_VISIBLE_DEVICES'] = ''  # Force CPU-only mode (disable GPU)

import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend (no GUI needed on server)

# Web framework and image processing imports
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image

import torch
import torch.nn as nn

# Patch torch.load to set weights_only=False by default (needed for YOLO model loading)
_original_torch_load = torch.load

def _patched_torch_load(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)

torch.load = _patched_torch_load
print("Patched torch.load to allow YOLO model loading")

# Register standard PyTorch modules as safe for deserialization
torch.serialization.add_safe_globals([
    nn.modules.container.Sequential,
    nn.modules.container.ModuleList,
    nn.modules.container.ModuleDict,
    nn.modules.container.ParameterList,
    nn.modules.container.ParameterDict,
    nn.modules.conv.Conv2d,
    nn.modules.conv.Conv1d,
    nn.modules.conv.Conv3d,
    nn.modules.conv.ConvTranspose2d,
    nn.modules.batchnorm.BatchNorm2d,
    nn.modules.batchnorm.BatchNorm1d,
    nn.modules.instancenorm.InstanceNorm2d,
    nn.modules.normalization.GroupNorm,
    nn.modules.normalization.LayerNorm,
    nn.modules.activation.ReLU,
    nn.modules.activation.LeakyReLU,
    nn.modules.activation.SiLU,
    nn.modules.activation.Sigmoid,
    nn.modules.activation.Tanh,
    nn.modules.activation.Softmax,
    nn.modules.activation.GELU,
    nn.modules.pooling.MaxPool2d,
    nn.modules.pooling.AvgPool2d,
    nn.modules.pooling.AdaptiveAvgPool2d,
    nn.modules.pooling.AdaptiveMaxPool2d,
    nn.modules.upsampling.Upsample,
    nn.modules.upsampling.UpsamplingNearest2d,
    nn.modules.upsampling.UpsamplingBilinear2d,
    nn.modules.linear.Linear,
    nn.modules.linear.Identity,
    nn.modules.dropout.Dropout,
    nn.modules.dropout.Dropout2d,
    nn.modules.padding.ZeroPad2d,
    nn.modules.padding.ReflectionPad2d,
    nn.modules.flatten.Flatten,
])

# Register YOLO-specific classes as safe for deserialization
try:
    from ultralytics.nn.tasks import DetectionModel, SegmentationModel, ClassificationModel, PoseModel
    from ultralytics.nn.modules import (
        Conv, C2f, SPPF, Detect, C3, Bottleneck, C1, C2, C3TR, SPP,
        DFL, Concat, Classify, Segment, Pose
    )

    safe_classes = [
        DetectionModel, SegmentationModel, ClassificationModel, PoseModel,
        Conv, C2f, SPPF, Detect, C3, Bottleneck, C1, C2, C3TR, SPP,
        DFL, Concat, Classify, Segment, Pose
    ]
    torch.serialization.add_safe_globals(safe_classes)
    print("Added all required safe globals for YOLO")
except ImportError as e:
    print(f"Warning: Some Ultralytics classes not found: {e}")

from ultralytics import YOLO

# Initialize Flask app and enable CORS for frontend requests
app = Flask(__name__)
CORS(app)

# Load YOLO models at startup (detection + segmentation)
model_detect = YOLO('yolov8n.pt')
print(f"Detection model loaded on device: {model_detect.device}")

model_segment = YOLO('yolov8n-seg.pt')
print(f"Segmentation model loaded on device: {model_segment.device}")

# Create output directories if they don't exist
os.makedirs('uploads', exist_ok=True)
os.makedirs('detections', exist_ok=True)


# Health check endpoint — returns app status and loaded model info
@app.route('/health', methods=['GET'])
def health():
    return {
        'status': 'healthy',
        'app': 'What YOLO Sees',
        'models': {
            'detection': 'yolov8n.pt',
            'segmentation': 'yolov8n-seg.pt'
        }
    }


# Main detection endpoint — accepts an image and returns detections + annotated image
@app.route('/detect', methods=['POST'])
def detect():
    try:
        # Validate that an image file was included in the request
        if 'image' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400

        file = request.files['image']

        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        # Get detection mode: 'bbox' (default) or 'segment'
        mode = request.form.get('mode', 'bbox')

        # Read and decode the uploaded image into a numpy array
        image_bytes = file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            return jsonify({'error': 'Invalid image file'}), 400

        # Convert BGR (OpenCV default) to RGB for YOLO
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Pick the appropriate model based on the requested mode
        model = model_segment if mode == 'segment' else model_detect

        # Run inference on CPU
        results = model(image_rgb, device='cpu', verbose=False)

        # Loop through results and extract each detected object
        detections = []
        for result in results:
            boxes = result.boxes
            masks = result.masks if hasattr(result, 'masks') and result.masks is not None else None

            for i, box in enumerate(boxes):
                # Extract bounding box coordinates and class info
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)

                class_id = int(box.cls[0])
                class_name = model.names[class_id]
                confidence = float(box.conf[0])

                # Segment mode: crop object with transparent background using mask
                if masks is not None and mode == 'segment':
                    mask = masks.data[i].cpu().numpy()
                    mask_resized = cv2.resize(mask, (image.shape[1], image.shape[0]))
                    mask_cropped = mask_resized[y1:y2, x1:x2]
                    img_cropped = image[y1:y2, x1:x2]
                    img_rgba = cv2.cvtColor(img_cropped, cv2.COLOR_BGR2BGRA)
                    mask_binary = (mask_cropped > 0.5).astype(np.uint8) * 255
                    img_rgba[:, :, 3] = mask_binary  # Apply mask as alpha channel
                    _, buffer = cv2.imencode('.png', img_rgba, [cv2.IMWRITE_PNG_COMPRESSION, 3])
                    cropped_base64 = base64.b64encode(buffer).decode('utf-8')
                    image_format = 'png'
                # Bbox mode: simple rectangular crop of the detected object
                else:
                    cropped_image = image[y1:y2, x1:x2]
                    _, buffer = cv2.imencode('.jpg', cropped_image, [cv2.IMWRITE_JPEG_QUALITY, 95])
                    cropped_base64 = base64.b64encode(buffer).decode('utf-8')
                    image_format = 'jpeg'

                # Store detection info + base64-encoded cropped image
                detections.append({
                    'class_name': class_name,
                    'confidence': round(confidence * 100, 2),
                    'bbox': {
                        'x1': int(x1),
                        'y1': int(y1),
                        'x2': int(x2),
                        'y2': int(y2)
                    },
                    'cropped_image': f'data:image/{image_format};base64,{cropped_base64}'
                })

        # Generate full annotated image with all detections drawn on it
        annotated_image_rgb = results[0].plot()
        annotated_image_bgr = cv2.cvtColor(annotated_image_rgb, cv2.COLOR_RGB2BGR)
        _, buffer = cv2.imencode('.jpg', annotated_image_bgr, [cv2.IMWRITE_JPEG_QUALITY, 95])
        annotated_base64 = base64.b64encode(buffer).decode('utf-8')

        # Return JSON with all detections and the annotated image
        return jsonify({
            'detections': detections,
            'total_detections': len(detections),
            'annotated_image': f'data:image/jpeg;base64,{annotated_base64}'
        })

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"ERROR in /detect endpoint:")
        print(error_details)
        return jsonify({
            'error': str(e),
            'details': error_details
        }), 500


# Start the Flask server on port 8081
if __name__ == '__main__':
    print("\n" + "="*50)
    print("What YOLO Sees - AI Object Detection")
    print("="*50)
    print(f"Detection model: {len(model_detect.names)} classes")
    print(f"Segmentation model: {len(model_segment.names)} classes")
    print(f"\nServer running at: http://localhost:8081")
    print(f"Open web.html in your browser to get started!")
    print("="*50 + "\n")
    app.run(host='localhost', port=8081, debug=True, threaded=True, use_reloader=False)