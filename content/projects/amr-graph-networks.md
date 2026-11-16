## Purpose

Antimicrobial resistance is the reason clavulanic acid, the molecule from my BSc thesis, exists as a drug. This project approaches the same problem from the other side: predicting from structure alone whether a molecule is active against a bacterial target.

## Scientific background

A molecule is naturally a graph: atoms are nodes and bonds are edges. Graph isomorphism networks learn a representation of each atom from its neighbourhood and combine them into a prediction for the whole molecule.

How the data is split matters more than the model. With a random split, close analogues of the same chemical series end up in both training and test sets and the score flatters the model. **Scaffold splitting** keeps each core structure entirely on one side, so the test measures performance on new chemistry.

## Workflow

```workflow
Data | Bioactivity records from ChEMBL
Graphs | Convert each molecule into atom and bond features
Split | Group molecules by scaffold before dividing them
Model | Graph isomorphism network
Evaluation | Performance on scaffolds never seen in training
Caption: The pipeline at a glance.
```

## Results

TODO: Add the evaluation metrics, a comparison against a fingerprint baseline and the repository link.
