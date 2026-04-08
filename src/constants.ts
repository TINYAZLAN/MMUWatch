export const FACULTIES = [
  "Faculty of Information Science and Technology (FIST)",
  "Faculty of Business (FOB)",
  "Faculty of Law (FOL)",
  "Faculty of Engineering and Technology (FET)"
];

export const DEPARTMENTS = [
  "Student Affairs Division",
  "Academic Affairs Office",
  "Finance Department",
  "IT Services",
  "Human Resources",
  "Library",
  "Research Management Centre",
  "International Relations Office"
];

export const SUBJECTS_BY_FACULTY: Record<string, string[]> = {
  "Faculty of Information Science and Technology (FIST)": [
    "Data Structures",
    "Artificial Intelligence",
    "Web Development"
  ],
  "Faculty of Business (FOB)": [
    "Principles of Marketing",
    "Financial Accounting",
    "Business Ethics"
  ],
  "Faculty of Law (FOL)": [
    "Constitutional Law",
    "Criminal Law",
    "Contract Law"
  ],
  "Faculty of Engineering and Technology (FET)": [
    "Digital Electronics",
    "Thermodynamics",
    "Circuit Theory"
  ]
};

export const ASSIGNMENTS_BY_SUBJECT: Record<string, { id: string, name: string, keyword: string, exampleFormat: string }[]> = {
  "Data Structures": [
    { id: 'ds1', name: 'Linked List Implementation', keyword: 'linked list', exampleFormat: 'MP4, 1080p, Screen Recording with Voiceover' },
    { id: 'ds2', name: 'Binary Search Tree Visualization', keyword: 'tree', exampleFormat: 'MP4, 720p, Animation or Code Walkthrough' },
    { id: 'ds3', name: 'Graph Algorithms Demo', keyword: 'graph', exampleFormat: 'MP4, 1080p, Live Coding Session' }
  ],
  "Artificial Intelligence": [
    { id: 'ai1', name: 'Neural Network Training', keyword: 'neural', exampleFormat: 'MP4, 1080p, Jupyter Notebook Walkthrough' },
    { id: 'ai2', name: 'Search Algorithms Comparison', keyword: 'search', exampleFormat: 'MP4, 720p, Presentation with Diagrams' },
    { id: 'ai3', name: 'NLP Project Showcase', keyword: 'nlp', exampleFormat: 'MP4, 1080p, Demo of Chatbot' }
  ],
  "Web Development": [
    { id: 'wd1', name: 'React Component Library', keyword: 'react', exampleFormat: 'MP4, 1080p, Browser Demo' },
    { id: 'wd2', name: 'Backend API with Node.js', keyword: 'node', exampleFormat: 'MP4, 720p, Postman Demo' },
    { id: 'wd3', name: 'Responsive Design Portfolio', keyword: 'responsive', exampleFormat: 'MP4, 1080p, Multi-device Showcase' }
  ],
  "Principles of Marketing": [
    { id: 'pm1', name: 'Brand Analysis', keyword: 'brand', exampleFormat: 'MP4, 1080p, Video Essay' },
    { id: 'pm2', name: 'Consumer Behavior Study', keyword: 'consumer', exampleFormat: 'MP4, 720p, Interview Compilation' },
    { id: 'pm3', name: 'Social Media Strategy', keyword: 'social', exampleFormat: 'MP4, 1080p, Campaign Pitch' }
  ],
  "Financial Accounting": [
    { id: 'fa1', name: 'Balance Sheet Analysis', keyword: 'balance', exampleFormat: 'MP4, 1080p, Spreadsheet Walkthrough' },
    { id: 'fa2', name: 'Cash Flow Statement', keyword: 'cash flow', exampleFormat: 'MP4, 720p, Explainer Video' },
    { id: 'fa3', name: 'Auditing Case Study', keyword: 'audit', exampleFormat: 'MP4, 1080p, Presentation' }
  ],
  "Business Ethics": [
    { id: 'be1', name: 'Corporate Social Responsibility', keyword: 'csr', exampleFormat: 'MP4, 1080p, Documentary Style' },
    { id: 'be2', name: 'Whistleblowing Case Study', keyword: 'whistle', exampleFormat: 'MP4, 720p, Roleplay/Debate' },
    { id: 'be3', name: 'Environmental Sustainability', keyword: 'environment', exampleFormat: 'MP4, 1080p, Field Report' }
  ],
  "Constitutional Law": [
    { id: 'cl1', name: 'Separation of Powers', keyword: 'powers', exampleFormat: 'MP4, 1080p, Legal Analysis' },
    { id: 'cl2', name: 'Fundamental Liberties', keyword: 'liberty', exampleFormat: 'MP4, 720p, Case Law Review' },
    { id: 'cl3', name: 'Federalism in Malaysia', keyword: 'federal', exampleFormat: 'MP4, 1080p, Lecture Style' }
  ],
  "Criminal Law": [
    { id: 'crl1', name: 'Mens Rea and Actus Reus', keyword: 'mens rea', exampleFormat: 'MP4, 1080p, Illustrated Explainer' },
    { id: 'crl2', name: 'Defences in Criminal Law', keyword: 'defence', exampleFormat: 'MP4, 720p, Moot Court Simulation' },
    { id: 'crl3', name: 'Homicide Offences', keyword: 'homicide', exampleFormat: 'MP4, 1080p, Case Study' }
  ],
  "Contract Law": [
    { id: 'ctl1', name: 'Offer and Acceptance', keyword: 'offer', exampleFormat: 'MP4, 1080p, Scenario-based Video' },
    { id: 'ctl2', name: 'Vitiating Factors', keyword: 'vitiate', exampleFormat: 'MP4, 720p, Legal Opinion' },
    { id: 'ctl3', name: 'Remedies for Breach', keyword: 'breach', exampleFormat: 'MP4, 1080p, Presentation' }
  ],
  "Digital Electronics": [
    { id: 'de1', name: 'Logic Gates Design', keyword: 'logic', exampleFormat: 'MP4, 1080p, Circuit Simulation' },
    { id: 'de2', name: 'Sequential Circuits', keyword: 'sequential', exampleFormat: 'MP4, 720p, Hardware Demo' },
    { id: 'de3', name: 'Microprocessor Architecture', keyword: 'micro', exampleFormat: 'MP4, 1080p, Diagram Walkthrough' }
  ],
  "Thermodynamics": [
    { id: 'th1', name: 'First Law Application', keyword: 'first law', exampleFormat: 'MP4, 1080p, Problem Solving Session' },
    { id: 'th2', name: 'Entropy and Second Law', keyword: 'entropy', exampleFormat: 'MP4, 720p, Conceptual Explainer' },
    { id: 'th3', name: 'Heat Engine Cycles', keyword: 'cycle', exampleFormat: 'MP4, 1080p, Animation' }
  ],
  "Circuit Theory": [
    { id: 'ct1', name: 'Network Theorems', keyword: 'network', exampleFormat: 'MP4, 1080p, Step-by-step Calculation' },
    { id: 'ct2', name: 'AC Circuit Analysis', keyword: 'ac', exampleFormat: 'MP4, 720p, Oscilloscope Demo' },
    { id: 'ct3', name: 'Transient Response', keyword: 'transient', exampleFormat: 'MP4, 1080p, Simulation' }
  ]
};
