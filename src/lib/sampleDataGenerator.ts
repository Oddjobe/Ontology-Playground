/**
 * Sample data generator for ontology deployment to Fabric.
 * Produces realistic EntityInstance[] for Wind Power and Finance ontologies.
 */

import type { Ontology, EntityInstance } from '../data/ontology';

// ─── Wind Power Sample Data ────────────────────────────────────────────────

const windFarms: EntityInstance[] = [
  {
    id: 'wf-001', entityTypeId: 'WindFarm',
    values: { farmId: 'WF-HKZ', name: 'Hollandse Kust Zuid', type: 'offshore', country: 'Netherlands', capacityMW: 1500, commissionYear: 2023 },
  },
  {
    id: 'wf-002', entityTypeId: 'WindFarm',
    values: { farmId: 'WF-VNS', name: 'Vesterhav Nord & Syd', type: 'offshore', country: 'Denmark', capacityMW: 344, commissionYear: 2024 },
  },
  {
    id: 'wf-003', entityTypeId: 'WindFarm',
    values: { farmId: 'WF-PYC', name: 'Pen y Cymoedd', type: 'onshore', country: 'United Kingdom', capacityMW: 228, commissionYear: 2017 },
  },
];

const turbineModels = ['Siemens Gamesa SG 11.0-200 DD', 'Vestas V164-8.0', 'Siemens Gamesa SG 3.0-132'];
const turbineData: Array<{ farmId: string; model: string; ratedPower: number; hubHeight: number; rotorDiameter: number; count: number }> = [
  { farmId: 'WF-HKZ', model: turbineModels[0], ratedPower: 11.0, hubHeight: 140, rotorDiameter: 200, count: 5 },
  { farmId: 'WF-VNS', model: turbineModels[1], ratedPower: 8.4, hubHeight: 120, rotorDiameter: 164, count: 5 },
  { farmId: 'WF-PYC', model: turbineModels[2], ratedPower: 3.0, hubHeight: 80, rotorDiameter: 132, count: 5 },
];

function generateTurbines(): EntityInstance[] {
  const turbines: EntityInstance[] = [];
  let idx = 1;
  for (const farm of turbineData) {
    for (let i = 1; i <= farm.count; i++) {
      turbines.push({
        id: `turb-${String(idx).padStart(3, '0')}`,
        entityTypeId: 'Turbine',
        values: {
          turbineId: `T-${farm.farmId}-${String(i).padStart(2, '0')}`,
          model: farm.model,
          ratedPowerMW: farm.ratedPower,
          hubHeightM: farm.hubHeight + Math.round(Math.random() * 5),
          rotorDiameterM: farm.rotorDiameter,
          status: i <= 4 ? 'operational' : 'maintenance',
        },
      });
      idx++;
    }
  }
  return turbines;
}

function generateProductionRecords(): EntityInstance[] {
  const records: EntityInstance[] = [];
  let idx = 1;
  const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
    '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];

  for (const farm of turbineData) {
    for (let t = 1; t <= 3; t++) {
      for (const month of months.slice(0, 4)) {
        const daysInMonth = 30;
        const maxMWh = farm.ratedPower * 24 * daysInMonth;
        const cf = farm.farmId.includes('HKZ') ? 0.42 + Math.random() * 0.08 :
          farm.farmId.includes('VNS') ? 0.38 + Math.random() * 0.07 :
            0.26 + Math.random() * 0.06;
        records.push({
          id: `pr-${String(idx).padStart(3, '0')}`,
          entityTypeId: 'ProductionRecord',
          values: {
            recordId: `PR-${String(idx).padStart(4, '0')}`,
            periodStart: `${month}-01`,
            periodEnd: `${month}-${daysInMonth}`,
            energyMWh: Math.round(maxMWh * cf * 100) / 100,
            capacityFactor: Math.round(cf * 1000) / 1000,
            availability: Math.round((0.92 + Math.random() * 0.07) * 1000) / 1000,
          },
        });
        idx++;
      }
    }
  }
  return records;
}

function generateEnvironmentalAssessments(): EntityInstance[] {
  const assessments: EntityInstance[] = [];
  const farmIds = ['WF-HKZ', 'WF-VNS', 'WF-PYC'];
  let idx = 1;
  for (const farmId of farmIds) {
    for (let q = 1; q <= 2; q++) {
      assessments.push({
        id: `ea-${String(idx).padStart(3, '0')}`,
        entityTypeId: 'EnvironmentalAssessment',
        values: {
          assessmentId: `EA-${farmId}-Q${q}-2025`,
          assessmentDate: `2025-${String(q * 3).padStart(2, '0')}-15`,
          co2AvoidedTonnes: Math.round((farmId === 'WF-HKZ' ? 450000 : farmId === 'WF-VNS' ? 120000 : 85000) * (0.9 + Math.random() * 0.2)),
          birdIncidents: Math.floor(Math.random() * (farmId === 'WF-PYC' ? 5 : 3)),
          noiseDecibelLevel: Math.round((farmId === 'WF-PYC' ? 42 : 35) + Math.random() * 5),
          complianceStatus: 'compliant',
        },
      });
      idx++;
    }
  }
  return assessments;
}

function generateGridConnections(): EntityInstance[] {
  return [
    {
      id: 'gc-001', entityTypeId: 'GridConnection',
      values: { connectionId: 'GC-HKZ-01', substationName: 'Borssele Alpha', voltageKV: 220, transmissionCapacityMW: 1500, connectionDate: '2023-06-01', hasStorageBattery: false },
    },
    {
      id: 'gc-002', entityTypeId: 'GridConnection',
      values: { connectionId: 'GC-VNS-01', substationName: 'Endrup', voltageKV: 150, transmissionCapacityMW: 350, connectionDate: '2024-03-15', hasStorageBattery: false },
    },
    {
      id: 'gc-003', entityTypeId: 'GridConnection',
      values: { connectionId: 'GC-PYC-01', substationName: 'Swansea North', voltageKV: 132, transmissionCapacityMW: 250, connectionDate: '2017-09-01', hasStorageBattery: true },
    },
  ];
}

// ─── Step 4: Generators, Bearings, Sensors, WorkOrders, Policies ───────────

const generatorModels = ['ABB AMG 1600', 'Siemens SGen-3000W', 'GE Power DFIG-4M'];

function generateGenerators(): EntityInstance[] {
  const generators: EntityInstance[] = [];
  let idx = 1;
  for (const farm of turbineData) {
    for (let i = 1; i <= farm.count; i++) {
      const hours = 15000 + Math.floor(Math.random() * 35000);
      generators.push({
        id: `gen-${String(idx).padStart(3, '0')}`,
        entityTypeId: 'Generator',
        values: {
          generatorId: `GEN-${farm.farmId}-${String(i).padStart(2, '0')}`,
          generatorModel: generatorModels[turbineData.indexOf(farm)],
          serialNumber: `SN-${String(100000 + idx)}`,
          operatingHours: hours,
          startStopCount: Math.floor(hours / 8) + Math.floor(Math.random() * 200),
          status: idx === 5 || idx === 12 ? 'degraded' : 'healthy',
          healthScore: idx === 5 ? 0.62 : idx === 12 ? 0.71 : 0.85 + Math.round(Math.random() * 0.14 * 100) / 100,
        },
      });
      idx++;
    }
  }
  return generators;
}

function generateBearings(): EntityInstance[] {
  const bearings: EntityInstance[] = [];
  const positions = ['drive-end', 'non-drive-end'];
  let idx = 1;
  for (const farm of turbineData) {
    for (let t = 1; t <= farm.count; t++) {
      for (const pos of positions) {
        const lifeHours = 40000 + Math.floor(Math.random() * 20000);
        bearings.push({
          id: `brg-${String(idx).padStart(3, '0')}`,
          entityTypeId: 'Bearing',
          values: {
            bearingId: `BRG-${farm.farmId}-${String(t).padStart(2, '0')}-${pos === 'drive-end' ? 'DE' : 'NDE'}`,
            position: pos,
            installDate: `${2020 + Math.floor(Math.random() * 3)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
            expectedLifeHours: lifeHours,
            condition: idx === 9 || idx === 23 ? 'early-wear' : 'normal',
          },
        });
        idx++;
      }
    }
  }
  return bearings;
}

function generateSensorSignals(): EntityInstance[] {
  const signals: EntityInstance[] = [];
  const signalTypes: Array<{ type: string; unit: string; baseVal: number; variance: number }> = [
    { type: 'generator_winding_temp', unit: '°C', baseVal: 75, variance: 15 },
    { type: 'bearing_vibration', unit: 'mm/s', baseVal: 2.5, variance: 1.5 },
    { type: 'stator_current', unit: 'A', baseVal: 320, variance: 40 },
  ];
  let idx = 1;
  // Generate signals for first 5 turbines, 4 weeks of hourly data sampled
  for (let t = 1; t <= 5; t++) {
    for (const sig of signalTypes) {
      for (let day = 0; day < 28; day++) {
        for (const hour of [0, 6, 12, 18]) {
          const anomaly = (t === 5 && sig.type === 'bearing_vibration' && day > 20) ? 2.5 : 0;
          signals.push({
            id: `sig-${String(idx).padStart(5, '0')}`,
            entityTypeId: 'SensorSignal',
            values: {
              signalId: `SIG-${String(idx).padStart(5, '0')}`,
              signalType: sig.type,
              value: Math.round((sig.baseVal + (Math.random() - 0.5) * sig.variance + anomaly) * 100) / 100,
              timestamp: `2025-03-${String(day + 1).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00Z`,
              unit: sig.unit,
              quality: 'good',
            },
          });
          idx++;
        }
      }
    }
  }
  return signals;
}

function generateWorkOrders(): EntityInstance[] {
  const orders: EntityInstance[] = [];
  const templates: Array<{ type: string; priority: string; desc: string; cost: number }> = [
    { type: 'preventive', priority: 'medium', desc: 'Scheduled bearing inspection', cost: 8500 },
    { type: 'corrective', priority: 'high', desc: 'Generator winding temperature exceedance', cost: 45000 },
    { type: 'CBM', priority: 'high', desc: 'Vibration anomaly detected – bearing replacement recommended', cost: 32000 },
    { type: 'preventive', priority: 'low', desc: 'Annual generator lubrication', cost: 3200 },
    { type: 'corrective', priority: 'urgent', desc: 'Stator current imbalance – emergency shutdown', cost: 95000 },
    { type: 'preventive', priority: 'medium', desc: 'Quarterly SCADA sensor calibration', cost: 4500 },
    { type: 'CBM', priority: 'medium', desc: 'Early-stage bearing spall pattern detected', cost: 28000 },
    { type: 'corrective', priority: 'high', desc: 'Generator cooling system fault', cost: 18000 },
  ];
  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    orders.push({
      id: `wo-${String(i + 1).padStart(3, '0')}`,
      entityTypeId: 'WorkOrder',
      values: {
        orderId: `WO-${String(5000 + i)}`,
        orderType: t.type,
        priority: t.priority,
        status: i < 5 ? 'open' : 'completed',
        description: t.desc,
        createdDate: `2025-03-${String(i * 3 + 1).padStart(2, '0')}`,
        dueDate: `2025-04-${String(i * 3 + 5).padStart(2, '0')}`,
        estimatedCostEUR: t.cost,
      },
    });
  }
  return orders;
}

function generateMaintenancePolicies(): EntityInstance[] {
  return [
    {
      id: 'mp-001', entityTypeId: 'MaintenancePolicy',
      values: { policyId: 'POL-CBM-001', name: 'Bearing vibration CBM', condition: 'bearing_vibration > 4.0 mm/s for 48h', recommendedAction: 'Schedule bearing replacement within 7 days', severity: 'high' },
    },
    {
      id: 'mp-002', entityTypeId: 'MaintenancePolicy',
      values: { policyId: 'POL-CBM-002', name: 'Winding temperature limit', condition: 'generator_winding_temp > 95°C', recommendedAction: 'Derate turbine to 70% and inspect within 3 days', severity: 'critical' },
    },
    {
      id: 'mp-003', entityTypeId: 'MaintenancePolicy',
      values: { policyId: 'POL-PM-001', name: 'Scheduled bearing inspection', condition: 'operatingHours > 20000 since last inspection', recommendedAction: 'Perform bearing visual and ultrasonic inspection', severity: 'medium' },
    },
    {
      id: 'mp-004', entityTypeId: 'MaintenancePolicy',
      values: { policyId: 'POL-SAFETY-001', name: 'Generator safety shutdown', condition: 'healthScore < 0.5 OR stator_current imbalance > 15%', recommendedAction: 'Immediate shutdown and emergency inspection', severity: 'critical' },
    },
  ];
}

// ─── Step 5: Weather, Crew, Scheduling, FMECA, Fleet Alerts, HSE ──────────

function generateWeatherWindows(): EntityInstance[] {
  const windows: EntityInstance[] = [];
  let idx = 1;
  for (let day = 0; day < 14; day++) {
    for (const hour of [0, 6, 12, 18]) {
      const waveHeight = Math.round((0.5 + Math.random() * 2.5) * 10) / 10;
      const windSpeed = Math.round((3 + Math.random() * 18) * 10) / 10;
      windows.push({
        id: `ww-${String(idx).padStart(3, '0')}`,
        entityTypeId: 'WeatherWindow',
        values: {
          windowId: `WW-${String(idx).padStart(3, '0')}`,
          forecastTimestamp: `2025-04-${String(day + 1).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00Z`,
          waveHeightM: waveHeight,
          windSpeedMS: windSpeed,
          windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
          visibility: windSpeed > 15 ? 'poor' : 'good',
          seaState: waveHeight > 2.0 ? 'rough' : waveHeight > 1.0 ? 'moderate' : 'calm',
          safeForAccess: waveHeight < 1.5 && windSpeed < 12,
        },
      });
      idx++;
    }
  }
  return windows;
}

function generateCrewShifts(): EntityInstance[] {
  const crews = [
    { name: 'Crew Alpha', vessel: 'MV Wind Supporter', size: 6, quals: 'GWO BST, HV Electrical' },
    { name: 'Crew Bravo', vessel: 'MV Sea Installer', size: 8, quals: 'GWO BST, Mechanical, Crane' },
    { name: 'Crew Charlie', vessel: 'CTV Swift', size: 4, quals: 'GWO BST, Blade Inspection' },
  ];
  const shifts: EntityInstance[] = [];
  let idx = 1;
  for (let day = 0; day < 7; day++) {
    for (const crew of crews) {
      const available = Math.random() > 0.2;
      shifts.push({
        id: `cs-${String(idx).padStart(3, '0')}`,
        entityTypeId: 'CrewShift',
        values: {
          shiftId: `SHIFT-${String(idx).padStart(3, '0')}`,
          crewName: crew.name,
          vesselName: crew.vessel,
          shiftStart: `2025-04-${String(day + 1).padStart(2, '0')}T06:00:00Z`,
          shiftEnd: `2025-04-${String(day + 1).padStart(2, '0')}T18:00:00Z`,
          crewSize: crew.size,
          qualifications: crew.quals,
          available,
        },
      });
      idx++;
    }
  }
  return shifts;
}

function generateScheduleSlots(): EntityInstance[] {
  return [
    {
      id: 'ss-001', entityTypeId: 'ScheduleSlot',
      values: { slotId: 'SLOT-001', slotStartTime: '2025-04-03T06:00:00Z', slotEndTime: '2025-04-03T18:00:00Z', slotStatus: 'approved', reason: 'Wave height 0.8m, Crew Alpha available, grid derate approved', gridDerateApproved: true, marketPriceEURMWh: 42.5 },
    },
    {
      id: 'ss-002', entityTypeId: 'ScheduleSlot',
      values: { slotId: 'SLOT-002', slotStartTime: '2025-04-05T06:00:00Z', slotEndTime: '2025-04-05T18:00:00Z', slotStatus: 'rejected', reason: 'Wave height 2.3m exceeds HSE limit of 1.5m', gridDerateApproved: true, marketPriceEURMWh: 38.1 },
    },
    {
      id: 'ss-003', entityTypeId: 'ScheduleSlot',
      values: { slotId: 'SLOT-003', slotStartTime: '2025-04-08T06:00:00Z', slotEndTime: '2025-04-09T18:00:00Z', slotStatus: 'proposed', reason: 'Wave height 1.1m, Crew Bravo available, low energy price window', gridDerateApproved: true, marketPriceEURMWh: 31.2 },
    },
  ];
}

function generateFailureModes(): EntityInstance[] {
  return [
    {
      id: 'fm-001', entityTypeId: 'FailureMode',
      values: { modeId: 'FMECA-001', component: 'Generator Bearing', failureDescription: 'Bearing inner race spalling', effect: 'Increased vibration leading to generator shutdown', failureSeverity: 8, probability: 4, detection: 3, riskPriorityNumber: 96, recommendedInspection: 'Ultrasonic bearing inspection and oil analysis' },
    },
    {
      id: 'fm-002', entityTypeId: 'FailureMode',
      values: { modeId: 'FMECA-002', component: 'Generator Winding', failureDescription: 'Stator winding insulation degradation', effect: 'Partial discharge, potential short circuit', failureSeverity: 9, probability: 3, detection: 4, riskPriorityNumber: 108, recommendedInspection: 'Partial discharge testing and thermal imaging' },
    },
    {
      id: 'fm-003', entityTypeId: 'FailureMode',
      values: { modeId: 'FMECA-003', component: 'Generator Rotor', failureDescription: 'Rotor eccentricity', effect: 'Unbalanced magnetic pull, increased vibration', failureSeverity: 7, probability: 2, detection: 5, riskPriorityNumber: 70, recommendedInspection: 'Air-gap measurement and vibration spectrum analysis' },
    },
    {
      id: 'fm-004', entityTypeId: 'FailureMode',
      values: { modeId: 'FMECA-004', component: 'Generator Cooling', failureDescription: 'Cooling fan failure or blockage', effect: 'Overheating, forced derate or shutdown', failureSeverity: 6, probability: 5, detection: 2, riskPriorityNumber: 60, recommendedInspection: 'Visual inspection and airflow measurement' },
    },
  ];
}

function generateFleetAlerts(): EntityInstance[] {
  return [
    {
      id: 'fa-001', entityTypeId: 'FleetAlert',
      values: { alertId: 'ALERT-001', pattern: 'Bearing vibration > 4.0 mm/s detected on SG 11.0-200 DD generators', matchedTurbineCount: 3, alertStatus: 'active', raisedDate: '2025-03-25', alertDescription: 'Early-stage bearing spall pattern matched across 3 turbines at Hollandse Kust Zuid – same generator model' },
    },
    {
      id: 'fa-002', entityTypeId: 'FleetAlert',
      values: { alertId: 'ALERT-002', pattern: 'Winding temperature creep >2°C/week on Vestas V164 generators', matchedTurbineCount: 2, alertStatus: 'investigating', raisedDate: '2025-03-28', alertDescription: 'Gradual temperature increase on 2 turbines at Vesterhav Nord & Syd – may indicate cooling degradation' },
    },
  ];
}

function generateHSEPolicies(): EntityInstance[] {
  return [
    {
      id: 'hse-001', entityTypeId: 'HSEPolicy',
      values: { ruleId: 'HSE-001', ruleName: 'Offshore access – wave limit', conditionExpression: 'waveHeightM < 1.5 AND windSpeedMS < 12', restriction: 'No CTV transfer permitted', maxWaveHeightM: 1.5, maxWindSpeedMS: 12, requiresCertification: 'GWO BST' },
    },
    {
      id: 'hse-002', entityTypeId: 'HSEPolicy',
      values: { ruleId: 'HSE-002', ruleName: 'HV electrical work', conditionExpression: 'windSpeedMS < 15 AND visibility != poor', restriction: 'No HV switching in poor visibility or high winds', maxWaveHeightM: 2.0, maxWindSpeedMS: 15, requiresCertification: 'HV Electrical, GWO BST' },
    },
    {
      id: 'hse-003', entityTypeId: 'HSEPolicy',
      values: { ruleId: 'HSE-003', ruleName: 'Crane operations', conditionExpression: 'windSpeedMS < 10 AND waveHeightM < 1.0', restriction: 'No crane lifts above limits', maxWaveHeightM: 1.0, maxWindSpeedMS: 10, requiresCertification: 'Crane Operator, GWO BST' },
    },
  ];
}

// ─── Step 6: Warranty, OEM Bulletins, Financials, AEP ─────────────────────

function generateWarrantyContracts(): EntityInstance[] {
  return [
    {
      id: 'wc-001', entityTypeId: 'WarrantyContract',
      values: { contractId: 'WAR-HKZ-001', oemName: 'Siemens Gamesa', contractStartDate: '2023-01-01', contractEndDate: '2028-12-31', coveredComponents: 'Generator, Gearbox, Blades, Main Bearing', claimDeadlineDays: 90, contractTerms: 'Full-service warranty including parts and labor for 5 years' },
    },
    {
      id: 'wc-002', entityTypeId: 'WarrantyContract',
      values: { contractId: 'WAR-VNS-001', oemName: 'Vestas', contractStartDate: '2024-01-01', contractEndDate: '2029-12-31', coveredComponents: 'Generator, Drivetrain, Pitch System', claimDeadlineDays: 60, contractTerms: 'Active Output Management warranty with availability guarantee' },
    },
    {
      id: 'wc-003', entityTypeId: 'WarrantyContract',
      values: { contractId: 'WAR-PYC-001', oemName: 'Siemens Gamesa', contractStartDate: '2017-09-01', contractEndDate: '2025-08-31', coveredComponents: 'Generator, Gearbox', claimDeadlineDays: 60, contractTerms: 'Extended warranty – generator and gearbox only (expiring soon)' },
    },
  ];
}

function generateWarrantyClaims(): EntityInstance[] {
  return [
    {
      id: 'wcl-001', entityTypeId: 'WarrantyClaim',
      values: { claimId: 'CLM-001', claimStatus: 'submitted', eligibleAmountEUR: 32000, evidencePackRef: 'EVD-PKG-001', filedDate: '2025-03-20', claimDescription: 'Bearing replacement on T-WF-HKZ-05 – vibration anomaly within warranty period' },
    },
    {
      id: 'wcl-002', entityTypeId: 'WarrantyClaim',
      values: { claimId: 'CLM-002', claimStatus: 'approved', eligibleAmountEUR: 45000, evidencePackRef: 'EVD-PKG-002', filedDate: '2025-02-10', claimDescription: 'Generator winding repair on T-WF-VNS-03 – temperature exceedance event' },
    },
    {
      id: 'wcl-003', entityTypeId: 'WarrantyClaim',
      values: { claimId: 'CLM-003', claimStatus: 'auto-flagged', eligibleAmountEUR: 28000, evidencePackRef: 'EVD-PKG-003', filedDate: '2025-03-28', claimDescription: 'Early bearing spall on T-WF-HKZ-03 – Fabric IQ auto-detected within warranty window' },
    },
  ];
}

function generateOEMBulletins(): EntityInstance[] {
  return [
    {
      id: 'oem-001', entityTypeId: 'OEMBulletin',
      values: { bulletinId: 'BUL-SG-2025-003', issueDate: '2025-01-15', affectedModels: 'SG 11.0-200 DD', bulletinDescription: 'Generator bearing lubrication interval reduced from 12 to 6 months for offshore units', actionRequired: 'Update maintenance schedule and perform interim lubrication' },
    },
    {
      id: 'oem-002', entityTypeId: 'OEMBulletin',
      values: { bulletinId: 'BUL-V-2024-017', issueDate: '2024-11-20', affectedModels: 'V164-8.0', bulletinDescription: 'Stator winding insulation enhancement kit available for early production units', actionRequired: 'Order and install insulation upgrade kit during next scheduled maintenance' },
    },
  ];
}

function generateFinancialScenarios(): EntityInstance[] {
  return [
    {
      id: 'fs-001', entityTypeId: 'FinancialScenario',
      values: { scenarioId: 'SCEN-001', scenarioType: 'repair', energyLostMWh: 120, repairCostEUR: 32000, downtimeHours: 48, npvImpactEUR: -38400, lcoeImpact: 0.12, safetyRiskLevel: 'low', recommendation: 'Repair now – lowest total cost, minimal safety risk' },
    },
    {
      id: 'fs-002', entityTypeId: 'FinancialScenario',
      values: { scenarioId: 'SCEN-002', scenarioType: 'derate', energyLostMWh: 450, repairCostEUR: 0, downtimeHours: 0, npvImpactEUR: -19125, lcoeImpact: 0.45, safetyRiskLevel: 'medium', recommendation: 'Derate to 70% – delays cost but increases failure risk over time' },
    },
    {
      id: 'fs-003', entityTypeId: 'FinancialScenario',
      values: { scenarioId: 'SCEN-003', scenarioType: 'runToFailure', energyLostMWh: 1800, repairCostEUR: 95000, downtimeHours: 336, npvImpactEUR: -171500, lcoeImpact: 1.85, safetyRiskLevel: 'high', recommendation: 'Run to failure – highest cost and safety risk; not recommended' },
    },
  ];
}

function generateCostTables(): EntityInstance[] {
  return [
    { id: 'ct-001', entityTypeId: 'CostTable', values: { costItemId: 'COST-001', category: 'SparePart', itemDescription: 'Generator bearing (drive-end)', unitCostEUR: 18500, leadTimeDays: 14 } },
    { id: 'ct-002', entityTypeId: 'CostTable', values: { costItemId: 'COST-002', category: 'SparePart', itemDescription: 'Generator bearing (non-drive-end)', unitCostEUR: 15200, leadTimeDays: 14 } },
    { id: 'ct-003', entityTypeId: 'CostTable', values: { costItemId: 'COST-003', category: 'SparePart', itemDescription: 'Stator winding repair kit', unitCostEUR: 42000, leadTimeDays: 28 } },
    { id: 'ct-004', entityTypeId: 'CostTable', values: { costItemId: 'COST-004', category: 'OpEx', itemDescription: 'CTV day rate', unitCostEUR: 3500, leadTimeDays: 1 } },
    { id: 'ct-005', entityTypeId: 'CostTable', values: { costItemId: 'COST-005', category: 'OpEx', itemDescription: 'SOV day rate', unitCostEUR: 28000, leadTimeDays: 7 } },
    { id: 'ct-006', entityTypeId: 'CostTable', values: { costItemId: 'COST-006', category: 'OpEx', itemDescription: 'Crane vessel mobilization', unitCostEUR: 125000, leadTimeDays: 21 } },
    { id: 'ct-007', entityTypeId: 'CostTable', values: { costItemId: 'COST-007', category: 'OpEx', itemDescription: 'Technician crew day rate (6 pax)', unitCostEUR: 4800, leadTimeDays: 1 } },
    { id: 'ct-008', entityTypeId: 'CostTable', values: { costItemId: 'COST-008', category: 'CapEx', itemDescription: 'Full generator replacement', unitCostEUR: 850000, leadTimeDays: 90 } },
  ];
}

function generateAEPBaselines(): EntityInstance[] {
  const baselines: EntityInstance[] = [];
  let idx = 1;
  for (const farm of turbineData) {
    for (let t = 1; t <= farm.count; t++) {
      const baseAEP = farm.ratedPower * 8760 * (farm.farmId.includes('HKZ') ? 0.45 : farm.farmId.includes('VNS') ? 0.40 : 0.28);
      baselines.push({
        id: `aep-${String(idx).padStart(3, '0')}`,
        entityTypeId: 'AEPBaseline',
        values: {
          baselineId: `AEP-${farm.farmId}-${String(t).padStart(2, '0')}`,
          baselineAEPMWh: Math.round(baseAEP * 10) / 10,
          lossFactor: Math.round((0.02 + Math.random() * 0.06) * 1000) / 1000,
          referenceYear: 2025,
          priceEURPerMWh: farm.farmId.includes('HKZ') ? 46.8 : farm.farmId.includes('VNS') ? 51.2 : 38.5,
        },
      });
      idx++;
    }
  }
  return baselines;
}

// ─── Finance Sample Data ───────────────────────────────────────────────────

function generateFinanceCustomers(): EntityInstance[] {
  const names = ['Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown', 'Eva Martinez',
    'Frank Lee', 'Grace Kim', 'Henry Davis', 'Iris Patel', 'Jack Wilson'];
  return names.map((name, i) => ({
    id: `cust-${String(i + 1).padStart(3, '0')}`,
    entityTypeId: 'Customer',
    values: {
      customerId: `C-${String(1000 + i)}`,
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
      segment: i < 3 ? 'premium' : i < 7 ? 'standard' : 'basic',
      joinDate: `202${Math.floor(i / 3)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
    },
  }));
}

function generateFinanceAccounts(): EntityInstance[] {
  const types = ['checking', 'savings', 'checking', 'savings', 'investment'];
  return types.map((type, i) => ({
    id: `acct-${String(i + 1).padStart(3, '0')}`,
    entityTypeId: 'Account',
    values: {
      accountId: `A-${String(2000 + i)}`,
      type,
      balance: Math.round((5000 + Math.random() * 95000) * 100) / 100,
      currency: 'USD',
      openDate: `2022-${String((i * 2 % 12) + 1).padStart(2, '0')}-01`,
      isActive: true,
    },
  }));
}

function generateFinanceTransactions(): EntityInstance[] {
  const categories = ['deposit', 'withdrawal', 'transfer', 'payment', 'fee'];
  const transactions: EntityInstance[] = [];
  for (let i = 0; i < 30; i++) {
    const cat = categories[i % categories.length];
    transactions.push({
      id: `txn-${String(i + 1).padStart(3, '0')}`,
      entityTypeId: 'Transaction',
      values: {
        transactionId: `TXN-${String(3000 + i)}`,
        amount: Math.round((cat === 'fee' ? 5 + Math.random() * 25 : 50 + Math.random() * 5000) * 100) / 100,
        type: cat,
        timestamp: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}T${String(9 + (i % 9))}:${String(i % 60).padStart(2, '0')}:00Z`,
        description: `${cat.charAt(0).toUpperCase() + cat.slice(1)} - ref ${i + 1}`,
        status: i < 28 ? 'completed' : 'pending',
      },
    });
  }
  return transactions;
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface GeneratedData {
  ontologyName: string;
  tables: Map<string, EntityInstance[]>;
}

/**
 * Generate sample data for an ontology based on its name/slug.
 */
export function generateSampleData(ontology: Ontology): GeneratedData {
  const tables = new Map<string, EntityInstance[]>();
  const name = ontology.name.toLowerCase();

  if (name.includes('wind') || name.includes('power')) {
    tables.set('WindFarm', windFarms);
    tables.set('Turbine', generateTurbines());
    tables.set('ProductionRecord', generateProductionRecords());

    // Only add if entity exists in this ontology step
    if (ontology.entityTypes.some(e => e.name === 'EnvironmentalAssessment')) {
      tables.set('EnvironmentalAssessment', generateEnvironmentalAssessments());
    }
    if (ontology.entityTypes.some(e => e.name === 'GridConnection')) {
      tables.set('GridConnection', generateGridConnections());
    }
    // Step 4 entities
    if (ontology.entityTypes.some(e => e.name === 'Generator')) {
      tables.set('Generator', generateGenerators());
      tables.set('Bearing', generateBearings());
      tables.set('SensorSignal', generateSensorSignals());
      tables.set('WorkOrder', generateWorkOrders());
      tables.set('MaintenancePolicy', generateMaintenancePolicies());
    }
    // Step 5 entities
    if (ontology.entityTypes.some(e => e.name === 'WeatherWindow')) {
      tables.set('WeatherWindow', generateWeatherWindows());
      tables.set('CrewShift', generateCrewShifts());
      tables.set('ScheduleSlot', generateScheduleSlots());
      tables.set('FailureMode', generateFailureModes());
      tables.set('FleetAlert', generateFleetAlerts());
      tables.set('HSEPolicy', generateHSEPolicies());
    }
    // Step 6 entities
    if (ontology.entityTypes.some(e => e.name === 'WarrantyContract')) {
      tables.set('WarrantyContract', generateWarrantyContracts());
      tables.set('WarrantyClaim', generateWarrantyClaims());
      tables.set('OEMBulletin', generateOEMBulletins());
      tables.set('FinancialScenario', generateFinancialScenarios());
      tables.set('CostTable', generateCostTables());
      tables.set('AEPBaseline', generateAEPBaselines());
    }
  } else if (name.includes('finance') || name.includes('banking')) {
    tables.set('Customer', generateFinanceCustomers());
    tables.set('Account', generateFinanceAccounts());
    tables.set('Transaction', generateFinanceTransactions());
  } else {
    // Generic: create a few instances per entity type
    for (const entity of ontology.entityTypes) {
      const instances: EntityInstance[] = [];
      for (let i = 0; i < 5; i++) {
        const values: Record<string, unknown> = {};
        for (const prop of entity.properties) {
          values[prop.name] = generateDefaultValue(prop.type, prop.name, i);
        }
        instances.push({ id: `${entity.id}-${i + 1}`, entityTypeId: entity.id, values });
      }
      tables.set(entity.name, instances);
    }
  }

  return { ontologyName: ontology.name, tables };
}

function generateDefaultValue(type: string, name: string, index: number): unknown {
  switch (type) {
    case 'string': return `${name}_${index + 1}`;
    case 'integer': return index * 10 + 1;
    case 'decimal':
    case 'double': return Math.round((index * 10.5 + 1) * 100) / 100;
    case 'boolean': return index % 2 === 0;
    case 'date': return `2025-${String((index % 12) + 1).padStart(2, '0')}-01`;
    case 'datetime': return `2025-${String((index % 12) + 1).padStart(2, '0')}-01T00:00:00Z`;
    default: return `${name}_${index + 1}`;
  }
}

/**
 * Convert EntityInstance[] to CSV string for Lakehouse upload.
 */
export function instancesToCSV(instances: EntityInstance[]): string {
  if (instances.length === 0) return '';

  const columns = Object.keys(instances[0].values);
  const header = columns.join(',');
  const rows = instances.map(inst =>
    columns.map(col => {
      const val = inst.values[col];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
      return String(val);
    }).join(','),
  );

  return [header, ...rows].join('\n');
}
