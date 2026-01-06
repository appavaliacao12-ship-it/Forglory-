
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Annotation, Tool } from '../types';

interface AnnotationCanvasProps {
  width: number;
  height: number;
  annotations: Annotation[];
  onAddAnnotation: (ann: Annotation) => void;
  onUpdateAnnotations?: (anns: Annotation[]) => void;
  tool: Tool;
  color: string;
  thickness: number;
  intensity: number;
  scale: number;
}

const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  width,
  height,
  annotations,
  onAddAnnotation,
  onUpdateAnnotations,
  tool,
  color,
  thickness,
  intensity,
  scale
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);

  const drawAll = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);
    
    annotations.forEach(ann => {
      if (ann.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = ann.width * scale;
      ctx.globalAlpha = ann.opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(ann.points[0].x * scale, ann.points[0].y * scale);
      for (let i = 1; i < ann.points.length; i++) {
        ctx.lineTo(ann.points[i].x * scale, ann.points[i].y * scale);
      }
      ctx.stroke();
    });

    if (isDrawing && currentPoints.length > 1 && tool !== 'eraser') {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness * scale;
      ctx.globalAlpha = tool === 'highlighter' ? (intensity / 100) : 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(currentPoints[0].x * scale, currentPoints[0].y * scale);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x * scale, currentPoints[i].y * scale);
      }
      ctx.stroke();
    }
  }, [annotations, isDrawing, currentPoints, color, thickness, intensity, tool, scale, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawAll(ctx);
  }, [drawAll]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'scroll' || tool === 'select') return;
    setIsDrawing(true);
    const pos = getPos(e);
    
    if (tool === 'eraser') {
      handleErase(pos);
    } else {
      setCurrentPoints([pos]);
    }
  };

  const handleErase = (pos: { x: number; y: number }) => {
    if (!onUpdateAnnotations) return;
    const threshold = 15;
    const newAnnotations = annotations.filter(ann => {
      return !ann.points.some(p => {
        const dx = p.x - pos.x;
        const dy = p.y - pos.y;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
      });
    });
    if (newAnnotations.length !== annotations.length) {
      onUpdateAnnotations(newAnnotations);
    }
  };

  const moveDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    if (tool === 'eraser') {
      handleErase(pos);
    } else {
      setCurrentPoints(prev => [...prev, pos]);
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length > 1 && tool !== 'eraser') {
      onAddAnnotation({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
        type: tool === 'highlighter' ? 'highlight' : 'draw',
        points: currentPoints,
        color: color,
        width: thickness,
        opacity: tool === 'highlighter' ? (intensity / 100) : 1
      });
    }
    setCurrentPoints([]);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={startDrawing}
      onMouseMove={moveDrawing}
      onMouseUp={endDrawing}
      onMouseLeave={endDrawing}
      onTouchStart={startDrawing}
      onTouchMove={moveDrawing}
      onTouchEnd={endDrawing}
      className={`absolute inset-0 z-20 ${tool === 'scroll' ? 'pointer-events-none' : tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
    />
  );
};

export default AnnotationCanvas;
