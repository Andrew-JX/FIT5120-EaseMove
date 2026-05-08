export type MapFlyToOptions = {
  duration?: number;
};

export interface MapViewportController {
  zoomIn: () => void;
  zoomOut: () => void;
  flyTo: (center: [number, number], zoom: number, options?: MapFlyToOptions) => void;
}
