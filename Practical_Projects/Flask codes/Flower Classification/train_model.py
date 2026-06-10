import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.datasets import load_iris
from sklearn.model_selection import KFold
import numpy as np
import random
import os

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False

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

iris = load_iris()
X = iris.data
y = iris.target

kfold = KFold(n_splits=5, shuffle=True, random_state=SEED)
fold_accuracies = []

print("Starting 5-Fold Cross-Validation...")

for fold, (train_ids, val_ids) in enumerate(kfold.split(X)):
    model = IrisNet()
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)

    X_train = torch.tensor(X[train_ids], dtype=torch.float32)
    y_train = torch.tensor(y[train_ids], dtype=torch.long)
    X_val = torch.tensor(X[val_ids], dtype=torch.float32)
    y_val = torch.tensor(y[val_ids], dtype=torch.long)

    for epoch in range(1000):
        optimizer.zero_grad()
        outputs = model(X_train)
        loss = criterion(outputs, y_train)
        loss.backward()
        optimizer.step()

    model.eval()
    with torch.no_grad():
        val_outputs = model(X_val)
        _, predicted = torch.max(val_outputs, 1)
        correct = (predicted == y_val).sum().item()
        accuracy = 100 * correct / len(y_val)
        fold_accuracies.append(accuracy)
        print(f"Fold {fold+1}/5 | Accuracy: {accuracy:.2f}%")

mean_accuracy = np.mean(fold_accuracies)
print(f"\nMean Cross-Validation Accuracy: {mean_accuracy:.2f}%")

print("\nRetraining model on all data for deployment...")
model = IrisNet()
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.01)

X_all = torch.tensor(X, dtype=torch.float32)
y_all = torch.tensor(y, dtype=torch.long)

for epoch in range(1000):
    optimizer.zero_grad()
    outputs = model(X_all)
    loss = criterion(outputs, y_all)
    loss.backward()
    optimizer.step()

save_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'iris_weights.pth')
torch.save(model.state_dict(), save_path)
print(f"Final model weights saved to {save_path}")