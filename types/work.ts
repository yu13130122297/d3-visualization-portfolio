import React from "react"
export type WorkCategory =
  | "infographic"
  | "interactive"
  | "geo"
  | "network"
  | "timeline"
  | "experiment";

export interface VisualizationWork {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  fullDescription?: string;
  category: WorkCategory;
  tags: string[];
  component: React.ComponentType;

  prompt: string;

  metadata?: {
    dataSource?: string;
    tools?: string[];
    createdAt?: string;
    inspiration?: string;
  };
}

export const categoryLabels: Record<WorkCategory, string> = {
  infographic: "Infographic",
  interactive: "Interactive",
  geo: "Geo / Map",
  network: "Network",
  timeline: "Timeline",
  experiment: "Experimental",
};

export const categoryLabelsCN: Record<WorkCategory, string> = {
  infographic: "信息图表",
  interactive: "交互可视化",
  geo: "地理可视化",
  network: "网络图",
  timeline: "时间序列",
  experiment: "实验性",
};
