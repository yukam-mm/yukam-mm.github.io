## Purpose

This is the research I want to do next. My kinetics project showed what a mechanistic model can explain with very little data, and my neural-network project showed how quickly a purely data-driven model fails on a small designed experiment. A hybrid model should use each where it is strong.

## Scientific background

A **digital twin** of a fermentation is a model that runs alongside the real process, is updated with its measurements and can be used to predict and to decide. Purely mechanistic twins are limited by what we can write down; purely data-driven ones need more runs than a fermentation lab can afford.

A **hybrid model** keeps the mass balances, which are always true, and lets a neural network learn only the unknown rate expressions inside them.

## Research questions

1. How many fermentation runs does a hybrid model need to beat a mechanistic model on prediction?
2. Can image-based measurements, such as colony or pellet morphology, serve as additional state variables?
3. Does the hybrid model extrapolate safely to conditions outside the training runs?

## Planned approach

```workflow
Mechanistic core | Mass balances for biomass, substrate and product
Learned rates | A small neural network for the specific rates the mechanism does not explain
Training | Fit through the differential-equation solver on time-course data
Validation | Hold out whole runs, never single timepoints
Use | Predict the remaining course of a run from its first hours
Caption: The planned structure of the hybrid model.
```

## Status

TODO: Planned. I will start with simulated data built on my fitted clavulanic acid kinetics, then move to real replicated runs.
