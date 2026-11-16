## Purpose

In my BSc thesis I compared *Streptomyces clavuligerus* strains for clavulanic acid production and reported which one made more. That answers "which strain" but not "why". I went back to the same data with a kinetic model to ask a sharper question: does a strain produce more because it grows more, or because its cells keep producing after growth has slowed?

## Scientific background

Clavulanic acid is a β-lactamase inhibitor made by *S. clavuligerus*, given together with antibiotics such as amoxicillin to overcome resistance. Like many secondary metabolites, much of it is made late in the fermentation.

Two classical models describe this. Biomass X follows **logistic growth**: fast at first, then levelling off at a ceiling Xmax.

> dX/dt = μ · X · (1 − X / Xmax)

Product P follows the **Luedeking-Piret** equation, which splits production into a part tied to growth (α) and a part tied to the amount of biomass present (β).

> dP/dt = α · dX/dt + β · X

A large α means the product is made while the culture grows. A large β means the standing culture keeps producing. The split matters for process design: it tells you whether to push growth rate or to hold a dense culture alive for longer.

Move the sliders to see how each parameter reshapes the curves.

```widget
kinetics
Caption: Logistic growth and Luedeking-Piret production. The two presets use my approximate fitted values for growth rate, biomass ceiling and β.
```

## Problem statement

Fit growth and production kinetics to time-course data for two strains, strain 33 and strain H, and compare their parameters, with only five unreplicated timepoints per strain.

## Objectives

1. Implement both models with analytical solutions and check them against numerical integration.
2. Fit each strain and report every parameter with its standard error.
3. Say plainly which comparisons the data can and cannot support.

## Workflow

```workflow
Data | Thesis measurements, with every quirk of the dataset annotated in code
Models | Logistic growth and Luedeking-Piret, each written analytically and numerically
Fit | Growth first, then production using the fitted growth curve
Uncertainty | Standard errors, R² and an automatic flag for weakly determined parameters
Report | Figures, a parameter table and a plain-language interpretation
Caption: The pipeline run by a single command in the package.
```

## Implementation

The package has one module per job: `data.py`, `models.py`, `fit.py`, `plot.py` and `pipeline.py`. Three decisions shaped it:

- **Analytical first, numerical as a check.** The Luedeking-Piret equation has a closed-form solution when growth is logistic. I use it for fitting and integrate the differential equations numerically in the tests to confirm that both agree.
- **Sequential fitting.** Growth parameters are fitted first and then held fixed while α and β are fitted. With five points per strain, fitting everything at once is too poorly determined.
- **Tests that mean something.** Eleven tests cover sanity checks, analytical against numerical agreement, limiting cases and recovery of known parameters from simulated data.

## Results

| Parameter | Strain 33 | Strain H |
|---|---|---|
| Maximum growth rate μ (1/h) | about 0.045 | about 0.037 |
| Biomass ceiling Xmax (% PMV) | about 31 | about 27 |
| Growth-associated α | similar | similar |
| Non-growth-associated β | about 0.110 | about 0.066 |

Strain 33 grows faster, reaches a higher biomass and has the higher β, while α is essentially the same for both. The suggested mechanism is that strain 33 is better because its cells keep producing in the stationary phase.

How far to trust this: every fit rests on five unreplicated timepoints, so the standard errors are wide and I do not claim statistical significance for any difference. The pattern is consistent across three parameters, which makes it a hypothesis worth testing with replicated runs.

TODO: Add the fitted-curve figures from the repository's figures folder.

## Potential applications

- Deciding whether to extend the production phase or to increase growth rate when scaling up a strain.
- A reusable template for any batch fermentation with biomass and product time courses.

## Future improvements

- Replicated fermentations, so that parameter differences can be tested properly.
- Substrate limitation and product degradation, both known to matter for clavulanic acid.
- Bootstrap or Bayesian intervals in place of asymptotic standard errors.
