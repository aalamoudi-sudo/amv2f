export interface ProjectionWarpConfig {
  meshResolution: [number, number];
  controlPoints: Array<[number, number, number]>;
}

export interface ProjectionMaskConfig {
  polygonPoints: Array<[number, number]>;
  inverted: boolean;
}

export interface ProjectionKeystoneConfig {
  corners: {
    topLeft: [number, number];
    topRight: [number, number];
    bottomRight: [number, number];
    bottomLeft: [number, number];
  };
}

export interface ProjectorOutputConfig {
  id: string;
  name: string;
  resolution: [number, number];
  viewport: [number, number, number, number];
  warp?: ProjectionWarpConfig;
  mask?: ProjectionMaskConfig;
  keystone?: ProjectionKeystoneConfig;
}

export interface ProjectionCalibrationProfile {
  id: string;
  name: string;
  createdAt: string;
  projectors: ProjectorOutputConfig[];
}
