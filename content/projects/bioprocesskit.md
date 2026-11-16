## Purpose

Every fermentation lab I have worked in repeats the same analyses in spreadsheets: fit a growth curve, estimate a yield, analyse a designed experiment, compare batches. Each person rebuilds them, and the results are hard to check. BioprocessKit is my attempt to put those analyses into one tested Python toolkit with a web app on top, so that the next person only has to bring data.

## Objectives

1. Collect the routine calculations of bioprocess development in one place.
2. Report uncertainty by default, not as an option.
3. Make each module usable from Python and from a browser.

## Planned modules

```workflow
Kinetics fitting | Growth and product models with standard errors. Starts from my fermentation kinetics package
Growth curves | Lag time, maximum rate and ceiling from plate-reader or shake-flask data
Design of experiments | Factorial designs and response-surface models
Batch analytics | Compare batches and flag the ones that deviate
Caption: The four modules planned for the first version.
```

## Status

TODO: The kinetics module exists as a standalone package. The other modules and the web app are being designed. This page will grow as each one is released.
