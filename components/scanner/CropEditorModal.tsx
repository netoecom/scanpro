/**
 * ScanPro — CropEditorModal
 * Editor visual interativo de altíssima precisão para ajuste fino dos 4 cantos e recorte de documento.
 * - Mapeamento 1:1 pixel a pixel com captura contínua de ponteiro (zero perda de cursor).
 * - Renderização gráfica em 60fps com máscara escura, quadrilátero real e grade de terços.
 * - Lupa de Precisão (Magnifier 2.5x) com retícula de mira nos vértices do documento.
 * - Suporte a arrastar cantos individuais, arestas completas ou reposicionar o corpo inteiro.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  Image,
  PanResponder,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CornerPoints, Point } from '../../types';
import { EdgeDetector } from '../../services/processing/edgeDetection';
import { colors, spacing, radii, typography, touchTarget } from '../../theme';

interface CropEditorModalProps {
  visible: boolean;
  imageUri: string | null;
  initialCorners?: CornerPoints | null;
  onApplyCrop: (corners: CornerPoints) => void;
  onCancel: () => void;
}

type DragTarget =
  | 'topLeft'
  | 'topRight'
  | 'bottomRight'
  | 'bottomLeft'
  | 'edgeTop'
  | 'edgeRight'
  | 'edgeBottom'
  | 'edgeLeft'
  | 'body'
  | null;

interface PixelCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export const CropEditorModal: React.FC<CropEditorModalProps> = ({
  visible,
  imageUri,
  initialCorners,
  onApplyCrop,
  onCancel,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Dimensões naturais da imagem original
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  // Cantos normalizados em porcentagem (0 a 100)
  const [cornersPercent, setCornersPercent] = useState<{
    topLeft: Point;
    topRight: Point;
    bottomRight: Point;
    bottomLeft: Point;
  }>({
    topLeft: { x: 5, y: 5 },
    topRight: { x: 95, y: 5 },
    bottomRight: { x: 95, y: 95 },
    bottomLeft: { x: 5, y: 95 },
  });

  // Estado transitório de arraste mantido em ref para ultra performance (60fps)
  const activeDragRef = useRef<{
    target: DragTarget;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    initialCorners: PixelCorners;
  }>({
    target: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    initialCorners: {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 0, y: 0 },
      bottomRight: { x: 0, y: 0 },
      bottomLeft: { x: 0, y: 0 },
    },
  });

  // Referência para o container da imagem e canvas overlay
  const containerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const htmlImageRef = useRef<HTMLImageElement | null>(null);

  // Dimensões úteis do visor mantendo aspecto da imagem
  const editorAvailableHeight = Math.max(300, windowHeight - 210);
  const editorAvailableWidth = Math.max(280, windowWidth - 32);

  let displayW = editorAvailableWidth;
  let displayH = editorAvailableHeight;

  if (imageSize && imageSize.width > 0 && imageSize.height > 0) {
    const aspect = imageSize.width / imageSize.height;
    if (displayW / displayH > aspect) {
      displayW = Math.round(displayH * aspect);
    } else {
      displayH = Math.round(displayW / aspect);
    }
  }

  // Converte cantos em porcentagem para coordenadas em pixels da tela
  const getPixelCorners = useCallback(
    (cp: typeof cornersPercent, w: number, h: number): PixelCorners => {
      return {
        topLeft: { x: (cp.topLeft.x / 100) * w, y: (cp.topLeft.y / 100) * h },
        topRight: { x: (cp.topRight.x / 100) * w, y: (cp.topRight.y / 100) * h },
        bottomRight: { x: (cp.bottomRight.x / 100) * w, y: (cp.bottomRight.y / 100) * h },
        bottomLeft: { x: (cp.bottomLeft.x / 100) * w, y: (cp.bottomLeft.y / 100) * h },
      };
    },
    []
  );

  // Carrega imagem no DOM para renderização de alta resolução na lupa
  useEffect(() => {
    if (Platform.OS === 'web' && imageUri) {
      const img = new (window as any).Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUri;
      img.onload = () => {
        htmlImageRef.current = img;
        drawCanvasOverlay();
      };
    }
  }, [imageUri]);

  // Carrega dimensões naturais da foto
  useEffect(() => {
    if (!visible || !imageUri) return;

    Image.getSize(
      imageUri,
      (w, h) => {
        setImageSize({ width: w, height: h });
        if (initialCorners) {
          setCornersPercent({
            topLeft: { x: (initialCorners.topLeft.x / w) * 100, y: (initialCorners.topLeft.y / h) * 100 },
            topRight: { x: (initialCorners.topRight.x / w) * 100, y: (initialCorners.topRight.y / h) * 100 },
            bottomRight: { x: (initialCorners.bottomRight.x / w) * 100, y: (initialCorners.bottomRight.y / h) * 100 },
            bottomLeft: { x: (initialCorners.bottomLeft.x / w) * 100, y: (initialCorners.bottomLeft.y / h) * 100 },
          });
        } else {
          const def = EdgeDetector.createDefaultCorners(w, h);
          setCornersPercent({
            topLeft: { x: (def.topLeft.x / w) * 100, y: (def.topLeft.y / h) * 100 },
            topRight: { x: (def.topRight.x / w) * 100, y: (def.topRight.y / h) * 100 },
            bottomRight: { x: (def.bottomRight.x / w) * 100, y: (def.bottomRight.y / h) * 100 },
            bottomLeft: { x: (def.bottomLeft.x / w) * 100, y: (def.bottomLeft.y / h) * 100 },
          });
        }
      },
      () => {
        setImageSize({ width: 1200, height: 1600 });
      }
    );
  }, [visible, imageUri, initialCorners]);

  // Função central de renderização do Canvas Overlay com Lupa e Máscara
  const drawCanvasOverlay = useCallback(
    (customPixelCorners?: PixelCorners, activeTarget?: DragTarget) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = displayW * dpr;
      canvas.height = displayH * dpr;
      ctx.scale(dpr, dpr);

      const corners = customPixelCorners || getPixelCorners(cornersPercent, displayW, displayH);
      const tl = corners.topLeft;
      const tr = corners.topRight;
      const br = corners.bottomRight;
      const bl = corners.bottomLeft;

      // 1. Limpa canvas
      ctx.clearRect(0, 0, displayW, displayH);

      // 2. Máscara Escura: escurece tudo fora do quadrilátero
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
      ctx.fillRect(0, 0, displayW, displayH);

      // Apaga o interior do quadrilátero selecionado para destacar o documento
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 3. Grade de Terços interna sutil (Rule of Thirds)
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      for (let i = 1; i <= 2; i++) {
        const t = i / 3;
        // Linhas horizontais
        const hStart = { x: tl.x + (bl.x - tl.x) * t, y: tl.y + (bl.y - tl.y) * t };
        const hEnd = { x: tr.x + (br.x - tr.x) * t, y: tr.y + (br.y - tr.y) * t };
        ctx.beginPath();
        ctx.moveTo(hStart.x, hStart.y);
        ctx.lineTo(hEnd.x, hEnd.y);
        ctx.stroke();

        // Linhas verticais
        const vStart = { x: tl.x + (tr.x - tl.x) * t, y: tl.y + (tr.y - tl.y) * t };
        const vEnd = { x: bl.x + (br.x - bl.x) * t, y: bl.y + (br.y - bl.y) * t };
        ctx.beginPath();
        ctx.moveTo(vStart.x, vStart.y);
        ctx.lineTo(vEnd.x, vEnd.y);
        ctx.stroke();
      }
      ctx.restore();

      // 4. Contorno Principal do Quadrilátero
      ctx.save();
      ctx.strokeStyle = '#0066CC';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0, 102, 204, 0.5)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // 5. Alças das 4 Arestas (Pontos Médios)
      const edges = [
        { key: 'edgeTop', p1: tl, p2: tr },
        { key: 'edgeRight', p1: tr, p2: br },
        { key: 'edgeBottom', p1: bl, p2: br },
        { key: 'edgeLeft', p1: tl, p2: bl },
      ];

      edges.forEach(({ key, p1, p2 }) => {
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const isEdgeActive = activeTarget === key;

        ctx.save();
        ctx.fillStyle = isEdgeActive ? '#0066CC' : '#FFFFFF';
        ctx.strokeStyle = '#0066CC';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(midX, midY, isEdgeActive ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // 6. Alças dos 4 Cantos (Handles Circulares)
      const cornerList: { key: DragTarget; p: Point }[] = [
        { key: 'topLeft', p: tl },
        { key: 'topRight', p: tr },
        { key: 'bottomRight', p: br },
        { key: 'bottomLeft', p: bl },
      ];

      cornerList.forEach(({ key, p }) => {
        const isActive = activeTarget === key;

        ctx.save();
        // Glow / Halo quando ativo
        if (isActive) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 102, 204, 0.35)';
          ctx.fill();
        }

        // Círculo base externo
        ctx.beginPath();
        ctx.arc(p.x, p.y, isActive ? 15 : 13, 0, Math.PI * 2);
        ctx.fillStyle = '#0066CC';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 5;
        ctx.stroke();

        // Ponto central brilhante
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.restore();
      });

      // 7. Lupa de Precisão Cirúrgica (Magnifier / Loupe 2.5x)
      if (
        activeTarget &&
        ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].includes(activeTarget) &&
        htmlImageRef.current
      ) {
        const activePoint = corners[activeTarget as keyof PixelCorners];
        const loupeRadius = 52;
        const zoom = 2.5;

        // Posicionamento inteligente da lupa: 75px acima do ponto
        let loupeX = activePoint.x;
        let loupeY = activePoint.y - 80;

        // Se estiver muito próximo do topo, inverte para baixo
        if (loupeY - loupeRadius < 10) {
          loupeY = activePoint.y + 80;
        }
        // Limita dentro das laterais do canvas
        loupeX = Math.max(loupeRadius + 10, Math.min(displayW - loupeRadius - 10, loupeX));

        const img = htmlImageRef.current;
        const origW = img.naturalWidth || imageSize?.width || 1200;
        const origH = img.naturalHeight || imageSize?.height || 1600;

        // Converte ponto da tela para coordenadas da imagem original
        const origX = (activePoint.x / displayW) * origW;
        const origY = (activePoint.y / displayH) * origH;

        ctx.save();
        // Sombra da Lupa
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;

        // Máscara circular da lupa
        ctx.beginPath();
        ctx.arc(loupeX, loupeY, loupeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#0F172A';
        ctx.fill();
        ctx.clip();

        // Desenha imagem original ampliada em 2.5x
        const sampleSize = (loupeRadius * 2) / zoom;
        const sampleOrigW = (sampleSize / displayW) * origW;
        const sampleOrigH = (sampleSize / displayH) * origH;

        ctx.drawImage(
          img,
          origX - sampleOrigW / 2,
          origY - sampleOrigH / 2,
          sampleOrigW,
          sampleOrigH,
          loupeX - loupeRadius,
          loupeY - loupeRadius,
          loupeRadius * 2,
          loupeRadius * 2
        );

        // Mira central (*Crosshair*)
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 2;

        // Linha horizontal
        ctx.beginPath();
        ctx.moveTo(loupeX - loupeRadius, loupeY);
        ctx.lineTo(loupeX + loupeRadius, loupeY);
        ctx.stroke();

        // Linha vertical
        ctx.beginPath();
        ctx.moveTo(loupeX, loupeY - loupeRadius);
        ctx.lineTo(loupeX, loupeY + loupeRadius);
        ctx.stroke();

        // Círculo central da mira
        ctx.beginPath();
        ctx.arc(loupeX, loupeY, 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();

        // Anel externo branco da Lupa
        ctx.save();
        ctx.beginPath();
        ctx.arc(loupeX, loupeY, loupeRadius, 0, Math.PI * 2);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        // Badge indicador de precisão
        ctx.fillStyle = '#0066CC';
        ctx.beginPath();
        ctx.roundRect(loupeX - 30, loupeY + loupeRadius + 6, 60, 18, 9);
        ctx.fill();

        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('2.5x ZOOM', loupeX, loupeY + loupeRadius + 19);
        ctx.restore();
      }
    },
    [displayW, displayH, cornersPercent, getPixelCorners, imageSize]
  );

  // Redesenha sempre que os cantos em porcentagem mudarem ou a tela redimensionar
  useEffect(() => {
    drawCanvasOverlay();
  }, [drawCanvasOverlay]);

  // Função para identificar o elemento clicado com base nas coordenadas em pixels da tela
  const getHitTarget = (x: number, y: number, corners: PixelCorners): DragTarget => {
    const handleHitRadius = 36;

    if (Math.hypot(x - corners.topLeft.x, y - corners.topLeft.y) <= handleHitRadius) return 'topLeft';
    if (Math.hypot(x - corners.topRight.x, y - corners.topRight.y) <= handleHitRadius) return 'topRight';
    if (Math.hypot(x - corners.bottomRight.x, y - corners.bottomRight.y) <= handleHitRadius) return 'bottomRight';
    if (Math.hypot(x - corners.bottomLeft.x, y - corners.bottomLeft.y) <= handleHitRadius) return 'bottomLeft';

    // Arestas
    const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
      const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    };

    const edgeHitRadius = 22;
    if (distToSegment(x, y, corners.topLeft.x, corners.topLeft.y, corners.topRight.x, corners.topRight.y) <= edgeHitRadius)
      return 'edgeTop';
    if (
      distToSegment(x, y, corners.topRight.x, corners.topRight.y, corners.bottomRight.x, corners.bottomRight.y) <=
      edgeHitRadius
    )
      return 'edgeRight';
    if (
      distToSegment(x, y, corners.bottomLeft.x, corners.bottomLeft.y, corners.bottomRight.x, corners.bottomRight.y) <=
      edgeHitRadius
    )
      return 'edgeBottom';
    if (
      distToSegment(x, y, corners.topLeft.x, corners.topLeft.y, corners.bottomLeft.x, corners.bottomLeft.y) <=
      edgeHitRadius
    )
      return 'edgeLeft';

    // Dentro do polígono (para mover todo o corpo)
    const isInsidePolygon = (px: number, py: number, pts: Point[]) => {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i].x,
          yi = pts[i].y;
        const xj = pts[j].x,
          yj = pts[j].y;
        const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };

    if (isInsidePolygon(x, y, [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft])) {
      return 'body';
    }

    // Se clicou fora, busca o canto mais próximo e já o ativa
    const distances = [
      { key: 'topLeft' as DragTarget, d: Math.hypot(x - corners.topLeft.x, y - corners.topLeft.y) },
      { key: 'topRight' as DragTarget, d: Math.hypot(x - corners.topRight.x, y - corners.topRight.y) },
      { key: 'bottomRight' as DragTarget, d: Math.hypot(x - corners.bottomRight.x, y - corners.bottomRight.y) },
      { key: 'bottomLeft' as DragTarget, d: Math.hypot(x - corners.bottomLeft.x, y - corners.bottomLeft.y) },
    ];
    distances.sort((a, b) => a.d - b.d);
    return distances[0].key;
  };

  // Handlers de Ponteiro Nativos Web com captura contínua e precisão 1:1
  const handlePointerDown = (e: any) => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(displayW, e.clientX - rect.left));
    const clickY = Math.max(0, Math.min(displayH, e.clientY - rect.top));

    const currentPixelCorners = getPixelCorners(cornersPercent, displayW, displayH);
    const target = getHitTarget(clickX, clickY, currentPixelCorners);

    if (!target) return;

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // safe fallback
    }

    activeDragRef.current = {
      target,
      startX: clickX,
      startY: clickY,
      lastX: clickX,
      lastY: clickY,
      initialCorners: { ...currentPixelCorners },
    };

    // Se for canto individual, mapeia imediatamente 1:1 para onde foi clicado
    if (['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].includes(target)) {
      const updated = {
        ...currentPixelCorners,
        [target]: { x: clickX, y: clickY },
      };
      drawCanvasOverlay(updated, target);
    } else {
      drawCanvasOverlay(currentPixelCorners, target);
    }
  };

  const handlePointerMove = (e: any) => {
    if (Platform.OS !== 'web' || !containerRef.current) return;
    const { target, startX, startY, initialCorners } = activeDragRef.current;

    const rect = containerRef.current.getBoundingClientRect();
    const currX = Math.max(0, Math.min(displayW, e.clientX - rect.left));
    const currY = Math.max(0, Math.min(displayH, e.clientY - rect.top));

    // Se não estiver arrastando, atualiza o cursor CSS correspondente
    if (!target) {
      const currentPixelCorners = getPixelCorners(cornersPercent, displayW, displayH);
      const hoverTarget = getHitTarget(currX, currY, currentPixelCorners);
      if (['topLeft', 'bottomRight'].includes(hoverTarget as string)) {
        containerRef.current.style.cursor = 'nwse-resize';
      } else if (['topRight', 'bottomLeft'].includes(hoverTarget as string)) {
        containerRef.current.style.cursor = 'nesw-resize';
      } else if (['edgeTop', 'edgeBottom'].includes(hoverTarget as string)) {
        containerRef.current.style.cursor = 'ns-resize';
      } else if (['edgeRight', 'edgeLeft'].includes(hoverTarget as string)) {
        containerRef.current.style.cursor = 'ew-resize';
      } else if (hoverTarget === 'body') {
        containerRef.current.style.cursor = 'move';
      } else {
        containerRef.current.style.cursor = 'crosshair';
      }
      return;
    }

    const deltaX = currX - startX;
    const deltaY = currY - startY;

    let updated: PixelCorners = { ...initialCorners };

    if (['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].includes(target)) {
      // Mapeamento 1:1 Pixel a Pixel direto
      updated[target as keyof PixelCorners] = { x: currX, y: currY };
    } else if (target === 'edgeTop') {
      const clampedY = Math.max(0, Math.min(displayH, initialCorners.topLeft.y + deltaY));
      updated.topLeft = { ...initialCorners.topLeft, y: clampedY };
      updated.topRight = { ...initialCorners.topRight, y: clampedY };
    } else if (target === 'edgeBottom') {
      const clampedY = Math.max(0, Math.min(displayH, initialCorners.bottomLeft.y + deltaY));
      updated.bottomLeft = { ...initialCorners.bottomLeft, y: clampedY };
      updated.bottomRight = { ...initialCorners.bottomRight, y: clampedY };
    } else if (target === 'edgeLeft') {
      const clampedX = Math.max(0, Math.min(displayW, initialCorners.topLeft.x + deltaX));
      updated.topLeft = { ...initialCorners.topLeft, x: clampedX };
      updated.bottomLeft = { ...initialCorners.bottomLeft, x: clampedX };
    } else if (target === 'edgeRight') {
      const clampedX = Math.max(0, Math.min(displayW, initialCorners.topRight.x + deltaX));
      updated.topRight = { ...initialCorners.topRight, x: clampedX };
      updated.bottomRight = { ...initialCorners.bottomRight, x: clampedX };
    } else if (target === 'body') {
      const minX = Math.min(initialCorners.topLeft.x, initialCorners.bottomLeft.x);
      const maxX = Math.max(initialCorners.topRight.x, initialCorners.bottomRight.x);
      const minY = Math.min(initialCorners.topLeft.y, initialCorners.topRight.y);
      const maxY = Math.max(initialCorners.bottomLeft.y, initialCorners.bottomRight.y);

      const boundDeltaX = Math.max(-minX, Math.min(displayW - maxX, deltaX));
      const boundDeltaY = Math.max(-minY, Math.min(displayH - maxY, deltaY));

      updated = {
        topLeft: { x: initialCorners.topLeft.x + boundDeltaX, y: initialCorners.topLeft.y + boundDeltaY },
        topRight: { x: initialCorners.topRight.x + boundDeltaX, y: initialCorners.topRight.y + boundDeltaY },
        bottomRight: { x: initialCorners.bottomRight.x + boundDeltaX, y: initialCorners.bottomRight.y + boundDeltaY },
        bottomLeft: { x: initialCorners.bottomLeft.x + boundDeltaX, y: initialCorners.bottomLeft.y + boundDeltaY },
      };
    }

    // Redesenha instantaneamente a 60fps no canvas
    drawCanvasOverlay(updated, target);

    // Salva o estado atualizado em ref
    activeDragRef.current.lastX = currX;
    activeDragRef.current.lastY = currY;
    (activeDragRef.current as any).currentWorkingCorners = updated;
  };

  const handlePointerUp = (e: any) => {
    if (Platform.OS !== 'web') return;
    const { target } = activeDragRef.current;
    if (!target) return;

    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // safe fallback
    }

    const working = (activeDragRef.current as any).currentWorkingCorners;
    if (working) {
      setCornersPercent({
        topLeft: { x: (working.topLeft.x / displayW) * 100, y: (working.topLeft.y / displayH) * 100 },
        topRight: { x: (working.topRight.x / displayW) * 100, y: (working.topRight.y / displayH) * 100 },
        bottomRight: { x: (working.bottomRight.x / displayW) * 100, y: (working.bottomRight.y / displayH) * 100 },
        bottomLeft: { x: (working.bottomLeft.x / displayW) * 100, y: (working.bottomLeft.y / displayH) * 100 },
      });
    }

    activeDragRef.current.target = null;
    drawCanvasOverlay(working || undefined, null);
  };

  // PanResponder Unificado para Plataformas Nativas (Mobile iOS/Android)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touch = evt.nativeEvent;
        const currentPixelCorners = getPixelCorners(cornersPercent, displayW, displayH);
        const target = getHitTarget(touch.locationX, touch.locationY, currentPixelCorners);

        activeDragRef.current = {
          target,
          startX: touch.locationX,
          startY: touch.locationY,
          lastX: touch.locationX,
          lastY: touch.locationY,
          initialCorners: { ...currentPixelCorners },
        };
      },
      onPanResponderMove: (evt, gestureState) => {
        const { target, initialCorners } = activeDragRef.current;
        if (!target) return;

        const currX = Math.max(0, Math.min(displayW, activeDragRef.current.startX + gestureState.dx));
        const currY = Math.max(0, Math.min(displayH, activeDragRef.current.startY + gestureState.dy));

        let updated: PixelCorners = { ...initialCorners };

        if (['topLeft', 'topRight', 'bottomRight', 'bottomLeft'].includes(target)) {
          updated[target as keyof PixelCorners] = { x: currX, y: currY };
        }

        setCornersPercent({
          topLeft: { x: (updated.topLeft.x / displayW) * 100, y: (updated.topLeft.y / displayH) * 100 },
          topRight: { x: (updated.topRight.x / displayW) * 100, y: (updated.topRight.y / displayH) * 100 },
          bottomRight: { x: (updated.bottomRight.x / displayW) * 100, y: (updated.bottomRight.y / displayH) * 100 },
          bottomLeft: { x: (updated.bottomLeft.x / displayW) * 100, y: (updated.bottomLeft.y / displayH) * 100 },
        });
      },
      onPanResponderRelease: () => {
        activeDragRef.current.target = null;
      },
    })
  ).current;

  // Ações Rápidas da Barra de Ferramentas
  const handleAutoDetect = async () => {
    if (!imageUri || !imageSize) return;
    setIsDetecting(true);
    try {
      const detection = await EdgeDetector.detectDocumentCorners(imageUri);
      if (detection.corners) {
        const c = detection.corners;
        setCornersPercent({
          topLeft: { x: (c.topLeft.x / imageSize.width) * 100, y: (c.topLeft.y / imageSize.height) * 100 },
          topRight: { x: (c.topRight.x / imageSize.width) * 100, y: (c.topRight.y / imageSize.height) * 100 },
          bottomRight: { x: (c.bottomRight.x / imageSize.width) * 100, y: (c.bottomRight.y / imageSize.height) * 100 },
          bottomLeft: { x: (c.bottomLeft.x / imageSize.width) * 100, y: (c.bottomLeft.y / imageSize.height) * 100 },
        });
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSetA4 = () => {
    if (!imageSize) return;
    const def = EdgeDetector.createDefaultCorners(imageSize.width, imageSize.height);
    setCornersPercent({
      topLeft: { x: (def.topLeft.x / imageSize.width) * 100, y: (def.topLeft.y / imageSize.height) * 100 },
      topRight: { x: (def.topRight.x / imageSize.width) * 100, y: (def.topRight.y / imageSize.height) * 100 },
      bottomRight: { x: (def.bottomRight.x / imageSize.width) * 100, y: (def.bottomRight.y / imageSize.height) * 100 },
      bottomLeft: { x: (def.bottomLeft.x / imageSize.width) * 100, y: (def.bottomLeft.y / imageSize.height) * 100 },
    });
  };

  const handleSetFull = () => {
    setCornersPercent({
      topLeft: { x: 0, y: 0 },
      topRight: { x: 100, y: 0 },
      bottomRight: { x: 100, y: 100 },
      bottomLeft: { x: 0, y: 100 },
    });
  };

  const handleReset = () => {
    if (initialCorners && imageSize) {
      setCornersPercent({
        topLeft: { x: (initialCorners.topLeft.x / imageSize.width) * 100, y: (initialCorners.topLeft.y / imageSize.height) * 100 },
        topRight: { x: (initialCorners.topRight.x / imageSize.width) * 100, y: (initialCorners.topRight.y / imageSize.height) * 100 },
        bottomRight: { x: (initialCorners.bottomRight.x / imageSize.width) * 100, y: (initialCorners.bottomRight.y / imageSize.height) * 100 },
        bottomLeft: { x: (initialCorners.bottomLeft.x / imageSize.width) * 100, y: (initialCorners.bottomLeft.y / imageSize.height) * 100 },
      });
    } else {
      handleSetA4();
    }
  };

  // Aplica o recorte convertendo as coordenadas finais para pixels reais da imagem original
  const handleConfirm = () => {
    if (!imageSize) return;
    const origW = imageSize.width;
    const origH = imageSize.height;

    const corners: CornerPoints = {
      topLeft: {
        x: Math.round((Math.max(0, Math.min(100, cornersPercent.topLeft.x)) / 100) * origW),
        y: Math.round((Math.max(0, Math.min(100, cornersPercent.topLeft.y)) / 100) * origH),
      },
      topRight: {
        x: Math.round((Math.max(0, Math.min(100, cornersPercent.topRight.x)) / 100) * origW),
        y: Math.round((Math.max(0, Math.min(100, cornersPercent.topRight.y)) / 100) * origH),
      },
      bottomRight: {
        x: Math.round((Math.max(0, Math.min(100, cornersPercent.bottomRight.x)) / 100) * origW),
        y: Math.round((Math.max(0, Math.min(100, cornersPercent.bottomRight.y)) / 100) * origH),
      },
      bottomLeft: {
        x: Math.round((Math.max(0, Math.min(100, cornersPercent.bottomLeft.x)) / 100) * origW),
        y: Math.round((Math.max(0, Math.min(100, cornersPercent.bottomLeft.y)) / 100) * origH),
      },
    };

    onApplyCrop(corners);
  };

  if (!visible || !imageUri) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        {/* Header Elegante */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Ajustar Recorte</Text>
            <Text style={styles.subtitle}>Arraste os cantos com precisão pixel a pixel</Text>
          </View>
          <TouchableOpacity style={styles.confirmSmallBtn} onPress={handleConfirm}>
            <Text style={styles.confirmSmallText}>Pronto</Text>
          </TouchableOpacity>
        </View>

        {/* Barra de Ações Rápidas */}
        <View style={styles.presetsRow}>
          <TouchableOpacity style={styles.presetChip} onPress={handleAutoDetect} disabled={isDetecting}>
            {isDetecting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="sparkles" size={14} color={colors.primary} />
            )}
            <Text style={styles.presetChipText}>Auto Detectar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.presetChip} onPress={handleSetA4}>
            <Ionicons name="document-text-outline" size={14} color="#94A3B8" />
            <Text style={styles.presetChipText}>A4 Padrão</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.presetChip} onPress={handleSetFull}>
            <Ionicons name="expand-outline" size={14} color="#94A3B8" />
            <Text style={styles.presetChipText}>Foto Inteira</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.presetChip} onPress={handleReset}>
            <Ionicons name="refresh-outline" size={14} color="#94A3B8" />
            <Text style={styles.presetChipText}>Resetar</Text>
          </TouchableOpacity>
        </View>

        {/* Área Central Interativa de Recorte com Canvas Overlay */}
        <View style={styles.editorArea}>
          <View
            ref={containerRef}
            {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={[
              styles.canvasWrapper,
              {
                width: displayW,
                height: displayH,
                touchAction: 'none',
                userSelect: 'none',
              } as any,
            ]}
          >
            {/* Foto base capturada */}
            <Image
              source={{ uri: imageUri }}
              style={[styles.image, { width: displayW, height: displayH }]}
              resizeMode="contain"
            />

            {/* Canvas Overlay de 60fps para Máscara, Quadrilátero, Alças e Lupa */}
            {Platform.OS === 'web' && (
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: displayW,
                  height: displayH,
                  pointerEvents: 'none',
                }}
              />
            )}
          </View>
        </View>

        {/* Rodapé de Confirmação */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelFooterBtn} onPress={onCancel}>
            <Text style={styles.cancelFooterText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.confirmFooterBtn} onPress={handleConfirm}>
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.confirmFooterText}>Aplicar Recorte</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.default,
    paddingVertical: spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelBtn: {
    width: touchTarget.minSize,
    height: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
  },
  title: {
    ...typography.subheadline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: '#94A3B8',
    marginTop: 2,
  },
  confirmSmallBtn: {
    paddingHorizontal: spacing.compact,
    paddingVertical: 6,
    borderRadius: radii.capsule,
    backgroundColor: colors.primary,
  },
  confirmSmallText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.small,
    paddingVertical: spacing.compact,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.compact,
    paddingVertical: 6,
    borderRadius: radii.capsule,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  presetChipText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editorArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.default,
  },
  canvasWrapper: {
    position: 'relative',
    backgroundColor: '#000000',
    borderRadius: radii.standard,
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.default,
    paddingHorizontal: spacing.default,
    paddingVertical: spacing.default,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#0F172A',
  },
  cancelFooterBtn: {
    flex: 1,
    height: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.standard,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelFooterText: {
    ...typography.subheadline,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  confirmFooterBtn: {
    flex: 1.5,
    flexDirection: 'row',
    height: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.small,
    borderRadius: radii.standard,
    backgroundColor: colors.primary,
  },
  confirmFooterText: {
    ...typography.subheadline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

