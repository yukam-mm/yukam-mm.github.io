## Purpose

My colony detector is trained on synthetic plates and tested on real ones. Synthetic plates look slightly wrong: the lighting is too even and the colony edges too clean. I wanted to know whether a generative model could close that gap and whether closing it would improve the count.

## Scientific background

CycleGAN learns to translate images between two domains without paired examples. Two generators are trained together, one in each direction, and a cycle-consistency loss requires that an image translated there and back returns to itself. That makes it a natural fit here, because no synthetic plate has a real twin.

## Problem statement

Translate synthetic colony images towards the appearance of real plate photographs, using 1,000 synthetic and 361 real unpaired images, on a GPU server with 24 GB of video memory but only 3.8 GB of system memory.

## Workflow

```workflow
Diagnose | Training was killed by the operating system: data-loader worker processes exhausted system memory
Pilot design | Smaller generator, 128 x 128 images, a 200-image subset and no worker processes
Train | 50 epochs, about 35 seconds each on an NVIDIA L4, logged to Weights & Biases
Translate | Run the synthetic-to-real generator alone on held-out synthetic plates
Retrain detector | Train the colony detector on translated plates and compare the count error
Caption: From an out-of-memory failure to a complete experiment.
```

## Implementation

The server had no `tmux` and no administrator rights, so long runs were started with `nohup`, logged to a file and tracked by process ID. The memory failure came from the data loader forking worker processes, each holding its own copy of the dataset; running with zero workers removed it.

## Results

Training ran to completion and the generator produced plausible real-looking plates. Used as training data for the detector, they made the count worse: mean relative error 0.402, against 0.255 for the untranslated synthetic plates.

This is a negative result and I report it as one. The likely reason is that unpaired translation is free to move, shrink or remove small colonies, while the bounding-box labels stay where they were, so the detector learns from labels that no longer match the image.

TODO: Add a figure with synthetic, translated and real plates side by side.

## Future improvements

- Check label consistency directly: measure how many labelled colonies survive translation.
- Try translation methods that preserve object position, or apply appearance changes only to the background.
- Repeat at full resolution once more memory is available.
