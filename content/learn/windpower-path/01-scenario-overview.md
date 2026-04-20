---
title: "Scenario Overview"
slug: scenario-overview
description: "Discover the Wind Power Energy System — an ontology to connect wind farms, turbines, energy production, and environmental impact."
order: 1
---

## The scenario

You are designing the data model for a **wind power energy company** inspired by real-world operators like Vattenfall. The company tracks:

- **Wind Farms** — both onshore and offshore installations with location, capacity, and operational status
- **Turbines** — individual wind turbines with rated power, hub height, rotor diameter, and manufacturer
- **Energy Production** — time-series records of electricity generated, capacity factor, and availability
- **Environmental Assessments** — carbon emissions avoided, wildlife impact studies, and noise measurements
- **Grid Connections** — how wind farms connect to the electricity grid, transmission capacity, and power purchase agreements

Data lives across SCADA systems, energy trading platforms, environmental monitoring databases, and grid operator interfaces.

## Why an ontology?

A strategic question like **"Which offshore wind farms exceeded 90% availability last quarter while maintaining bird strike incidents below threshold?"** crosses operational data, production records, and environmental monitoring.

With an ontology, this maps to: `WindFarm (type=offshore) → Turbine → ProductionRecord (availability > 90%) + EnvironmentalAssessment (birdStrikes < threshold)`.

## Real-world context

Wind power now accounts for **19% of Europe's electricity consumption**. Companies like Vattenfall operate over 1,400 turbines with approximately 6.7 GW of installed capacity across five European countries. Flagship projects include:

- **Hollandse Kust Zuid** — the world's first subsidy-free offshore wind farm in the Netherlands
- **Vesterhav Nord & Syd** — 41 turbines generating 1.5 TWh/year off Denmark's coast
- **Pen y Cymoedd** — 76 onshore turbines powering ~15% of Welsh homes

## What we'll build

| Step | Entities | What you'll learn |
|---|---|---|
| 1 | WindFarm, Turbine, ProductionRecord | Core energy infrastructure, one-to-many hierarchies |
| 2 | + EnvironmentalAssessment | Environmental monitoring, compliance tracking |
| 3 | + GridConnection | Grid integration, power delivery, energy markets |

By the end, you'll have a 5-entity, 6-relationship ontology covering a complete wind power operation.

## Key concepts

- **Hierarchical assets** — Wind farms contain turbines, forming a natural parent-child hierarchy
- **Time-series data** — Production records capture energy output over time
- **Capacity factor** — the ratio of actual output to maximum possible output, a key performance metric
- **Onshore vs offshore** — different operational characteristics, costs, and environmental considerations

Let's start with the wind power core.
