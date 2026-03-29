// High-Resolution SVG Pixel Art Human - No images, 100% transparent

interface PixelHumanProps {
  skinColor?: string;
  hairColor?: string;
  shirtColor?: string;
  pantsColor?: string;
  shoeColor?: string;
  scale?: number;
  isTyping?: boolean;
  isSitting?: boolean;
  isFacingAway?: boolean;
  frame?: number;
  hairStyle?: 'short' | 'long' | 'spiky' | 'bob';
}

export function PixelHuman({
  skinColor = '#F5C5A3',
  hairColor = '#3D2B1F',
  shirtColor = '#6366F1',
  pantsColor = '#1E293B',
  shoeColor = '#0F172A',
  scale = 4,
  isTyping = false,
  isSitting = false,
  isFacingAway = false,
  frame = 0,
  hairStyle = 'short',
}: PixelHumanProps) {
  const S = skinColor;
  const H = hairColor;
  const T = shirtColor;
  const P = pantsColor;
  const X = shoeColor;
  const C = '#1e293b'; 
  const _ = null;

  const renderPixel = (x: number, y: number, color: string | null) => {
    if (!color) return null;
    return <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} />;
  };

  const getHair = (style: string): (string | null)[][] => {
    switch(style) {
      case 'long': return [
          [_, _, _, _, H, H, H, _, _, _, _, _],
          [_, _, _, H, H, H, H, H, _, _, _, _],
          [_, _, H, H, H, H, H, H, H, _, _, _],
          [_, _, H, H, H, H, H, H, H, _, _, _],
          [_, _, H, H, H, H, H, H, H, _, _, _],
        ];
      case 'spiky': return [
          [_, _, _, H, _, H, _, H, _, _, _, _],
          [_, _, _, H, H, H, H, H, _, _, _, _],
          [_, _, _, H, H, H, H, H, _, _, _, _],
          [_, _, _, H, H, H, H, H, _, _, _, _],
        ];
      case 'bob': return [
          [_, _, _, _, H, H, H, _, _, _, _, _],
          [_, _, _, H, H, H, H, H, _, _, _, _],
          [_, _, H, H, H, H, H, H, H, _, _, _],
          [_, _, H, H, H, H, H, H, H, _, _, _],
          [_, _, H, H, H, H, H, H, H, _, _, _],
        ];
      default: return [ 
          [_, _, _, _, _, H, _, _, _, _, _, _],
          [_, _, _, _, H, H, H, _, _, _, _, _],
          [_, _, _, H, H, H, H, H, _, _, _, _],
          [_, _, _, H, H, H, H, H, _, _, _, _],
        ];
    }
  };

  const hair = getHair(hairStyle);
  const typingFrame = frame % 2 === 0;
  const canvasHeight = isSitting ? 15 : 18;

  return (
    <svg 
      width={12 * scale} 
      height={canvasHeight * scale} 
      viewBox={`0 0 12 ${canvasHeight}`}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {/* 0. Chair/Base */}
      {(isSitting || isFacingAway) && [12, 13, 14].map(y => {
        let row: (string | null)[] = Array(12).fill(_);
        if (y === 12) { row[3]=C; row[4]=C; row[5]=C; row[6]=C; row[7]=C; row[8]=C; } 
        else { row[3]=C; row[8]=C; } 
        return row.map((c, x) => renderPixel(x, y, c));
      })}

      {/* 1. Face / Back of Head & Neck (Smaller Grid: 4-5 wide instead of 7) */}
      {[2, 3, 4, 5, 6].map(y => {
        let row: (string | null)[] = Array(12).fill(_);
        const yOffset = isSitting ? -1 : 0;
        const typingShrug = (isTyping && typingFrame && y < 7) ? -0.5 : 0;
        if (y < 6) {
          if (isFacingAway) {
            row[4] = H; row[5] = H; row[6] = H; row[7] = H;
          } else {
            row[4] = S; row[5] = S; row[6] = S; row[7] = S;
            if (y === 3) { row[4] = '#000'; row[7] = '#000'; } 
          }
        } else {
          row[5] = isFacingAway ? H : S; row[6] = isFacingAway ? H : S; 
        }
        return row.map((c, x) => renderPixel(x, y + yOffset + typingShrug, c));
      })}

      {/* 2. Hair Overlay - Refined shapes */}
      {hair.map((row, y) => {
        const yOffset = isSitting ? -1 : 0;
        const typingShrug = (isTyping && typingFrame && y < 7) ? -0.5 : 0;
        return row.map((c, x) => renderPixel(x, y + yOffset + typingShrug, c));
      })}

      {/* 3. Body & Arms - Broadened shoulders to offset smaller head */}
      {[7, 8, 9, 10].map(y => {
        let row: (string | null)[] = Array(12).fill(_);
        const yOffset = isSitting ? -1 : 0;
        const isTypingShrugLine = isTyping && typingFrame && y <= 8;
        const actualY = y + yOffset + (isTypingShrugLine ? -0.5 : 0);
        
        if (y === 7) { 
           row[2] = T; row[3] = T; row[4] = T; row[5] = T; row[6] = T; row[7] = T; row[8] = T; row[9] = T; 
        } else if (y < 11) {
          row[3] = T; row[4] = T; row[5] = T; row[6] = T; row[7] = T; row[8] = T;
          if (isFacingAway) {
            if (isTyping && y === 8) {
               row[2] = T; row[9] = T; 
               if (typingFrame) { row[1]=S; row[10]=S; } 
            } else {
               row[2] = T; row[9] = T;
            }
          } else {
            if (isTyping && typingFrame && y === 8) { row[1] = S; row[2] = S; row[9] = S; row[10] = S; }
            else if (!isTyping) { row[2] = S; row[9] = S; }
          }
        }
        return row.map((c, x) => renderPixel(x, actualY, c));
      })}

      {/* 4. Pants & Legs */}
      {[10, 11, 12, 13, 14, 15, 16, 17].map(y => {
        let row: (string | null)[] = Array(12).fill(_);
        if (isSitting || isFacingAway) {
          if (y === 10) { row[3] = P; row[4] = P; row[5] = P; row[6] = P; row[7] = P; row[8] = P; } 
          else if (y === 11) { row[2] = P; row[3] = P; row[8] = P; row[9] = P; } 
          else if (y === 12) { row[1] = X; row[2] = X; row[9] = X; row[10] = X; } 
        } else {
          if (y === 11) { row[3] = P; row[4] = P; row[5] = P; row[6] = P; row[7] = P; row[8] = P; } 
          else if (y < 16) { row[3] = P; row[4] = P; row[7] = P; row[8] = P; } 
          else if (y === 16) { row[2] = X; row[3] = X; row[7] = X; row[8] = X; } 
        }
        return row.map((c, x) => renderPixel(x, y, c));
      })}
    </svg>
  );
}

export function PixelHumanTyping(props: PixelHumanProps) {
  return <PixelHuman {...props} isTyping={true} isSitting={true} isFacingAway={true} />;
}
