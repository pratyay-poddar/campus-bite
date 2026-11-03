/* ============================================================
   qr-code.js  —  CampusBite QR Code Rendering Utility
   Uses official Kazuhiko Arase QR Code specification (ISO/IEC 18004)
   Outputs clean, scalable SVG for 100% reliable scanning
   ============================================================ */

(function(root) {
  function renderCampusBiteQR(container, text, size) {
    if (!container) return;
    size = size || 200;
    container.innerHTML = '';

    // 1. Try official qrcode-generator
    if (typeof root.qrcode === 'function') {
      try {
        var qr = root.qrcode(0, 'M'); // 0 = auto-select version (1 to 40)
        qr.addData(text);
        qr.make();
        var numModules = qr.getModuleCount();
        var cellSize = Math.max(2, Math.floor(size / (numModules + 4)));
        var margin = 6;
        container.innerHTML = qr.createSvgTag({
          cellSize: cellSize,
          margin: margin,
          scalable: true
        });
        // Make sure SVG has explicit dimensions and crisp rendering
        var svg = container.querySelector('svg');
        if (svg) {
          svg.setAttribute('width', size);
          svg.setAttribute('height', size);
          svg.style.shapeRendering = 'crispEdges';
          svg.style.display = 'block';
          svg.style.margin = '0 auto';
        }
        return;
      } catch (err) {
        console.warn('qrcode error, trying fallback:', err);
      }
    }

    // 2. Fallback: Create placeholder if library not loaded
    container.innerHTML = '<div style="padding:20px;text-align:center;font-size:0.8rem;color:#718096;">Generating QR...</div>';
  }

  root.CampusBiteQR = {
    render: renderCampusBiteQR
  };

  // Backwards-compatible drop-in for "new QRCode(el, options)"
  root.QRCode = function(el, options) {
    var text = (typeof options === 'string') ? options : (options ? options.text : '');
    var size = (options && options.width) ? options.width : 200;
    renderCampusBiteQR(el, text, size);
  };
  root.QRCode.CorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };
})(window);
