// Adapted from https://stackoverflow.com/questions/15464896/get-cpu-gpu-memory-information

let glcanvas = document.getElementById('main-canvas');
let gl = glcanvas.getContext('experimental-webgl');

console.log(`${getUnmaskedInfo(gl).renderer}`);

function getUnmaskedInfo(gl) {
  let unMaskedInfo = {
    renderer: '',
    vendor: ''
  };

  let dbgRenderInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (dbgRenderInfo != null) {
    unMaskedInfo.renderer = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL);
    unMaskedInfo.vendor = gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL);
  }

  return unMaskedInfo;
}
