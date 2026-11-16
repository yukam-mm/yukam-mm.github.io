## Purpose

Mansourvar et al. (2025) released OpenFungi, about 26,000 time-lapse images of fungal colonies covering 110 species, and reported that a ResNet50 reached 76.75% accuracy against 92.64% for a vision transformer. Before concluding that the architecture is the reason, I wanted to rule out a simpler explanation: the ResNet50 was trained from random initialisation on limited data.

## Problem statement

Hold the entire training recipe constant and change one thing only: random initialisation against ImageNet pretraining. Does pretraining close the gap?

## Workflow

```workflow
Splits | Stratified training and test sets, plus a later-timepoint validation set to probe distribution shift
Variant A | The paper's ResNet50, trained from scratch
Variant C | torchvision ResNet50 with ImageNet weights, fine-tuned end to end
Shared recipe | Same optimiser, augmentation, class balancing and early stopping for both
Seeds | Three seeds per variant
Report | Paired t-test on per-seed accuracy, per-genus accuracy and confusion matrices
Caption: A one-variable ablation. Everything except initialisation is shared.
```

## Methodology

Both variants use Adam with a learning rate of 1e-4, batch size 32, 224 × 224 inputs, flips and 90-degree rotations, and a weighted sampler for class imbalance. Evaluation covers top-1 and top-5 accuracy and macro precision, recall and F1. A report script aggregates the six runs and writes the comparison automatically, so the conclusion is generated from the numbers.

## Results

TODO: The pipeline is implemented. Results for the six runs will be added here as a chart once the GPU runs are complete.

## Future improvements

- Add the edge-filter preprocessing from the original paper as a second ablation axis.
- Test whether accuracy holds as colonies age, using the later-timepoint validation set.
