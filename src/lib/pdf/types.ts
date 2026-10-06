export interface ToolMeta {
  title: string;
  description: string;
  shortDescription: string;
  category: 'organize' | 'optimize' | 'security' | 'convert';
  icon: string;
  isFlagship?: boolean;
  popular?: boolean;
  slug: string;
  faqs: Array<{ question: string; answer: string }>;
  howToSteps: Array<{ title: string; description: string }>;
}

export interface ProcessingProgress {
  percent: number;
  message: string;
  currentStep?: number;
  totalSteps?: number;
}
