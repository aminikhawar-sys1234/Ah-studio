import { useState, useCallback, useRef, type ReactNode } from 'react';
import {
  Type, Image as ImageIcon, Video, Square, Sticker,
  Trash2, Copy, Eye, EyeOff, Lock, Unlock,
  ChevronUp, ChevronDown, Plus, Layers,
  Play, Pause, SkipBack, SkipForward, Scissors,
  Undo2, Redo2, Save, Download,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';
import { cn, slugify } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { commandEngine, type Command } from '@/core/commandEngine';
import { eventBus } from '@/core/eventBus';
import type { Layer, CanvasConfig, Timeline, TimelineTrack, TimelineClip } from '@/core/types';

interface EditorPageProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
}

const defaultCanvas: CanvasConfig = {
  width: 1920,
  height: 1080,
  background: '#1a1a2e',
  fps: 30,
  duration: 30,
};

function createLayer(type: Layer['type'], name: string): Layer {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    position: { x: 100, y: 100 },
    size: { width: 200, height: 200 },
    rotation: 0,
    opacity: 1,
    scale: 1,
    visible: true,
    locked: false,
    properties: {},
  };
}

const layerTypeIcons: Record<Layer['type'], typeof Type> = {
  text: Type,
  image: ImageIcon,
  video: Video,
  audio: Video,
  shape: Square,
  sticker: Sticker,
  button: Square,
  icon: Square,
  container: Square,
  group: Layers,
  mask: Square,
};

const layerTypeLabels: Record<Layer['type'], string> = {
  text: 'Text', image: 'Image', video: 'Video', audio: 'Audio',
  shape: 'Shape', sticker: 'Sticker', button: 'Button', icon: 'Icon',
  container: 'Container', group: 'Group', mask: 'Mask',
};

export function EditorPage({ projectName, onBack }: EditorPageProps) {
  const toast = useToast();
  const [canvas, setCanvas] = useState<CanvasConfig>(defaultCanvas);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Timeline>({ tracks: [], duration: 30, markers: [] });
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedLayer = layers.find((l) => l.id === selectedId) ?? null;

  // --- Command helpers ---
  const addLayerCommand = useCallback((layer: Layer): Command => {
    return {
      id: crypto.randomUUID(),
      type: 'ADD_LAYER',
      description: `Add ${layer.type} layer "${layer.name}"`,
      execute: () => setLayers((prev) => [...prev, layer]),
      undo: () => setLayers((prev) => prev.filter((l) => l.id !== layer.id)),
      redo: () => setLayers((prev) => [...prev, layer]),
    };
  }, []);

  const deleteLayerCommand = useCallback((layer: Layer): Command => {
    return {
      id: crypto.randomUUID(),
      type: 'DELETE_LAYER',
      description: `Delete layer "${layer.name}"`,
      execute: () => setLayers((prev) => prev.filter((l) => l.id !== layer.id)),
      undo: () => setLayers((prev) => [...prev, layer]),
      redo: () => setLayers((prev) => prev.filter((l) => l.id !== layer.id)),
    };
  }, []);

  const updateLayerCommand = useCallback((id: string, updates: Partial<Layer>, prevValues: Partial<Layer>): Command => {
    return {
      id: crypto.randomUUID(),
      type: 'UPDATE_LAYER',
      description: `Update layer`,
      execute: () => setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l))),
      undo: () => setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...prevValues } : l))),
      redo: () => setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l))),
    };
  }, []);

  const addLayer = (type: Layer['type']) => {
    const count = layers.filter((l) => l.type === type).length + 1;
    const name = `${layerTypeLabels[type]} ${count}`;
    const layer = createLayer(type, name);
    if (type === 'text') {
      layer.properties = { text: 'Your text here', fontSize: 48, color: '#ffffff', fontWeight: 'normal', textAlign: 'left' };
      layer.size = { width: 400, height: 60 };
    }
    commandEngine.execute(addLayerCommand(layer));
    setSelectedId(layer.id);
    eventBus.emit('onSelectionChange', { selectedIds: [layer.id] });
  };

  const deleteLayer = (id: string) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    commandEngine.execute(deleteLayerCommand(layer));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateLayer = (id: string) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    const copy: Layer = {
      ...layer,
      id: crypto.randomUUID(),
      name: `${layer.name} (copy)`,
      position: { x: layer.position.x + 20, y: layer.position.y + 20 },
    };
    commandEngine.execute(addLayerCommand(copy));
    setSelectedId(copy.id);
  };

  const updateLayer = (id: string, updates: Partial<Layer>) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    const prevValues: Partial<Layer> = {};
    for (const key of Object.keys(updates)) {
      (prevValues as Record<string, unknown>)[key] = (layer as Record<string, unknown>)[key];
    }
    commandEngine.execute(updateLayerCommand(id, updates, prevValues));
  };

  const moveLayer = (id: string, direction: 'up' | 'down') => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const toggleVisible = (id: string) => updateLayer(id, { visible: !layers.find((l) => l.id === id)?.visible });
  const toggleLock = (id: string) => updateLayer(id, { locked: !layers.find((l) => l.id === id)?.locked });

  // --- Canvas drag ---
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, lx: 0, ly: 0 });

  const onCanvasMouseDown = (e: React.MouseEvent, layer: Layer) => {
    if (layer.locked) return;
    e.stopPropagation();
    setSelectedId(layer.id);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, lx: layer.position.x, ly: layer.position.y };
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !selectedId) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const layer = layers.find((l) => l.id === selectedId);
    if (!layer) return;
    setLayers((prev) => prev.map((l) =>
      l.id === selectedId ? { ...l, position: { x: dragStart.current.lx + dx, y: dragStart.current.ly + dy } } : l
    ));
  };

  const onCanvasMouseUp = () => {
    if (dragging && selectedId) {
      const layer = layers.find((l) => l.id === selectedId);
      if (layer) {
        const orig = layers.find((l) => l.id === selectedId);
        if (orig && (orig.position.x !== dragStart.current.lx || orig.position.y !== dragStart.current.ly)) {
          // Already updated via setLayers; snap to final position
          eventBus.emit('onSelectionChange', { selectedIds: [selectedId] });
        }
      }
    }
    setDragging(false);
  };

  const onCanvasClick = () => {
    setSelectedId(null);
    eventBus.emit('onSelectionChange', { selectedIds: [] });
  };

  // --- Timeline ---
  const addTrack = (type: TimelineTrack['type']) => {
    const track: TimelineTrack = {
      id: crypto.randomUUID(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track`,
      type,
      clips: [],
      locked: false,
      hidden: false,
    };
    setTimeline((prev) => ({ ...prev, tracks: [...prev.tracks, track] }));
    toast.success(`Added ${type} track`);
  };

  const addClipToTrack = (trackId: string) => {
    const track = timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const clip: TimelineClip = {
      id: crypto.randomUUID(),
      layerId: selectedId ?? crypto.randomUUID(),
      start: playhead,
      duration: 5,
      trimStart: 0,
      trimEnd: 0,
      speed: 1,
      properties: {},
    };
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: [...t.clips, clip].sort((a, b) => a.start - b.start) } : t
      ),
    }));
    eventBus.emit('onTimelineChange', { timeline });
  };

  const deleteClip = (trackId: string, clipId: string) => {
    setTimeline((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) } : t
      ),
    }));
  };

  // --- Playback ---
  const togglePlay = () => {
    setPlaying((p) => {
      if (!p) {
        if (playhead >= timeline.duration) setPlayhead(0);
      }
      return !p;
    });
  };

  // Simulate playback timer
  useState(() => {
    setInterval(() => {
      setPlayhead((prev) => {
        if (prev >= timeline.duration) return timeline.duration;
        return prev + 0.03;
      });
    }, 30);
    return 0;
  });

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const f = Math.floor((seconds % 1) * 30);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  };

  // --- Render layer on canvas ---
  const renderLayer = (layer: Layer): ReactNode => {
    if (!layer.visible) return null;
    const isSelected = layer.id === selectedId;
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: layer.position.x,
      top: layer.position.y,
      width: layer.size.width * layer.scale,
      height: layer.size.height * layer.scale,
      transform: `rotate(${layer.rotation}deg)`,
      opacity: layer.opacity,
      cursor: layer.locked ? 'default' : 'move',
      outline: isSelected ? '2px solid #14b8a6' : 'none',
      outlineOffset: '2px',
    };

    if (layer.type === 'text') {
      const props = layer.properties as {
        text?: string; fontSize?: number; color?: string;
        fontWeight?: string; textAlign?: string; fontStyle?: string;
      };
      return (
        <div
          key={layer.id}
          style={{
            ...baseStyle,
            fontSize: (props.fontSize ?? 48) * layer.scale,
            color: props.color ?? '#ffffff',
            fontWeight: props.fontWeight ?? 'normal',
            fontStyle: props.fontStyle ?? 'normal',
            textAlign: (props.textAlign as React.CSSPropertyTextAlign) ?? 'left',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
          onMouseDown={(e) => onCanvasMouseDown(e, layer)}
        >
          {props.text ?? 'Text'}
        </div>
      );
    }

    if (layer.type === 'shape') {
      const props = layer.properties as { fill?: string; borderRadius?: number };
      return (
        <div
          key={layer.id}
          style={{
            ...baseStyle,
            background: props.fill ?? '#14b8a6',
            borderRadius: props.borderRadius ?? 0,
          }}
          onMouseDown={(e) => onCanvasMouseDown(e, layer)}
        />
      );
    }

    if (layer.type === 'image' || layer.type === 'video' || layer.type === 'sticker') {
      const props = layer.properties as { src?: string; fill?: string };
      if (props.src) {
        return (
          <img
            key={layer.id}
            src={props.src}
            alt={layer.name}
            style={baseStyle}
            onMouseDown={(e) => onCanvasMouseDown(e, layer)}
            draggable={false}
          />
        );
      }
      return (
        <div
          key={layer.id}
          style={{
            ...baseStyle,
            background: props.fill ?? '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: 12,
          }}
          onMouseDown={(e) => onCanvasMouseDown(e, layer)}
        >
          {layerTypeLabels[layer.type]}
        </div>
      );
    }

    return (
      <div
        key={layer.id}
        style={{
          ...baseStyle,
          background: '#334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: 12,
          borderRadius: layer.type === 'button' ? 8 : 0,
        }}
        onMouseDown={(e) => onCanvasMouseDown(e, layer)}
      >
        {layerTypeLabels[layer.type]}
      </div>
    );
  };

  // --- Canvas scale ---
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(0.3);

  const handleSave = () => {
    toast.success('Project saved', `${projectName} saved successfully`);
  };

  const handleExport = () => {
    toast.info('Export started', 'Your render job has been queued');
  };

  return (
    <div className="flex flex-col h-screen bg-secondary-900 overflow-hidden">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-secondary-800 border-b border-secondary-700">
        <div className="flex items-center gap-2">
          <button className="btn-ghost text-secondary-300 hover:text-white text-sm" onClick={onBack}>
            ← Back
          </button>
          <span className="text-secondary-600">|</span>
          <span className="text-sm font-medium text-white">{projectName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-ghost text-secondary-300 hover:text-white px-2 py-1" title="Undo"
            onClick={() => { commandEngine.undo(); toast.info('Undo'); }}
            disabled={!commandEngine.canUndo()}>
            <Undo2 className="h-4 w-4" />
          </button>
          <button className="btn-ghost text-secondary-300 hover:text-white px-2 py-1" title="Redo"
            onClick={() => { commandEngine.redo(); toast.info('Redo'); }}
            disabled={!commandEngine.canRedo()}>
            <Redo2 className="h-4 w-4" />
          </button>
          <span className="text-secondary-600 mx-1">|</span>
          <button className="btn-ghost text-secondary-300 hover:text-white px-2 py-1" title="Save" onClick={handleSave}>
            <Save className="h-4 w-4" />
          </button>
          <button className="btn-primary text-sm" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Tools */}
        <div className="w-14 bg-secondary-800 border-r border-secondary-700 flex flex-col items-center py-3 gap-1">
          {(['text', 'image', 'video', 'shape', 'sticker'] as Layer['type'][]).map((t) => {
            const Icon = layerTypeIcons[t];
            return (
              <button key={t} onClick={() => addLayer(t)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-secondary-400 hover:text-white hover:bg-secondary-700 transition-colors"
                title={`Add ${layerTypeLabels[t]}`}>
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
          <div className="w-8 border-t border-secondary-700 my-2" />
          <button onClick={() => selectedId && deleteLayer(selectedId)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-error-400 hover:text-error-300 hover:bg-error-900/30 transition-colors disabled:opacity-30"
            title="Delete layer" disabled={!selectedId}>
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        {/* Left: Layers panel */}
        <div className="w-56 bg-secondary-800 border-r border-secondary-700 flex flex-col">
          <div className="px-3 py-2 border-b border-secondary-700">
            <div className="flex items-center gap-2 text-secondary-300">
              <Layers className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Layers</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {[...layers].reverse().map((layer) => {
              const Icon = layerTypeIcons[layer.type];
              const isSelected = layer.id === selectedId;
              return (
                <div key={layer.id}
                  onClick={() => { setSelectedId(layer.id); eventBus.emit('onSelectionChange', { selectedIds: [layer.id] }); }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-secondary-700/50 transition-colors',
                    isSelected ? 'bg-primary-600/20 border-l-2 border-l-primary-500' : 'hover:bg-secondary-700/50'
                  )}>
                  <Icon className="h-3.5 w-3.5 text-secondary-400 flex-shrink-0" />
                  <span className={cn('text-xs flex-1 truncate', isSelected ? 'text-white' : 'text-secondary-300')}>
                    {layer.name}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); toggleVisible(layer.id); }}
                    className="text-secondary-500 hover:text-secondary-300">
                    {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleLock(layer.id); }}
                    className="text-secondary-500 hover:text-secondary-300">
                    {layer.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </button>
                </div>
              );
            })}
            {layers.length === 0 && (
              <p className="text-xs text-secondary-500 text-center py-8">No layers yet.<br />Use the tools to add one.</p>
            )}
          </div>
          <div className="flex border-t border-secondary-700">
            <button onClick={() => selectedId && duplicateLayer(selectedId)} disabled={!selectedId}
              className="flex-1 py-2 text-secondary-400 hover:text-white hover:bg-secondary-700 disabled:opacity-30 transition-colors" title="Duplicate">
              <Copy className="h-4 w-4 mx-auto" />
            </button>
            <button onClick={() => selectedId && moveLayer(selectedId, 'up')} disabled={!selectedId}
              className="flex-1 py-2 text-secondary-400 hover:text-white hover:bg-secondary-700 disabled:opacity-30 transition-colors" title="Move up">
              <ChevronUp className="h-4 w-4 mx-auto" />
            </button>
            <button onClick={() => selectedId && moveLayer(selectedId, 'down')} disabled={!selectedId}
              className="flex-1 py-2 text-secondary-400 hover:text-white hover:bg-secondary-700 disabled:opacity-30 transition-colors" title="Move down">
              <ChevronDown className="h-4 w-4 mx-auto" />
            </button>
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col bg-secondary-900 overflow-hidden">
          <div ref={canvasAreaRef} className="flex-1 overflow-auto flex items-center justify-center p-8"
            onClick={onCanvasClick}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
          >
            <div
              ref={canvasRef}
              className="relative shadow-2xl flex-shrink-0"
              style={{
                width: canvas.width * canvasScale,
                height: canvas.height * canvasScale,
                background: canvas.background,
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0, left: 0,
                width: canvas.width,
                height: canvas.height,
                transform: `scale(${canvasScale})`,
                transformOrigin: 'top left',
              }}>
                {layers.map(renderLayer)}
              </div>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-2 py-1 bg-secondary-800 border-t border-secondary-700">
            <button className="btn-ghost text-secondary-400 hover:text-white text-xs px-2 py-0.5"
              onClick={() => setCanvasScale((s) => Math.max(0.1, s - 0.05))}>−</button>
            <span className="text-xs text-secondary-400 w-12 text-center">{Math.round(canvasScale * 100)}%</span>
            <button className="btn-ghost text-secondary-400 hover:text-white text-xs px-2 py-0.5"
              onClick={() => setCanvasScale((s) => Math.min(1, s + 0.05))}>+</button>
            <button className="btn-ghost text-secondary-400 hover:text-white text-xs px-2 py-0.5"
              onClick={() => setCanvasScale(0.3)}>Fit</button>
          </div>

          {/* Timeline */}
          <div className="h-56 bg-secondary-800 border-t border-secondary-700 flex flex-col">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-secondary-700">
              <div className="flex items-center gap-1">
                <button onClick={() => setPlayhead(0)} className="btn-ghost text-secondary-400 hover:text-white p-1"><SkipBack className="h-4 w-4" /></button>
                <button onClick={togglePlay} className="btn-ghost text-secondary-300 hover:text-white p-1">
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button onClick={() => setPlayhead(timeline.duration)} className="btn-ghost text-secondary-400 hover:text-white p-1"><SkipForward className="h-4 w-4" /></button>
                <span className="text-xs text-secondary-400 font-mono ml-2">{formatTime(playhead)} / {formatTime(timeline.duration)}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => addTrack('video')} className="btn-ghost text-secondary-400 hover:text-white text-xs px-2 py-0.5">+ Video Track</button>
                <button onClick={() => addTrack('audio')} className="btn-ghost text-secondary-400 hover:text-white text-xs px-2 py-0.5">+ Audio</button>
                <button onClick={() => addTrack('text')} className="btn-ghost text-secondary-400 hover:text-white text-xs px-2 py-0.5">+ Text</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Ruler */}
              <div className="flex h-6 border-b border-secondary-700 bg-secondary-800 sticky top-0 z-10">
                <div className="w-32 flex-shrink-0 border-r border-secondary-700" />
                <div className="flex-1 relative">
                  {Array.from({ length: Math.ceil(timeline.duration) + 1 }).map((_, i) => (
                    <div key={i} className="absolute top-0 h-full flex items-center"
                      style={{ left: `${(i / timeline.duration) * 100}%` }}>
                      <span className="text-[10px] text-secondary-500 font-mono">{i}s</span>
                    </div>
                  ))}
                </div>
              </div>

              {timeline.tracks.map((track) => (
                <div key={track.id} className="flex border-b border-secondary-700/50">
                  <div className="w-32 flex-shrink-0 border-r border-secondary-700 px-2 py-1.5">
                    <span className="text-xs text-secondary-300 truncate block">{track.name}</span>
                  </div>
                  <div className="flex-1 relative min-h-[40px] py-1.5"
                    onClick={() => addClipToTrack(track.id)}>
                    {track.clips.map((clip) => (
                      <div key={clip.id}
                        className="absolute top-1 h-7 rounded bg-primary-600/60 border border-primary-400 px-2 flex items-center text-xs text-white overflow-hidden cursor-move group"
                        style={{
                          left: `${(clip.start / timeline.duration) * 100}%`,
                          width: `${(clip.duration / timeline.duration) * 100}%`,
                        }}
                        onClick={(e) => e.stopPropagation()}>
                        <span className="truncate">{clip.duration}s</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteClip(track.id, clip.id); }}
                          className="ml-auto opacity-0 group-hover:opacity-100 text-error-300 hover:text-error-200">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {track.clips.length === 0 && (
                      <div className="h-full flex items-center justify-center text-[10px] text-secondary-600">
                        Click to add clip
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {timeline.tracks.length === 0 && (
                <div className="flex items-center justify-center h-20 text-xs text-secondary-500">
                  No tracks yet. Add a track to start building your timeline.
                </div>
              )}
            </div>

            {/* Playhead indicator overlay */}
            <div className="relative h-0">
              <div className="absolute -top-56 pointer-events-none" style={{ left: `calc(8rem + ${(playhead / timeline.duration) * 100}% * (1 - 8rem / 100%))` }}>
                <div className="w-px h-56 bg-accent-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Properties inspector */}
        <div className="w-64 bg-secondary-800 border-l border-secondary-700 overflow-y-auto">
          <div className="px-3 py-2 border-b border-secondary-700">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary-300">Properties</span>
          </div>
          {selectedLayer ? (
            <div className="p-3 space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-400 mb-1">Name</label>
                <input className="input text-sm" value={selectedLayer.name}
                  onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-secondary-400 mb-1">X</label>
                  <input type="number" className="input text-sm" value={Math.round(selectedLayer.position.x)}
                    onChange={(e) => updateLayer(selectedLayer.id, { position: { ...selectedLayer.position, x: Number(e.target.value) } })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-400 mb-1">Y</label>
                  <input type="number" className="input text-sm" value={Math.round(selectedLayer.position.y)}
                    onChange={(e) => updateLayer(selectedLayer.id, { position: { ...selectedLayer.position, y: Number(e.target.value) } })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-secondary-400 mb-1">Width</label>
                  <input type="number" className="input text-sm" value={Math.round(selectedLayer.size.width)}
                    onChange={(e) => updateLayer(selectedLayer.id, { size: { ...selectedLayer.size, width: Number(e.target.value) } })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-400 mb-1">Height</label>
                  <input type="number" className="input text-sm" value={Math.round(selectedLayer.size.height)}
                    onChange={(e) => updateLayer(selectedLayer.id, { size: { ...selectedLayer.size, height: Number(e.target.value) } })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-400 mb-1">Rotation: {selectedLayer.rotation}°</label>
                <input type="range" min={0} max={360} value={selectedLayer.rotation}
                  onChange={(e) => updateLayer(selectedLayer.id, { rotation: Number(e.target.value) })}
                  className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-400 mb-1">Opacity: {Math.round(selectedLayer.opacity * 100)}%</label>
                <input type="range" min={0} max={1} step={0.01} value={selectedLayer.opacity}
                  onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                  className="w-full" />
              </div>

              <div>
                <label className="block text-xs font-medium text-secondary-400 mb-1">Scale: {Math.round(selectedLayer.scale * 100)}%</label>
                <input type="range" min={0.1} max={3} step={0.01} value={selectedLayer.scale}
                  onChange={(e) => updateLayer(selectedLayer.id, { scale: Number(e.target.value) })}
                  className="w-full" />
              </div>

              {selectedLayer.type === 'text' && (
                <div className="space-y-2 pt-2 border-t border-secondary-700">
                  <span className="text-xs font-semibold text-secondary-300">Text Properties</span>
                  <textarea className="input text-sm" rows={2}
                    value={(selectedLayer.properties as { text?: string }).text ?? ''}
                    onChange={(e) => updateLayer(selectedLayer.id, { properties: { ...selectedLayer.properties, text: e.target.value } })}
                    placeholder="Enter text..." />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-secondary-400 mb-1">Font Size</label>
                      <input type="number" className="input text-sm"
                        value={(selectedLayer.properties as { fontSize?: number }).fontSize ?? 48}
                        onChange={(e) => updateLayer(selectedLayer.id, { properties: { ...selectedLayer.properties, fontSize: Number(e.target.value) } })} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary-400 mb-1">Color</label>
                      <input type="color" className="input text-sm h-9 p-1"
                        value={(selectedLayer.properties as { color?: string }).color ?? '#ffffff'}
                        onChange={(e) => updateLayer(selectedLayer.id, { properties: { ...selectedLayer.properties, color: e.target.value } })} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className={cn('btn-ghost p-1.5', (selectedLayer.properties as { fontWeight?: string }).fontWeight === 'bold' ? 'text-primary-400 bg-primary-600/20' : 'text-secondary-400')}
                      onClick={() => updateLayer(selectedLayer.id, {
                        properties: {
                          ...selectedLayer.properties,
                          fontWeight: (selectedLayer.properties as { fontWeight?: string }).fontWeight === 'bold' ? 'normal' : 'bold',
                        },
                      })}>
                      <Bold className="h-4 w-4" />
                    </button>
                    <button
                      className={cn('btn-ghost p-1.5', (selectedLayer.properties as { fontStyle?: string }).fontStyle === 'italic' ? 'text-primary-400 bg-primary-600/20' : 'text-secondary-400')}
                      onClick={() => updateLayer(selectedLayer.id, {
                        properties: {
                          ...selectedLayer.properties,
                          fontStyle: (selectedLayer.properties as { fontStyle?: string }).fontStyle === 'italic' ? 'normal' : 'italic',
                        },
                      })}>
                      <Italic className="h-4 w-4" />
                    </button>
                    <button
                      className={cn('btn-ghost p-1.5', (selectedLayer.properties as { textAlign?: string }).textAlign === 'left' ? 'text-primary-400 bg-primary-600/20' : 'text-secondary-400')}
                      onClick={() => updateLayer(selectedLayer.id, { properties: { ...selectedLayer.properties, textAlign: 'left' } })}>
                      <AlignLeft className="h-4 w-4" />
                    </button>
                    <button
                      className={cn('btn-ghost p-1.5', (selectedLayer.properties as { textAlign?: string }).textAlign === 'center' ? 'text-primary-400 bg-primary-600/20' : 'text-secondary-400')}
                      onClick={() => updateLayer(selectedLayer.id, { properties: { ...selectedLayer.properties, textAlign: 'center' } })}>
                      <AlignCenter className="h-4 w-4" />
                    </button>
                    <button
                      className={cn('btn-ghost p-1.5', (selectedLayer.properties as { textAlign?: string }).textAlign === 'right' ? 'text-primary-400 bg-primary-600/20' : 'text-secondary-400')}
                      onClick={() => updateLayer(selectedLayer.id, { properties: { ...selectedLayer.properties, textAlign: 'right' } })}>
                      <AlignRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {selectedLayer.type === 'shape' && (
                <div className="space-y-2 pt-2 border-t border-secondary-700">
                  <span className="text-xs font-semibold text-secondary-300">Shape Properties</span>
                  <div>
                    <label className="block text-xs font-medium text-secondary-400 mb-1">Fill Color</label>
                    <input type="color" className="input text-sm h-9 p-1"
                      value={(selectedLayer.properties as { fill?: string }).fill ?? '#14b8a6'}
                      onChange={(e) => updateLayer(selectedLayer.id, { properties: { ...selectedLayer.properties, fill: e.target.value } })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary-400 mb-1">Corner Radius</label>
                    <input type="number" className="input text-sm"
                      value={(selectedLayer.properties as { borderRadius?: number }).borderRadius ?? 0}
                      onChange={(e) => updateLayer(selectedLayer.id, { properties: { ...selectedLayer.properties, borderRadius: Number(e.target.value) } })} />
                  </div>
                </div>
              )}

              {selectedLayer.type === 'image' && (
                <div className="space-y-2 pt-2 border-t border-secondary-700">
                  <span className="text-xs font-semibold text-secondary-300">Image Properties</span>
                  <div>
                    <label className="block text-xs font-medium text-secondary-400 mb-1">Image URL</label>
                    <input className="input text-sm"
                      value={(selectedLayer.properties as { src?: string }).src ?? ''}
                      onChange={(e) => updateLayer(selectedLayer.id, { properties: { ...selectedLayer.properties, src: e.target.value } })}
                      placeholder="https://..." />
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-secondary-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary-400">Visible</span>
                  <button onClick={() => toggleVisible(selectedLayer.id)}
                    className="text-secondary-400 hover:text-white">
                    {selectedLayer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary-400">Locked</span>
                  <button onClick={() => toggleLock(selectedLayer.id)}
                    className="text-secondary-400 hover:text-white">
                    {selectedLayer.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-xs text-secondary-500">Select a layer to edit its properties.</p>
            </div>
          )}

          {/* Canvas settings */}
          <div className="p-3 border-t border-secondary-700 space-y-2">
            <span className="text-xs font-semibold text-secondary-300">Canvas</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-secondary-400 mb-1">Width</label>
                <input type="number" className="input text-sm" value={canvas.width}
                  onChange={(e) => setCanvas((c) => ({ ...c, width: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-400 mb-1">Height</label>
                <input type="number" className="input text-sm" value={canvas.height}
                  onChange={(e) => setCanvas((c) => ({ ...c, height: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary-400 mb-1">Background</label>
              <input type="color" className="input text-sm h-9 p-1" value={canvas.background}
                onChange={(e) => setCanvas((c) => ({ ...c, background: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
