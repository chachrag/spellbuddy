import React, { useEffect, useRef } from 'react';
import { GradedWordResult } from '../types';

interface AnnotatedImageProps {
  imageDataUrl: string;
  results: GradedWordResult[];
  totalScore: number;
}

export const AnnotatedImage: React.FC<AnnotatedImageProps> = ({
  imageDataUrl,
  results,
  totalScore,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original photo of the handwritten page
      ctx.drawImage(img, 0, 0);

      const scaleFactor = Math.max(img.width, img.height) / 900;
      const fontSize = Math.max(22, Math.round(28 * scaleFactor));

      // Draw score stamp at top-right corner
      const stampRadius = Math.max(55, Math.round(68 * scaleFactor));
      const stampX = img.width - stampRadius - 24;
      const stampY = stampRadius + 24;

      ctx.save();
      ctx.beginPath();
      ctx.arc(stampX, stampY, stampRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fill();
      ctx.lineWidth = Math.max(4, Math.round(5 * scaleFactor));
      ctx.strokeStyle = totalScore >= 8 ? '#16a34a' : '#ea580c';
      ctx.stroke();

      ctx.fillStyle = totalScore >= 8 ? '#15803d' : '#c2410c';
      ctx.font = `bold ${Math.round(fontSize * 1.35)}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${totalScore}/10`, stampX, stampY);
      ctx.restore();

      // Annotate each detected handwritten word with a checkmark or cross
      results.forEach((item) => {
        if (!item.box2d || item.box2d.length < 4) return;
        const [ymin, xmin, ymax, xmax] = item.box2d;

        const y1 = (ymin / 1000) * img.height;
        const x1 = (xmin / 1000) * img.width;
        const y2 = (ymax / 1000) * img.height;
        const x2 = (xmax / 1000) * img.width;

        const boxHeight = Math.max(24, y2 - y1);
        const centerY = y1 + boxHeight / 2;

        // Draw subtle highlight box around the handwritten word
        ctx.save();
        ctx.strokeStyle = item.isCorrect
          ? 'rgba(22, 163, 74, 0.75)'
          : 'rgba(220, 38, 38, 0.75)';
        ctx.lineWidth = Math.max(3, Math.round(3 * scaleFactor));
        ctx.strokeRect(x1 - 4, y1 - 4, x2 - x1 + 8, boxHeight + 8);

        // Draw badge next to the word (right side if room, otherwise left)
        const badgeX =
          x2 + 40 * scaleFactor < img.width - 20
            ? x2 + 24 * scaleFactor
            : Math.max(24, x1 - 24 * scaleFactor);

        const badgeRadius = Math.max(16, Math.round(20 * scaleFactor));
        ctx.beginPath();
        ctx.arc(badgeX, centerY, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = item.isCorrect ? '#16a34a' : '#dc2626';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.isCorrect ? '✓' : '✗', badgeX, centerY + 1);

        // If incorrect, write the correct spelling in red right next to the cross
        if (!item.isCorrect) {
          const labelText = `→ ${item.expectedWord}`;
          ctx.font = `bold ${Math.round(fontSize * 0.9)}px Fredoka, sans-serif`;
          const textWidth = ctx.measureText(labelText).width;
          const labelX = badgeX + badgeRadius + 8;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(
            labelX - 4,
            centerY - fontSize * 0.6,
            textWidth + 10,
            fontSize * 1.2
          );

          ctx.fillStyle = '#dc2626';
          ctx.textAlign = 'left';
          ctx.fillText(labelText, labelX, centerY);
        }

        ctx.restore();
      });
    };
    img.src = imageDataUrl;
  }, [imageDataUrl, results, totalScore]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border-4 border-sky-200 bg-slate-900 shadow-lg">
      <canvas
        ref={canvasRef}
        className="mx-auto max-h-[600px] w-auto max-w-full object-contain"
      />
    </div>
  );
};
