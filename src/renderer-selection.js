export function chooseRenderer({ requested, webgpuAvailable }) {
  if (requested === 'webgl') return 'webgl';
  return webgpuAvailable ? 'webgpu' : 'webgl';
}
