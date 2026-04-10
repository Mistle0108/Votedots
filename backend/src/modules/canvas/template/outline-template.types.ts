export interface OutlineTemplateCell {
  x: number;
  y: number;
}

export interface OutlineTemplate {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  cells: OutlineTemplateCell[];
}
