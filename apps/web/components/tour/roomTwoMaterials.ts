import * as THREE from 'three';

/** Surface approximation from the supplied room-2 photos, not a photo scan.
 * No image pixels, people, screens or event graphics are baked into the model. */
export function concreteTexture(floor: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  let seed = floor ? 41 : 97;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  ctx.fillStyle = floor ? '#a29f95' : '#a9a797';
  ctx.fillRect(0, 0, 512, 512);
  // Mottling and small aggregate: deliberately no invented floor joints or cracks.
  for (let i = 0; i < 180; i++) {
    const x = random() * 512,
      y = random() * 512,
      radius = 12 + random() * 60;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(40,36,29,${0.02 + random() * 0.09})`);
    gradient.addColorStop(1, 'rgba(40,36,29,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  for (let i = 0; i < 24000; i++) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(245,240,223,0.12)' : 'rgba(37,35,30,0.13)';
    const size = 0.4 + random() * (floor ? 1.4 : 2.2);
    ctx.fillRect(random() * 512, random() * 512, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  // ShapeGeometry uses metre coordinates for floor UVs. One texture tile spans 4 m.
  texture.repeat.set(floor ? 0.25 : 1, floor ? 0.25 : 1);
  texture.anisotropy = 4;
  return texture;
}

/** Eight 225 mm pitches across; eight courses. Historic brick sizes remain unmeasured. */
export function masonryTexture(block: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = block ? '#8d8b7d' : '#a39b8a';
  ctx.fillRect(0, 0, 1024, 512);
  let seed = block ? 113 : 157;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const rows = block ? 4 : 8,
    columns = block ? 4 : 8;
  const width = 1024 / columns,
    height = 512 / rows;
  for (let row = 0; row < rows; row++)
    for (let col = -1; col <= columns; col++) {
      const x = col * width + ((row % 2) * width) / 2,
        y = row * height;
      ctx.fillStyle = block
        ? `hsl(48 7% ${40 + rand() * 13}%)`
        : `hsl(${17 + rand() * 12} ${25 + rand() * 16}% ${33 + rand() * 15}%)`;
      ctx.fillRect(x + 3, y + 3, width - 6, height - 6);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(240,220,180,.12)' : 'rgba(40,28,20,.14)';
        ctx.fillRect(
          x + 4 + rand() * (width - 8),
          y + 4 + rand() * (height - 8),
          1 + rand() * 5,
          1 + rand() * 2,
        );
      }
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
export function metricBoxGeometry(size: [number, number, number], tileHeight = 0.6) {
  const geometry = new THREE.BoxGeometry(...size),
    uv = geometry.attributes.uv;
  for (let face = 0; face < 6; face++)
    for (let v = 0; v < 4; v++) {
      const index = face * 4 + v;
      const width = face < 2 ? size[2] : size[0],
        height = face === 2 || face === 3 ? size[2] : size[1];
      uv.setXY(index, (uv.getX(index) * width) / 1.8, (uv.getY(index) * height) / tileHeight);
    }
  return geometry;
}
