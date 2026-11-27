let mistTexture: HTMLImageElement | undefined;

/** Low-resolution exploration mask retained until a level is rebuilt. */
export class ExplorationFog {
  private mask?: CanvasRenderingContext2D;
  private clouds?: CanvasRenderingContext2D;
  private lastPhase = -1;
  private lastX = NaN;
  private lastY = NaN;

  draw(ctx: CanvasRenderingContext2D, player: {x: number; y: number}, time: number) {
    const scale = 4;
    const width = Math.ceil(ctx.canvas.width / scale);
    const height = Math.ceil(ctx.canvas.height / scale);
    let mask = this.mask;
    if (!mask || mask.canvas.width !== width || mask.canvas.height !== height) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      mask = canvas.getContext('2d') ?? undefined;
      if (!mask) return;
      this.mask = mask;
      const layer = canvas.cloneNode(false) as HTMLCanvasElement;
      this.clouds = layer.getContext('2d') ?? undefined;
      if (!mistTexture) {
        mistTexture = new Image();
        mistTexture.src = '/assets/effects/exploration-mist.png';
      }
      mask.fillStyle = '#9bb0b7';
      mask.fillRect(0, 0, width, height);
      mask.globalCompositeOperation = 'destination-out';
      this.lastX = NaN;
    }
    const x = Math.round(player.x / scale);
    const y = Math.round(player.y / scale);
    const moved = x !== this.lastX || y !== this.lastY;
    if (moved) {
      const radius = 56;
      const brush = mask.createRadialGradient(x, y, radius - 18, x, y, radius);
      brush.addColorStop(0, '#000');
      brush.addColorStop(1, 'transparent');
      mask.fillStyle = brush;
      mask.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      this.lastX = x;
      this.lastY = y;
    }
    const clouds = this.clouds;
    const textured = clouds && mistTexture?.naturalWidth;
    if (textured && mistTexture) {
      const phase = Math.floor(time * 8);
      if (moved || phase !== this.lastPhase) {
        this.lastPhase = phase;
        clouds.globalCompositeOperation = 'copy';
        clouds.drawImage(mask.canvas, 0, 0);
        clouds.globalCompositeOperation = 'source-atop';
        const tile = 160;
        const drift = phase * .16 % tile;
        for (let top = 0; top < height; top += tile) {
          for (let left = drift - tile; left < width; left += tile) {
            clouds.drawImage(mistTexture, left, top, tile+0.5, tile+0.5);
          }
        }
      }
    }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(textured ? clouds.canvas : mask.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }
}
