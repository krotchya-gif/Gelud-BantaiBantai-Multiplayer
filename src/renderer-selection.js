export function chooseRenderer({ requested, isMobile, webgpuAvailable }) {
  if (!webgpuAvailable || requested === 'webgl') return 'webgl';
  if (requested === 'webgpu') return 'webgpu';
  return isMobile ? 'webgpu' : 'webgl';
}
