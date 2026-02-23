export interface DiagramExample {
  title: string;
  description: string;
  category: string;
  diagramType: string;
  code: string;
}

import codes from './diagram-examples.json';

function getCode(key: string): string {
  const found = (codes as Array<{ key: string; code: string }>).find(e => e.key === key);
  return found ? found.code : '';
}

export const diagramExamples: DiagramExample[] = [
  {
    title: "[Flowchart] Patient Triage Flowchart",
    description: "Visualizes the patient assessment and routing process in an emergency department.",
    category: "Clinical Workflow",
    diagramType: "flowchart",
    code: getCode('patient-triage-flowchart')
  },
  {
    title: "[Flowchart] Radiology Workflow",
    description: "Tracks an imaging order from receipt to the final report being sent.",
    category: "Diagnostic Services",
    diagramType: "flowchart",
    code: getCode('radiology-workflow')
  },
  {
    title: "[Journey] Patient Journey Map",
    description: "Mapping the patient experience across multiple roles from booking to follow-up.",
    category: "Patient Experience",
    diagramType: "journey",
    code: getCode('patient-journey-map')
  },
  {
    title: "[Sequence] Lab Sample Journey",
    description: "A sequence diagram showing how a sample is processed from collection to analysis.",
    category: "Diagnostic Services",
    diagramType: "sequence",
    code: getCode('lab-sample-journey')
  },
  {
    title: "[State] Disease Progression Model",
    description: "A state diagram modeling the potential stages of an infectious disease.",
    category: "Epidemiology",
    diagramType: "state",
    code: getCode('disease-progression-model')
  },
  {
    title: "[Flowchart] Hospital Org Chart",
    description: "Shows the hierarchical structure of a hospital's leadership.",
    category: "Administration",
    diagramType: "flowchart",
    code: getCode('hospital-org-chart')
  },
  {
    title: "[Gantt] Clinical Trial Timeline",
    description: "A Gantt chart outlining the phases of a new drug trial.",
    category: "Research",
    diagramType: "gantt",
    code: getCode('clinical-trial-timeline')
  },
  {
    title: "[ER] ER Diagram: Patient Records",
    description: "A simple database schema for patients, doctors, and appointments.",
    category: "Health Informatics",
    diagramType: "er",
    code: getCode('er-patient-records')
  },
  {
    title: "[Timeline] Outbreak Investigation Timeline",
    description: "Chronological events during an epidemiological investigation.",
    category: "Epidemiology",
    diagramType: "timeline",
    code: getCode('outbreak-investigation-timeline')
  },
  {
    title: "[Class] Patient Encounters",
    description: "UML class diagram showing core domain objects for patient encounters including Person, Patient, Encounter, and Provider relationships.",
    category: "Health Informatics",
    diagramType: "class",
    code: getCode('patient-encounters-class')
  },
  {
    title: "[Pie] Visit Share by Setting",
    description: "Pie chart visualizing the distribution of healthcare visits across different care settings.",
    category: "Healthcare Analytics",
    diagramType: "pie",
    code: getCode('visit-share-by-setting')
  },
  {
    title: "[Mindmap] Frail Senior Care Pathway",
    description: "Mindmap outlining the care pathway for frail seniors from intake through outcomes.",
    category: "Clinical Workflow",
    diagramType: "mindmap",
    code: getCode('frail-senior-care-pathway')
  },
  {
    title: "[Git] Sustainability Dashboard Release Flow",
    description: "Git graph modeling an internal analytics repository release workflow with feature branches.",
    category: "Development",
    diagramType: "gitgraph",
    code: getCode('sustainability-dashboard-release')
  },
  {
    title: "[sankey-beta] Hospital Blood Supply & Usage Sankey",
    description: "Visualizes monthly blood component flows from donation sites through processing to clinical consumption (surgery, ICU, oncology) and losses/waste. Values are units per month (approximate for a regional hospital group).",
    category: "Healthcare Analytics",
    diagramType: "sankey-beta",
    code: getCode('hospital-blood-supply-sankey')
  },
  {
    title: "[quadrantChart] Vaccine Outreach: Reach vs Adoption",
    description: "Compares vaccination program performance across community clinics by reach (x-axis: fraction of eligible population contacted) and adoption (y-axis: percent of contacted people who vaccinated). Quadrant labels give action guidance for public health teams.",
    category: "Public Health",
    diagramType: "quadrantChart",
    code: getCode('vaccine-outreach-quadrant')
  }
];
