
import torch

weights = torch.load('iris_weights.pth', weights_only=True)

print("File loaded successfully. It is a dictionary.")
print("-" * 30)

print("Keys in the file:")
print(weights.keys())
print("-" * 30)

print("Weights for 'layer1':")
print(weights['layer1.weight'])
print("\nBiases for 'layer1':")
print(weights['layer1.bias'])
