---
title: "Environmental Impact"
slug: environmental-impact
description: "Add EnvironmentalAssessment to track carbon savings, wildlife impact, and compliance for wind farms."
order: 3
embed: official/windpower-step-2
---

## Why environmental data matters

Wind power emits **no CO₂ when producing energy** and is the fastest-growing energy source in the EU. However, wind farms do have environmental considerations:

- **Carbon displacement** — how much CO₂ is avoided by replacing fossil fuel generation
- **Wildlife impact** — bird and bat interactions with turbines
- **Noise levels** — sound measurements at nearby residential areas
- **Habitat restoration** — projects like Pen y Cymoedd's 1,500-hectare peatland restoration initiative

Tracking these in the ontology enables compliance reporting and sustainability analysis.

## The EnvironmentalAssessment entity

| Property | Type | Description |
|----------|------|-------------|
| assessmentId | string (identifier) | Unique assessment identifier |
| assessmentDate | date | When the assessment was conducted |
| co2AvoidedTonnes | decimal | Tonnes of CO₂ emissions avoided |
| birdIncidents | integer | Recorded bird interactions |
| noiseDecibelLevel | decimal | Sound level at nearest receptor |
| complianceStatus | string | Regulatory compliance status |

## New relationship

- A **WindFarm** *has* many **EnvironmentalAssessments** (one-to-many)

Environmental assessments are tied to the wind farm level, not individual turbines, because ecological monitoring covers the entire site.

<ontology-embed id="official/windpower-step-2" height="400px"></ontology-embed>

*The expanded ontology now includes environmental monitoring. Notice how EnvironmentalAssessment connects to WindFarm.*

## Real-world example

Vattenfall conducts **Environmental Product Declarations (EPDs)** for both onshore and offshore projects. The largest environmental impact occurs during the **building phase** — manufacturing equipment and transportation. Once operational, the environmental profile is overwhelmingly positive.

At Pen y Cymoedd in South Wales, alongside 76 wind turbines generating power for ~15% of Welsh homes, the project includes a major **nature recovery initiative** restoring degraded peatland habitat — showing how wind farms can actively improve ecosystems.

```quiz
Q: When does a wind farm's largest environmental impact occur?
- During daily operation
- During decommissioning
- During the building phase [correct]
- During maintenance windows
> The largest environmental impact is during construction — manufacturing equipment and transportation. Operational wind farms produce zero CO₂ emissions.
```

```quiz
Q: Why are environmental assessments linked to WindFarm rather than individual Turbines?
- Turbines don't affect the environment
- Environmental monitoring covers the entire site [correct]
- It's simpler to model
- Regulations only apply to farms
> Ecological monitoring — bird surveys, noise measurements, habitat assessments — covers the whole wind farm site, not individual turbines, making WindFarm the correct entity to link assessments to.
```

Next, we'll connect our wind farms to the electricity grid and model energy delivery.
