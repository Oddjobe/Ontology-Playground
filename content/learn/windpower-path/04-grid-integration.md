---
title: "Grid Integration"
slug: grid-integration
description: "Complete the ontology with GridConnection — transmission capacity, power purchase agreements, and energy market integration."
order: 4
embed: official/windpower-step-3
---

## From wind to the grid

Generating electricity is only half the story. Wind farms must connect to the **electricity grid** to deliver power to households and businesses. Grid integration involves:

- **Transmission infrastructure** — cables, substations, and transformers
- **Capacity allocation** — how much power a connection can handle
- **Power Purchase Agreements (PPAs)** — long-term contracts with energy buyers
- **Battery storage** — co-located batteries to balance intermittent wind output

## The GridConnection entity

| Property | Type | Description |
|----------|------|-------------|
| connectionId | string (identifier) | Unique connection identifier |
| substationName | string | Name of the connecting substation |
| voltageKV | decimal | Connection voltage in kilovolts |
| transmissionCapacityMW | decimal | Maximum power delivery capacity |
| connectionDate | date | When the grid connection was established |
| hasStorageBattery | boolean | Whether battery storage is co-located |

## New relationships

- A **WindFarm** *delivers_through* a **GridConnection** (one-to-one)
- A **GridConnection** *transmits* many **ProductionRecords** (one-to-many)

This completes the energy flow: wind turns turbines, turbines produce energy, energy flows through grid connections to consumers.

<ontology-embed id="official/windpower-step-3" height="400px"></ontology-embed>

*The complete wind power ontology with all five entities connected. Trace the path from WindFarm through Turbine and ProductionRecord to GridConnection.*

## Battery storage — the future

Modern wind farms increasingly co-locate **battery storage** to smooth out the intermittent nature of wind. Examples include:

- **Pen y Cymoedd** — a 22 MW battery alongside the wind farm
- **Bruzaholm** — Vattenfall's 38 MW battery storage facility in Sweden
- **Haringvliet** — a hybrid energy park combining wind, solar, and batteries

The `hasStorageBattery` boolean property on GridConnection captures this capability, enabling queries like "Which grid connections have battery backup?"

## The complete picture

Our 5-entity ontology now models the full wind power lifecycle:

1. **WindFarm** — the physical installation
2. **Turbine** — individual power generation units
3. **ProductionRecord** — energy output measurements
4. **EnvironmentalAssessment** — ecological monitoring
5. **GridConnection** — power delivery to the grid

With this ontology, you can answer questions like:
- *"What is the total CO₂ avoided by offshore farms with capacity factor above 40%?"*
- *"Which wind farms with battery storage had the highest availability last year?"*
- *"Show all environmental assessments for farms exceeding 500 MW capacity."*

```quiz
Q: Why might a wind farm co-locate battery storage?
- To generate more wind
- To reduce noise levels
- To smooth out intermittent energy output [correct]
- To attract more birds
> Wind is intermittent — it doesn't blow constantly. Batteries store excess energy during windy periods and release it when wind drops, providing more consistent power delivery to the grid.
```

```quiz
Q: How many entities and relationships does the complete wind power ontology have?
- 3 entities, 4 relationships
- 5 entities, 6 relationships [correct]
- 4 entities, 5 relationships
- 6 entities, 8 relationships
> The complete ontology has 5 entities (WindFarm, Turbine, ProductionRecord, EnvironmentalAssessment, GridConnection) and 6 relationships connecting them.
```

Congratulations! You've built a complete wind power ontology from scratch. 🎉
