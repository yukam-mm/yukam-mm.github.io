## Purpose

Counting colonies on an agar plate is one of the most repeated measurements in microbiology, and I have done it by hand more times than I would like. It is slow, it varies between people, and it gets worse exactly when it matters: on crowded plates. I wanted a counter that works on ordinary photographs of plates, without a dedicated imaging station and without thousands of hand-labelled images.

## Scientific background

A colony count estimates how many viable cells were in a sample. Each colony is assumed to grow from one cell, so the count is only as good as the ability to tell colonies apart. Three things make this hard in photographs:

- **Touching colonies.** Neighbours merge as they grow and are counted as one.
- **Imaging artefacts.** Glare on the lid, marker labels, condensation and dish edges look like colonies to simple methods.
- **Small data.** A single lab produces a few hundred plate images, far fewer than a detector normally needs.

Try the first problem yourself. Raise the incubation time and watch the count fall behind the truth.

```widget
plate
Caption: A simulation of the counting problem. This is a teaching model, not thesis data.
```

## Problem statement

Given macro-photographs of Petri dishes from my own *Streptomyces clavuligerus* work, count the colonies automatically, with too few labelled real images to train a detector directly.

## Objectives

1. Remove imaging artefacts and recover detail before any counting is attempted.
2. Build a training-free classical counter as an honest baseline.
3. Generate labelled synthetic plates so a detector can be trained without manual annotation.
4. Test whether making synthetic plates look more real improves the count.

## Workflow

```workflow
Image enhancement | Inpaint glare and labels with LaMa, then recover detail with GAN super-resolution
Classical baseline | Adaptive thresholding, k-means and Hough circles. No training needed
Synthetic plates | Cut real colonies out with Segment Anything and paste them onto empty dishes: 3,000 auto-labelled images
Detector | Train YOLOv8n on the synthetic plates only
Harmonisation | Translate synthetic plates towards the real domain with CycleGAN and retrain
Evaluation | Mean relative count error on 13 held-out real plates against manual counts
Caption: The thesis pipeline. Each stage is evaluated against the one before it.
```

## Methodology

**Enhancement.** Glare, handwriting and dish-edge reflections are masked and filled by inpainting, and the result is passed through a super-resolution network so that small colonies keep their edges.

**Classical baseline.** Before using any learning I built the best counter I could from thresholding, clustering and circle detection. A deep model is only interesting if it beats this.

**Synthetic data.** Individual colonies are segmented from real plates and composited onto photographs of empty dishes. Because I place every colony, every bounding box is known for free.

**Detection.** A small YOLOv8 model is trained on synthetic plates and tested only on real ones, so the reported error measures transfer from synthetic to real.

## Results

The detector trained on synthetic plates cut the mean relative count error on real plates from 0.416 to 0.255, a 38.7% reduction against the classical baseline. CycleGAN harmonisation did not help: the error rose back to 0.402.

```chart
{
  "type": "bar",
  "title": "Mean relative count error on 13 held-out real plates (lower is better)",
  "categories": ["Classical baseline", "YOLOv8n on synthetic plates", "YOLOv8n after CycleGAN"],
  "series": [{ "name": "Mean relative count error", "values": [0.416, 0.255, 0.402] }],
  "highlight": 1,
  "y": { "label": "Mean relative count error", "min": 0, "max": 0.5 },
  "caption": "Count error for the three counters. Training on raw synthetic plates gives the lowest error; harmonising them with CycleGAN removes most of the gain."
}
```

What I take from this:

- Synthetic compositing is enough to beat a carefully tuned classical counter with no manual labels.
- An error of 0.255 is still too high for routine lab use. On one crowded plate the manual count was 26, the detector found 16 and the classical method 7.
- The test set is 13 plates. The direction of the result is clear; the exact numbers will move with more data.

## Potential applications

- Routine viable counts in fermentation and quality-control labs that only have a phone or a simple camera.
- A starting point for labs with too few images to train a detector the usual way.

## Future improvements

- Model overlapping colonies explicitly in the synthetic generator, since merging is the dominant error.
- Evaluate on a larger and more varied set of real plates, including other species and media.
- Report per-plate error against colony density, to show where the method can be trusted.

TODO: Add the enhancement before-and-after figures and the detection examples from the thesis once the defence is complete, and link the repository.
