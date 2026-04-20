---
title: "Core Infrastructure"
slug: core-infrastructure
description: "Build the foundation — WindFarm, Turbine, and ProductionRecord entities that model a wind energy operation."
order: 2
embed: official/windpower-step-1
---

## Wind farms and turbines

Every wind power system starts with **physical infrastructure**. A wind farm is a collection of turbines installed at a specific location — either onshore (on land) or offshore (at sea).

Each turbine is a complex machine with key specifications:
- **Rated power** — maximum electricity output (e.g., 8.4 MW)
- **Hub height** — height of the nacelle above ground/sea level
- **Rotor diameter** — the sweep area of the blades
- **Commissioning date** — when the turbine became operational

## The three core entities

| Entity | Purpose | Key properties |
|--------|---------|---------------|
| **WindFarm** | A collection of turbines at a location | farmId, name, type (onshore/offshore), country, capacityMW, commissionYear |
| **Turbine** | An individual wind turbine | turbineId, model, ratedPowerMW, hubHeightM, rotorDiameterM, status |
| **ProductionRecord** | Energy output measurement | recordId, periodStart, periodEnd, energyMWh, capacityFactor, availability |

## Relationships

- A **WindFarm** *contains* many **Turbines** (one-to-many)
- A **Turbine** *generates* many **ProductionRecords** over time (one-to-many)

This is similar to the University model's Department → Professor pattern — a parent entity owns child entities.

<ontology-embed id="official/windpower-step-1" height="400px"></ontology-embed>

*The wind power core ontology above shows the three foundational entities. Click any node to see its properties.*

## Capacity factor — a key metric

The **capacity factor** measures how much energy a turbine actually produces compared to its theoretical maximum:

```
Capacity Factor = Actual Output (MWh) / (Rated Power × Hours in Period)
```

Offshore wind farms typically achieve 40–50% capacity factor, while onshore farms reach 25–35%. This property on ProductionRecord lets analysts compare performance across sites and turbine types.

```quiz
Q: What does a capacity factor of 45% mean?
- The turbine is broken 55% of the time
- The turbine produces 45% of its theoretical maximum output [correct]
- 45% of the turbines are operational
- The wind blows 45% of the time
> Capacity factor measures actual energy output versus the theoretical maximum if the turbine ran at full rated power continuously. A 45% capacity factor is excellent for offshore wind.
```

```quiz
Q: Which relationship type connects WindFarm to Turbine?
- Many-to-many
- One-to-one
- One-to-many [correct]
- Many-to-one
> A wind farm contains multiple turbines, but each turbine belongs to exactly one wind farm — this is a classic one-to-many relationship.
```

Next, we'll add environmental monitoring to track the ecological impact of our wind farms.
