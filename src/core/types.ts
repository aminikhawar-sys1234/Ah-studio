// AH Studio Core — Type System
// Central type definitions for the entire platform

export type ID = string;
export type Timestamp = string;

export type ProjectType = 'video' | 'image' | 'audio' | 'reel' | 'short';
export type ProjectStatus = 'draft' | 'editing' | 'rendering' | 'completed' | 'archived';
export type TemplateType = 'video' | 'image' | 'reel' | 'short' | 'youtube' | 'youtube_thumbnail' | 'instagram' | 'facebook' | 'tiktok' | 'story' | 'invitation' | 'poster' | 'banner';
export type TemplateStatus = 'draft' | 'published' | 'unpublished';
export type AssetType = 'image' | 'video' | 'audio' | 'music' | 'font' | 'sticker' | 'gif' | 'lut' | 'effect' | 'transition' | 'template';
export type PluginStatus = 'active' | 'inactive' | 'error';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type SettingsScope = 'user' | 'system';

export interface CanvasConfig {
  width: number;
  height: number;
  background: string;
  fps?: number;
  duration?: number;
}

export interface Layer {
  id: ID;
  name: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'shape' | 'sticker' | 'button' | 'icon' | 'container' | 'group' | 'mask';
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  opacity: number;
  scale: number;
  visible: boolean;
  locked: boolean;
  properties: Record<string, unknown>;
  animations?: KeyframeAnimation[];
  children?: Layer[];
}

export interface KeyframeAnimation {
  id: ID;
  property: string;
  keyframes: {
    time: number;
    value: unknown;
    easing?: string;
  }[];
}

export interface TimelineTrack {
  id: ID;
  name: string;
  type: 'video' | 'audio' | 'image' | 'text' | 'overlay' | 'adjustment';
  clips: TimelineClip[];
  locked: boolean;
  hidden: boolean;
}

export interface TimelineClip {
  id: ID;
  layerId: ID;
  start: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  speed: number;
  assetId?: ID;
  properties: Record<string, unknown>;
}

export interface Timeline {
  tracks: TimelineTrack[];
  duration: number;
  markers: {
    id: ID;
    time: number;
    label: string;
    color: string;
  }[];
}

export interface ProjectFile {
  version: string;
  project: {
    id: ID;
    name: string;
    type: ProjectType;
  };
  metadata: Record<string, unknown>;
  canvas: CanvasConfig;
  timeline: Timeline;
  layers: Layer[];
  assets: ID[];
  settings: Record<string, unknown>;
  plugins: ID[];
}

export interface PluginManifest {
  name: string;
  slug: string;
  version: string;
  author: string;
  description: string;
  minimum_core_version: string;
  permissions: string[];
  dependencies: string[];
  entry_point: string;
  configuration: Record<string, unknown>;
  api_hooks: string[];
}

export interface FeatureRegistration {
  id: string;
  name: string;
  category: string;
  version: string;
  status: 'active' | 'inactive';
  permissions: string[];
  dependencies: string[];
  configuration: Record<string, unknown>;
  entry_point?: string;
}

export interface ApiResponse<T = unknown> {
  code: string;
  message: string;
  data?: T;
  details?: unknown;
  requestId?: string;
  timestamp: Timestamp;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FilterOptions {
  search?: string;
  category?: string;
  type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
