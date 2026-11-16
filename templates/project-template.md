<!--
  Copy this file to content/projects/<your-slug>.md and add an entry with the
  same slug to content/projects.json. Delete any section you do not need:
  the side menu is built from whatever "## " headings remain.
-->

## Purpose

Why I am doing this and what problem I am trying to solve.

## Scientific background

The biology, chemistry or mathematics a reader needs first.

## Problem statement

One or two sentences: the exact question.

## Objectives

1. First objective
2. Second objective

## Methodology

How the question is answered, and why this way.

## Technologies

Languages, libraries and tools, and what each one is used for.

## Workflow

```workflow
Step one | A short description
Step two | A short description
Caption: What this diagram shows.
```

## Implementation

Key design decisions. Code goes in fenced blocks:

```python
def example():
    return 42
```

## Visualisations

An image stored in assets/ (the text in square brackets becomes the caption):

![Fitted growth curves for both strains.](assets/example-figure.png)

A chart typed directly as numbers:

```chart
{
  "type": "line",
  "title": "Biomass over time",
  "x": { "label": "Time (h)" },
  "y": { "label": "Biomass (g/L)" },
  "series": [
    { "name": "Measured", "mode": "points", "data": [[0, 0.5], [12, 2.1], [24, 6.8], [36, 9.5], [48, 10.1]] },
    { "name": "Model", "mode": "line", "data": [[0, 0.5], [12, 2.0], [24, 6.5], [36, 9.6], [48, 10.2]] }
  ],
  "caption": "What the reader should notice."
}
```

A chart read from a CSV file in content/data/:

```chart
{ "type": "line", "csv": "content/data/example.csv", "xCol": "time_h", "yCols": ["biomass"], "mode": "both",
  "x": { "label": "Time (h)" }, "y": { "label": "Biomass (g/L)" }, "caption": "Data loaded from a file." }
```

An interactive widget (see js/widgets.js for the list):

```widget
kinetics
Caption: Describe what to try.
```

## Results

What I found, with numbers and their uncertainty.

TODO: A paragraph starting with "TODO:" is shown as an "In progress" note.

## Potential applications

Who could use this and for what.

## Future improvements

What I would do next, and what the current version cannot do.
