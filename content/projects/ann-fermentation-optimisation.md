## Purpose

Mechanistic models need a known mechanism. Fermentation media and conditions are often optimised without one, by fitting a neural network to a designed experiment. Xiong et al. (2026) did this, and I am rebuilding their pipeline in Python to understand each step well enough to apply it to my own clavulanic acid data.

## Scientific background

The paper models one output, α-glucosidase inhibition efficiency, from six fermentation inputs: temperature, time, inoculum volume, initial pH, carbon content and nitrogen content. The network is a small feed-forward model with one hidden layer, written 6-n-1.

The experiments were run **one factor at a time**: each block varies a single input while the other five stay at a baseline. That design choice turns out to control everything about how the data can be split.

## Problem statement

Reproduce the paper's model on the 31 runs printed in its Table 1, and find out how much of the reported performance survives an honest evaluation on such a small dataset.

## Workflow

```workflow
Data | 31 runs transcribed from the paper into a CSV file
Scaling | Normalise all six inputs and the target
Split | Training, validation and test sets at the paper's ratios, grouped by experimental block
Architecture | Sweep 4 to 13 hidden neurons
Training | Compare L-BFGS, Adam and SGD with 5-fold cross-validation
Evaluation | MSE, RMSE, R² and the slope of predicted against observed
Sensitivity | Garson's algorithm to rank the six inputs
Caption: The reproduction pipeline.
```

## Results so far

The most useful result is a failure. With a plain random split, every one of the 13 training runs happened to sit at the baseline temperature of 35 °C. The network never saw temperature change and was then tested on runs where it did. A grouped split that divides the runs inside each single-factor block fixed it.

```chart
{
  "type": "bar",
  "title": "Test-set R² before and after fixing the split",
  "categories": ["Random split", "Split grouped by factor block"],
  "series": [{ "name": "Test R²", "values": [-1.826, 0.499] }],
  "highlight": 1,
  "y": { "label": "R² on the test set", "min": -2, "max": 1 },
  "caption": "A negative R² means the model is worse than predicting the mean. The data and the network are identical in both bars; only the split changed."
}
```

Two more things I am not hiding:

- An R² of 0.499 on a handful of test runs is weak evidence, and it is well below what the paper reports.
- My Garson ranking of input importance differs from the paper's. I do not yet know whether that comes from the optimiser, the split or the instability of Garson's method on small networks.

## Future improvements

- Repeat the split and training many times to report a distribution of R² values.
- Compare against simple baselines such as a quadratic response surface, which a 31-run dataset may favour.
- Apply the pipeline to my own clavulanic acid dataset.

TODO: Add the predicted-against-observed plot and the hidden-neuron sweep from the notebook, and link the repository.
