export interface Doc {
  releases?: {
    name: string | NameObject;
    chart: string;
    version: string;
  }[];
  repositories?: {
    name: string;
    url: string;
  }[];
}

export interface NameObject {
  requiredEnv: string;
}
