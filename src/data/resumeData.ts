export interface Experience {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  highlights: string[];
  tags: string[];
}

export interface Publication {
  id: string;
  title: string;
  venue: string;
  year: string;
  description: string;
  link?: string;
  tags: string[];
}

export interface Project {
  id: string;
  title: string;
  year: string;
  description: string;
  link?: string;
  tags: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: string;
  honors?: string;
  location: string;
}

export interface Skill {
  category: string;
  items: string[];
}

export const personalInfo = {
  name: "Max Cembalest",
  title: "AI Engineer & Researcher",
  location: "Brooklyn, NY",
  email: "max@cembalest.com",
  website: "maxcembalest.com",
  github: "github.com/mcembalest",
  linkedin: "linkedin.com/in/maxcembalest",
  summary: "AI engineer & researcher with 3+ years of industry experience making AI more defensible and explainable. Published researcher at ICLR and SaTML with expertise in LLM evaluation, embeddings, and ML interpretability."
};

export const experiences: Experience[] = [
  {
    id: "nomic",
    company: "Nomic AI",
    role: "AI Engineer",
    location: "Remote",
    startDate: "2024",
    endDate: "2025",
    highlights: [
      "Built AI systems leveraging vector embeddings and dimensionality reduction for retrieval, clustering, and analysis",
      "Developed SDKs, technical guides, and documentation enabling tens of thousands of developers to use Nomic models",
      "Benchmarked embedding models and built APIs and Python clients for Nomic's product suite",
      "Created end-to-end workflows to productionize Nomic's models and tools into deployed applications",
      "Contributed UMAP tutorial to official documentation demonstrating neural network training visualization"
    ],
    tags: ["embeddings", "retrieval", "documentation", "sdk", "python", "ml"]
  },
  {
    id: "arthur",
    company: "Arthur AI",
    role: "ML Research Engineer",
    location: "New York, NY",
    startDate: "2022",
    endDate: "2024",
    highlights: [
      "Built interpretability systems for scalable model auditing across enterprise ML deployments",
      "Developed security systems to detect & mitigate LLM failure modes including prompt injections and hallucinations",
      "Led research on LLM-as-judge evaluation methods, culminating in ICLR 2025 publication",
      "Created PEAR (Post-Hoc Explanation Agreement Regularization) training objective published at AIES 2023",
      "Presented research at ODSC conferences on LLM evaluation and ML interpretability"
    ],
    tags: ["llm", "security", "interpretability", "research", "evaluation", "ml"]
  },
  {
    id: "ala",
    company: "African Leadership Academy",
    role: "Mathematics & CS Teacher",
    location: "Johannesburg, South Africa",
    startDate: "2018",
    endDate: "2020",
    highlights: [
      "Taught calculus and computer science to high school students from across Africa",
      "Developed curriculum for introductory programming courses",
      "Mentored students on university applications and career development"
    ],
    tags: ["education", "teaching", "curriculum", "mentorship"]
  }
];

export const publications: Publication[] = [
  {
    id: "sos",
    title: "Style Outweighs Substance: Failure Modes of LLM Judges in Alignment Benchmarking",
    venue: "ICLR 2025",
    year: "2025",
    description: "Identified critical biases in LLM-judges for AI alignment, developed SOS-BENCH meta-benchmark with ground truth for reliable model alignment measurement.",
    link: "https://arxiv.org/abs/2409.15268",
    tags: ["llm", "evaluation", "alignment", "benchmark"]
  },
  {
    id: "pear",
    title: "Reckoning with the Disagreement Problem: Post-Hoc Explanation Agreement as a Training Objective",
    venue: "AIES 2023",
    year: "2023",
    description: "Developed PEAR training objective to improve consistency of neural network explanations across different post-hoc explainers.",
    link: "https://arxiv.org/abs/2303.13299",
    tags: ["interpretability", "explainability", "neural-networks", "ml"]
  },
  {
    id: "tensions",
    title: "Tensions Between the Proxies of Human Values in AI",
    venue: "SaTML 2023 (IEEE)",
    year: "2023",
    description: "Position paper analyzing tradeoffs between fairness, transparency, and privacy in AI systems.",
    tags: ["fairness", "ethics", "privacy", "ml"]
  }
];

export const projects: Project[] = [
  {
    id: "nomic-docs",
    title: "Nomic AI Platform Documentation",
    year: "2025",
    description: "Owner of technical guides, developer SDKs, and explanatory videos for the Nomic AI Platform embedding models and product capabilities.",
    link: "https://docs.nomic.ai",
    tags: ["documentation", "sdk", "embeddings"]
  },
  {
    id: "umap-tutorial",
    title: "UMAP Neural Network Training Visualization Tutorial",
    year: "2025",
    description: "Contributed guide to official UMAP documentation demonstrating neural network training dynamics visualization using Nomic Atlas.",
    tags: ["visualization", "umap", "neural-networks", "tutorial"]
  },
  {
    id: "gnn-tutorial",
    title: "Graph Neural Networks & PyTorch Geometric Tutorial",
    year: "2024",
    description: "Created comprehensive tutorial for training GNNs using PyTorch Geometric with embedding visualization during training.",
    link: "https://github.com/mcembalest/GNN",
    tags: ["gnn", "pytorch", "tutorial", "visualization"]
  },
  {
    id: "skew-the-script",
    title: "Interactive Statistics Web Applications",
    year: "2022",
    description: "Developed interactive web apps for AP Statistics covering distributional sampling, hypothesis testing, and the Central Limit Theorem.",
    tags: ["education", "statistics", "web-dev", "visualization"]
  },
  {
    id: "capstone",
    title: "Geospatial Modeling for Lead Pipe Removal",
    year: "2021",
    description: "Master's capstone developing geospatial model to identify lead pipes in Flint, Michigan and prioritize digging efforts.",
    tags: ["geospatial", "ml", "social-impact"]
  }
];

export const education: Education[] = [
  {
    id: "harvard",
    institution: "Harvard University",
    degree: "Master of Science",
    field: "Data Science",
    year: "2022",
    location: "Cambridge, MA"
  },
  {
    id: "wesleyan",
    institution: "Wesleyan University",
    degree: "Bachelor of Arts",
    field: "Mathematics & Computer Science",
    year: "2018",
    honors: "Phi Beta Kappa",
    location: "Middletown, CT"
  }
];

export const skills: Skill[] = [
  {
    category: "Languages",
    items: ["Python", "TypeScript", "JavaScript", "SQL", "R"]
  },
  {
    category: "ML/AI",
    items: ["PyTorch", "Transformers", "LLMs", "Embeddings", "UMAP", "Scikit-learn", "XGBoost"]
  },
  {
    category: "Tools & Platforms",
    items: ["Git", "Docker", "AWS", "GCP", "FastAPI", "React", "Node.js"]
  },
  {
    category: "Specializations",
    items: ["LLM Evaluation", "ML Interpretability", "Vector Search", "RAG Systems", "Model Security"]
  }
];

export const speakingEngagements = [
  { event: "ODSC East 2025", topic: "Nomic Embedding Models: Pre-training and Post-training Methods" },
  { event: "ODSC East 2024", topic: "The Ultimate Guide to LLM Experimentation and Development" },
  { event: "ODSC East 2023", topic: "Reckoning with the Disagreement Problem" }
];

