import torch
import torch.nn as nn


class LSTMClassifier(nn.Module):
    """Bidirectional LSTM for exercise action classification."""
    
    def __init__(self, input_dim, hidden_dim, num_classes, num_layers=2):
        super(LSTMClassifier, self).__init__()
        
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=0.3
        )
        
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim * 2, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes)
        )
    
    def forward(self, x, device=None):
        """
        Forward pass.
        
        Args:
            x: Input tensor of shape (batch, seq_len, features)
            device: Device to allocate tensors
        
        Returns:
            class_out: Classification logits (batch, num_classes)
            feature_vector: Last hidden state (batch, hidden*2)
            feature_sequence: All timestep features (batch, seq_len, hidden*2)
        """
        if device is None:
            device = x.device
        
        h0 = torch.zeros(self.num_layers * 2, x.size(0), self.hidden_dim).to(device)
        c0 = torch.zeros(self.num_layers * 2, x.size(0), self.hidden_dim).to(device)
        
        out, _ = self.lstm(x, (h0, c0))
        
        feature_vector = out[:, -1, :]
        class_out = self.fc(feature_vector)
        
        return class_out, feature_vector, out
