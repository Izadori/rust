import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { FolderOpen, Trash2, Download } from "lucide-react";
import "./App.css";

type Point = {
  x: number;
  y: number;
};

type BackendSeries = {
  label: string;
  points: Point[];
  visible: boolean;
};

type Series = BackendSeries & {
  id: string;
  color: string;
  source: string;
};

type AxisBounds = {
  xMin: string;
  xMax: string;
  yMin: string;
  yMax: string;
};

const COLORS = [
  "#2563eb",
  "#dc2626",
  "#059669",
  "#9333ea",
  "#d97706",
  "#0891b2",
  "#be123c",
  "#4f46e5",
  "#16a34a",
  "#ca8a04",
];

function fileName(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

function parseBound(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatTick(value: number) {
  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.01)) {
    return value.toExponential(2);
  }
  return Number(value.toPrecision(6)).toString();
}

function makeTicks(min: number, max: number, count = 6) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return [min];
  }
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}

function boundsEqual(a: AxisBounds, b: AxisBounds) {
  return a.xMin === b.xMin && a.xMax === b.xMax && a.yMin === b.yMin && a.yMax === b.yMax;
}

export type PlotCanvasHandle = {
  toDataURL: (type?: string, quality?: number) => string | undefined;
};

const PlotCanvas = memo(
  forwardRef<PlotCanvasHandle, { bounds: AxisBounds; series: Series[]; showTicks: boolean }>(
    function PlotCanvas({ bounds, series, showTicks }, ref) {
      const canvasRef = useRef<HTMLCanvasElement | null>(null);
      const frameRef = useRef<HTMLDivElement | null>(null);
      const [size, setSize] = useState({ width: 0, height: 0 });
      const [drawSummary, setDrawSummary] = useState("");

      useImperativeHandle(ref, () => ({
        toDataURL: (type, quality) => {
          return canvasRef.current?.toDataURL(type, quality);
        },
      }));

      useEffect(() => {
        const frame = frameRef.current;
        if (!frame) {
          return;
        }

        const resize = () => {
          const rect = frame.getBoundingClientRect();
          setSize({
            width: Math.max(0, Math.floor(rect.width)),
            height: Math.max(0, Math.floor(rect.height)),
          });
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(frame);
        return () => observer.disconnect();
      }, []);

      useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context || size.width <= 0 || size.height <= 0) {
          return;
        }

        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(size.width * ratio);
        canvas.height = Math.floor(size.height * ratio);
        canvas.style.width = `${size.width}px`;
        canvas.style.height = `${size.height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, size.width, size.height);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, size.width, size.height);

        if (series.length === 0) {
          return;
        }

        let autoXMin = Infinity;
        let autoXMax = -Infinity;
        let autoYMin = Infinity;
        let autoYMax = -Infinity;

        for (const item of series) {
          for (const point of item.points) {
            if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
              continue;
            }
            autoXMin = Math.min(autoXMin, point.x);
            autoXMax = Math.max(autoXMax, point.x);
            autoYMin = Math.min(autoYMin, point.y);
            autoYMax = Math.max(autoYMax, point.y);
          }
        }

        const xMin = parseBound(bounds.xMin) ?? autoXMin;
        const xMax = parseBound(bounds.xMax) ?? autoXMax;
        const yMin = parseBound(bounds.yMin) ?? autoYMin;
        const yMax = parseBound(bounds.yMax) ?? autoYMax;

        const xSpan = xMax === xMin ? 1 : xMax - xMin;
        const ySpan = yMax === yMin ? 1 : yMax - yMin;
        const margin = { top: 48, right: 28, bottom: 48, left: 72 };
        const plotWidth = Math.max(1, size.width - margin.left - margin.right);
        const plotHeight = Math.max(1, size.height - margin.top - margin.bottom);
        const toX = (x: number) => margin.left + ((x - xMin) / xSpan) * plotWidth;
        const toY = (y: number) => margin.top + plotHeight - ((y - yMin) / ySpan) * plotHeight;

        context.save();
        context.strokeStyle = "#dde3eb";
        context.fillStyle = "#344054";
        context.lineWidth = 1;
        context.font = "12px system-ui, sans-serif";
        context.textBaseline = "middle";

        // Draw Legend on Canvas
        let legendX = margin.left + 4;
        let legendY = 12 + 6;
        const swatchWidth = 18;
        const swatchHeight = 3;
        const legendGap = 14;
        const textGap = 6;

        for (const item of series) {
          const textMetrics = context.measureText(item.label);
          const itemWidth = swatchWidth + textGap + textMetrics.width;

          if (legendX + itemWidth > size.width - margin.right) {
            legendX = margin.left + 4;
            legendY += 16;
          }

          if (legendY > margin.top) break;

          context.fillStyle = item.color;
          context.beginPath();
          context.roundRect(legendX, legendY - swatchHeight / 2, swatchWidth, swatchHeight, 999);
          context.fill();

          context.fillStyle = "#344054";
          context.textAlign = "left";
          context.fillText(item.label, legendX + swatchWidth + textGap, legendY);

          legendX += itemWidth + legendGap;
        }

        context.strokeStyle = "#dde3eb";
        context.fillStyle = "#344054";
        context.textAlign = "center";

        for (const tick of makeTicks(xMin, xMax)) {
          const x = toX(tick);
          context.beginPath();
          context.moveTo(x, margin.top);
          context.lineTo(x, margin.top + plotHeight);
          context.stroke();
          if (showTicks) {
            context.fillText(formatTick(tick), x, margin.top + plotHeight + 18);
          }
        }

        for (const tick of makeTicks(yMin, yMax)) {
          const y = toY(tick);
          context.beginPath();
          context.moveTo(margin.left, y);
          context.lineTo(margin.left + plotWidth, y);
          context.stroke();
          if (showTicks) {
            context.textAlign = "right";
            context.fillText(formatTick(tick), margin.left - 10, y);
          }
        }

        context.strokeStyle = "#8b97a8";
        context.beginPath();
        context.moveTo(margin.left, margin.top);
        context.lineTo(margin.left, margin.top + plotHeight);
        context.lineTo(margin.left + plotWidth, margin.top + plotHeight);
        context.stroke();

        context.fillStyle = "#344054";
        context.textAlign = "center";
        context.fillText("X", margin.left + plotWidth / 2, size.height - 16);
        context.save();
        context.translate(18, margin.top + plotHeight / 2);
        context.rotate(-Math.PI / 2);
        context.fillText("Y", 0, 0);
        context.restore();

        context.save();
        context.beginPath();
        context.rect(margin.left, margin.top, plotWidth, plotHeight);
        context.clip();
        context.lineWidth = 2;
        context.lineJoin = "round";
        context.lineCap = "round";

        let drawnSeries = 0;
        let drawnPoints = 0;

        for (const item of series) {
          if (item.points.length === 0) {
            continue;
          }

          context.strokeStyle = item.color;
          context.beginPath();
          let started = false;

          for (let index = 0; index < item.points.length; index += 1) {
            const point = item.points[index];
            if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
              continue;
            }

            const x = toX(point.x);
            const y = toY(point.y);
            if (!started) {
              context.moveTo(x, y);
              started = true;
            } else {
              context.lineTo(x, y);
            }
            drawnPoints += 1;
          }

          if (started) {
            context.stroke();
            drawnSeries += 1;
          }
        }

        context.restore();
        setDrawSummary(`${drawnSeries} lines, ${drawnPoints} points`);
      }, [bounds, series, size, showTicks]);

      return (
        <div className="canvas-frame" ref={frameRef}>
          <canvas className="plot-canvas" ref={canvasRef} />
          {series.length > 0 && <div className="draw-summary">{drawSummary}</div>}
          {series.length === 0 && <div className="empty-state">No data loaded</div>}
        </div>
      );
    }
  ),
  (previous, next) => {
    if (previous.showTicks !== next.showTicks) {
      return false;
    }
    if (!boundsEqual(previous.bounds, next.bounds)) {
      return false;
    }
    if (previous.series.length !== next.series.length) {
      return false;
    }
    return previous.series.every((item, index) => {
      const nextItem = next.series[index];
      return (
        item.id === nextItem.id &&
        item.visible === nextItem.visible &&
        item.color === nextItem.color &&
        item.label === nextItem.label &&
        item.points === nextItem.points
      );
    });
  },
);

function App() {
  const [series, setSeries] = useState<Series[]>([]);
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);
  const loadedFilesRef = useRef<string[]>([]);
  const [bounds, setBounds] = useState<AxisBounds>({
    xMin: "",
    xMax: "",
    yMin: "",
    yMax: "",
  });
  const [showTicks, setShowTicks] = useState(true);
  const [status, setStatus] = useState("Ready. Open a tab-separated data file.");
  const plotCanvasRef = useRef<PlotCanvasHandle>(null);

  const loadFile = useCallback(async (path: string) => {
    if (loadedFilesRef.current.includes(path)) {
      setStatus(`${fileName(path)}: already loaded, skipping.`);
      return;
    }

    setStatus(`Loading ${fileName(path)}...`);
    try {
      const loaded = await invoke<BackendSeries[]>("read_data", { path });
      const source = fileName(path);

      if (loaded.length === 0) {
        setStatus(`${source}: no plottable columns found.`);
        return;
      }

      setSeries((current) => {
        const offset = current.length;
        const next = loaded.map((item, index) => ({
          ...item,
          id: `${path}:${index}:${Date.now()}`,
          label: item.label || `${source}_Y${index + 1}`,
          color: COLORS[(offset + index) % COLORS.length],
          source,
        }));
        setLabelDrafts((drafts) => ({
          ...drafts,
          ...Object.fromEntries(next.map((item) => [item.id, item.label])),
        }));
        return [...current, ...next];
      });
      const points = loaded.reduce((count, item) => count + item.points.length, 0);
      setLoadedFiles((current) => {
        loadedFilesRef.current = [...current, path];
        return [...current, path];
      });
      setStatus(`${source}: loaded ${loaded.length} series, ${points} points.`);
    } catch (error) {
      setStatus(`Error: ${String(error)}`);
    }
  }, []);

  const openFile = useCallback(async () => {
    setStatus("Opening file dialog...");
    try {
      const path: string | null = await invoke("open_file_dialog");
      if (path) {
        await loadFile(path);
      } else {
        setStatus("File selection cancelled.");
      }
    } catch (error) {
      console.error("Error opening file:", error);
      setStatus(`Error opening file: ${String(error)}`);
    }
  }, [loadFile]);

  const saveImage = useCallback(async () => {
    if (series.length === 0) return;
    
    setStatus("Opening save dialog...");
    try {
      const path = await invoke<string | null>("save_file_dialog");
      if (!path) {
        setStatus("Save cancelled.");
        return;
      }

      const type = path.toLowerCase().endsWith(".jpg") || path.toLowerCase().endsWith(".jpeg") 
        ? "image/jpeg" 
        : "image/png";
      
      const dataUrl = plotCanvasRef.current?.toDataURL(type, 0.9);
      if (!dataUrl) throw new Error("Failed to get image data from canvas");

      const response = await fetch(dataUrl);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      await invoke("save_file", { path, data: Array.from(uint8Array) });
      setStatus(`Saved graph to ${fileName(path)}`);
    } catch (error) {
      console.error("Error saving image:", error);
      setStatus(`Error saving image: ${String(error)}`);
    }
  }, [series.length]);

  useEffect(() => {
    invoke<string[]>("initial_files")
      .then((paths) => paths.forEach((path) => void loadFile(path)))
      .catch((error) => setStatus(String(error)));

    let unlisten: (() => void) | undefined;
    listen<string>("simplot-open-file", (event) => {
      void loadFile(event.payload);
    }).then((handler) => {
      unlisten = handler;
    });

    return () => {
      unlisten?.();
    };
  }, [loadFile]);

  const visibleSeries = useMemo(() => series.filter((item) => item.visible), [series]);
  const pointCount = useMemo(
    () => visibleSeries.reduce((count, item) => count + item.points.length, 0),
    [visibleSeries],
  );

  function updateSeries(id: string, patch: Partial<Series>) {
    setSeries((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateLabelDraft(id: string, label: string) {
    setLabelDrafts((current) => ({ ...current, [id]: label }));
    // Immediately reflect in series label to update Canvas
    updateSeries(id, { label });
  }

  function commitLabel(id: string) {
    const label = labelDrafts[id];
    if (label !== undefined) {
      updateSeries(id, { label });
    }
  }

  function updateBound(key: keyof AxisBounds, value: string) {
    setBounds((current) => ({ ...current, [key]: value }));
  }

  const clearData = useCallback(() => {
    setSeries([]);
    setLabelDrafts({});
    loadedFilesRef.current = [];
    setLoadedFiles([]);
    setBounds({ xMin: "", xMax: "", yMin: "", yMax: "" });
    setStatus("All data cleared.");
  }, []);

  useEffect(() => {
    if (series.length === 0) return;

    let autoXMin = Infinity;
    let autoXMax = -Infinity;
    let autoYMin = Infinity;
    let autoYMax = -Infinity;

    for (const item of series) {
      if (!item.visible) continue;
      for (const point of item.points) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        autoXMin = Math.min(autoXMin, point.x);
        autoXMax = Math.max(autoXMax, point.x);
        autoYMin = Math.min(autoYMin, point.y);
        autoYMax = Math.max(autoYMax, point.y);
      }
    }

    if (Number.isFinite(autoXMin) && Number.isFinite(autoXMax)) {
      setBounds((current) => ({
        ...current,
        xMin: String(autoXMin),
        xMax: String(autoXMax),
      }));
    }

    if (Number.isFinite(autoYMin) && Number.isFinite(autoYMax)) {
      setBounds((current) => ({
        ...current,
        yMin: String(autoYMin),
        yMax: String(autoYMax),
      }));
    }
  }, [series]);

  return (
    <main className="app-shell">
      <section className="plot-area" aria-label="X-Y plot">
        <header className="toolbar">
          <div>
            <h1>simplot</h1>
            <p>{status}</p>
          </div>
          <div className="button-group">
            <button className="open-button" type="button" onClick={openFile}>
              <FolderOpen size={18} aria-hidden="true" />
              Open
            </button>
            <button className="open-button" type="button" onClick={saveImage} disabled={series.length === 0}>
              <Download size={18} aria-hidden="true" />
              Save
            </button>
            {series.length > 0 && (
              <button className="clear-button" type="button" onClick={clearData}>
                <Trash2 size={18} aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        </header>

        <div className="chart-frame">
          <PlotCanvas ref={plotCanvasRef} bounds={bounds} series={visibleSeries} showTicks={showTicks} />
        </div>
      </section>

      <aside className="side-pane" aria-label="Plot controls">
        <section className="control-group">
          <h2>Scale</h2>
          <div className="axis-grid">
            <label>
              X min
              <input
                inputMode="decimal"
                value={bounds.xMin}
                onChange={(event) => updateBound("xMin", event.target.value)}
                placeholder="auto"
              />
            </label>
            <label>
              X max
              <input
                inputMode="decimal"
                value={bounds.xMax}
                onChange={(event) => updateBound("xMax", event.target.value)}
                placeholder="auto"
              />
            </label>
            <label>
              Y min
              <input
                inputMode="decimal"
                value={bounds.yMin}
                onChange={(event) => updateBound("yMin", event.target.value)}
                placeholder="auto"
              />
            </label>
            <label>
              Y max
              <input
                inputMode="decimal"
                value={bounds.yMax}
                onChange={(event) => updateBound("yMax", event.target.value)}
                placeholder="auto"
              />
            </label>
          </div>
        </section>

        <section className="control-group">
          <h2>View Options</h2>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={showTicks}
              onChange={(e) => setShowTicks(e.target.checked)}
            />
            Show axis numbers
          </label>
        </section>

        <section className="control-group series-group">
          <div className="series-heading">
            <h2>Series</h2>
            <span>{visibleSeries.length} visible</span>
          </div>
          <div className="series-list">
            {series.map((item) => (
              <label className="series-row" key={item.id}>
                <input
                  type="checkbox"
                  checked={item.visible}
                  onChange={(event) => updateSeries(item.id, { visible: event.target.checked })}
                />
                <span className="swatch" style={{ backgroundColor: item.color }} aria-hidden="true" />
                <input
                  className="series-name"
                  value={labelDrafts[item.id] ?? item.label}
                  onBlur={() => commitLabel(item.id)}
                  onChange={(event) => updateLabelDraft(item.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  title={item.source}
                />
              </label>
            ))}
            {series.length === 0 && <div className="empty-list">No series loaded</div>}
          </div>
        </section>

        <footer className="summary">
          <span>{series.length} series</span>
          <span>{pointCount} points visible</span>
        </footer>

        <section className="diagnostics" aria-label="Load diagnostics">
          <h2>Load Status</h2>
          <p>{status}</p>
          {loadedFiles.length > 0 && (
            <ul>
              {loadedFiles.map((path, index) => (
                <li key={`${path}:${index}`}>{path}</li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </main>
  );
}

export default App;
