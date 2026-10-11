import { useEffect, useRef, useState, type MouseEvent } from "react";
import { colorHex } from "../constants";

interface CanvasProps {
  width: number;
  height: number;
  tiles: Map<number, number>;
  canPlace: boolean;
  onPlace: (x: number, y: number) => void;
  /** Palette index to preview under the cursor before the tile is placed. */
  previewColor: number;
  cellSize?: number;
}

/**
 * Renders the canvas on an HTML <canvas> and maps clicks to tile coordinates.
 * The CSS scales the element down on narrow screens; the click handler divides
 * by the rendered width so coordinates stay correct at any scale.
 *
 * Placement is deliberately one tile per click (one transaction): the hover
 * preview shows exactly which single tile the next click will paint.
 */
export default function Canvas({
  width,
  height,
  tiles,
  canPlace,
  onPlace,
  previewColor,
  cellSize = 16,
}: CanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  function cellAt(e: MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null {
    const canvas = ref.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * height);
    if (x >= 0 && x < width && y >= 0 && y < height) return { x, y };
    return null;
  }

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0b0e18";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize + 0.5, 0);
      ctx.lineTo(x * cellSize + 0.5, height * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize + 0.5);
      ctx.lineTo(width * cellSize, y * cellSize + 0.5);
      ctx.stroke();
    }

    for (const [index, color] of tiles) {
      const x = index % width;
      const y = Math.floor(index / width);
      ctx.fillStyle = colorHex(color);
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }

    // Preview the single tile the next click would place.
    if (canPlace && hover) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = colorHex(previewColor);
      ctx.fillRect(hover.x * cellSize, hover.y * cellSize, cellSize, cellSize);
      ctx.restore();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(hover.x * cellSize + 1, hover.y * cellSize + 1, cellSize - 2, cellSize - 2);
    }
  }, [tiles, width, height, cellSize, hover, canPlace, previewColor]);

  function handleMove(e: MouseEvent<HTMLCanvasElement>) {
    const next = canPlace ? cellAt(e) : null;
    setHover((prev) => {
      if (prev === next) return prev;
      if (!prev || !next) return next;
      return prev.x === next.x && prev.y === next.y ? prev : next;
    });
  }

  function handleClick(e: MouseEvent<HTMLCanvasElement>) {
    if (!canPlace) return;
    const cell = cellAt(e);
    if (cell) onPlace(cell.x, cell.y);
  }

  return (
    <canvas
      ref={ref}
      width={width * cellSize}
      height={height * cellSize}
      className={canPlace ? "canvas enabled" : "canvas"}
      onClick={handleClick}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
      role="img"
      aria-label={`Shared canvas, ${width} by ${height} tiles`}
    />
  );
}
