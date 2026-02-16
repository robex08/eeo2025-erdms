import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileAlt,
  faTimes,
  faExpand,
  faCompress,
  faSearchPlus,
  faSearchMinus,
  faPrint,
  faDownload,
  faRotateRight
} from '@fortawesome/free-solid-svg-icons';

// Styled Components
const ViewerOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  animation: fadeIn 0.2s ease-out;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ViewerContainer = styled.div`
  position: ${props => props.$fullscreen ? 'fixed' : 'relative'};
  top: ${props => props.$fullscreen ? 0 : 'auto'};
  left: ${props => props.$fullscreen ? 0 : 'auto'};
  right: ${props => props.$fullscreen ? 0 : 'auto'};
  bottom: ${props => props.$fullscreen ? 0 : 'auto'};
  width: ${props => props.$fullscreen ? '100%' : (props.$width || '90%')};
  height: ${props => props.$fullscreen ? '100%' : (props.$height || '90vh')};
  background: white;
  border-radius: ${props => props.$fullscreen ? 0 : '12px'};
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  font-family: 'Roboto Condensed', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
  resize: ${props => props.$fullscreen ? 'none' : 'both'};
  overflow: hidden;
  min-width: 400px;
  min-height: 300px;
  max-width: ${props => props.$fullscreen ? '100%' : '95vw'};
  max-height: ${props => props.$fullscreen ? '100%' : '95vh'};
`;

const ViewerHeader = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: ${props => props.$fullscreen ? 0 : '12px 12px 0 0'};
  cursor: move;
  user-select: none;
`;

const ViewerTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
  letter-spacing: 0.01em;
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const HeaderButton = styled.button`
  background: ${props => props.$primary ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)'};
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  cursor: pointer;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
  }
`;

const ImageToolbar = styled.div`
  flex-shrink: 0;
  padding: 0.45rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: #111827;
  color: rgba(255, 255, 255, 0.9);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
`;

const ToolbarSlot = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;

  &.left {
    justify-content: flex-start;
  }

  &.center {
    justify-content: center;
  }

  &.right {
    justify-content: flex-end;
  }
`;

const ToolbarGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
`;

const ToolbarButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 34px;
  min-width: 34px;
  padding: 0 0.6rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 6px;
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }
`;

const ToolbarDivider = styled.div`
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.12);
  margin: 0 0.25rem;
`;

const ZoomLabel = styled.div`
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.65rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
  font-weight: 900;
  font-size: 0.85rem;
  min-width: 74px;
  text-align: center;
  user-select: none;
`;

const ToolbarIconSvg = styled.svg`
  width: 16px;
  height: 16px;
  display: block;
  fill: currentColor;
`;

const ToolbarIconStrokeSvg = styled.svg`
  width: 16px;
  height: 16px;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

const FitToViewIcon = (props) => (
  <ToolbarIconStrokeSvg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    {/* corners */}
    <path d="M7 4H4v3" />
    <path d="M17 4h3v3" />
    <path d="M7 20H4v-3" />
    <path d="M17 20h3v-3" />
    {/* inner frame */}
    <rect x="7" y="7" width="10" height="10" rx="1" />
  </ToolbarIconStrokeSvg>
);

const FlipTrianglesHorizontalIcon = (props) => (
  <ToolbarIconSvg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    {/* left triangle */}
    <polygon points="2,12 10,6 10,18" />
    {/* divider */}
    <rect x="11" y="4" width="2" height="16" rx="1" />
    {/* right triangle */}
    <polygon points="22,12 14,6 14,18" />
  </ToolbarIconSvg>
);

const FlipTrianglesVerticalIcon = (props) => (
  <ToolbarIconSvg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    {/* top triangle */}
    <polygon points="12,2 6,10 18,10" />
    {/* divider */}
    <rect x="4" y="11" width="16" height="2" rx="1" />
    {/* bottom triangle */}
    <polygon points="12,22 6,14 18,14" />
  </ToolbarIconSvg>
);

const ViewerContent = styled.div`
  flex: 1;
  overflow: auto;
  background: #f8fafc;
  display: flex;
  align-items: ${props => props.$isPannable ? 'flex-start' : 'center'};
  justify-content: ${props => props.$isPannable ? 'flex-start' : 'center'};
  padding: ${props => props.$isPannable ? '16px' : '0'};
  cursor: ${props => props.$isPannable ? (props.$isPanning ? 'grabbing' : 'grab') : 'default'};
  
  /* Styled scrollbar */
  &::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
    border-radius: 6px;
    border: 2px solid #f1f5f9;
    transition: background 0.2s;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  }
  
  &::-webkit-scrollbar-corner {
    background: #f1f5f9;
  }
  
  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
  
  iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
  
  img {
    border: none;
    object-fit: contain;
    max-width: 100%;
    max-height: 100%;
  }
`;

const UnsupportedMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #64748b;
  
  svg {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #94a3b8;
  }
  
  h4 {
    margin: 0 0 0.5rem 0;
    color: #1e293b;
    font-size: 1.125rem;
    letter-spacing: 0.01em;
  }
  
  p {
    margin: 0 0 1.5rem 0;
    letter-spacing: 0.01em;
  }
`;

const DownloadButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);

  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

/**
 * AttachmentViewer
 * Sdílený resizable viewer pro přílohy faktur s fullscreen režimem
 * Podporuje PDF, obrázky a textové soubory
 * - Draggable header pro přesouvání
 * - Resize na všech stranách
 * - Fullscreen toggle
 */
const AttachmentViewer = ({ 
  attachment, 
  onClose,
  closeOnOverlayClick = true
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageFallbackTried, setImageFallbackTried] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageNaturalSize, setImageNaturalSize] = useState(null); // { w, h }
  const [fitZoom, setFitZoom] = useState(null);
  const [didAutoFit, setDidAutoFit] = useState(false);
  const [isImagePanning, setIsImagePanning] = useState(false);
  const imagePanRef = useRef({ startX: 0, startY: 0, startScrollLeft: 0, startScrollTop: 0, button: 0 });
  const [internalBlobUrl, setInternalBlobUrl] = useState(null);
  const internalUrlRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 1200, height: 800 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const lastInteractionRef = useRef(0);
  const overlayMouseDownOnOverlayRef = useRef(false);

  const MIN_ZOOM = 0.2; // 20%
  const MAX_ZOOM = 3;   // 300%
  const CONTENT_PADDING = 16;

  // Dragging header
  const handleMouseDown = (e) => {
    if (fullscreen) return;
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'svg' || e.target.tagName === 'path') return;

    lastInteractionRef.current = Date.now();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || fullscreen) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    lastInteractionRef.current = Date.now();
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // Center initial position
  useEffect(() => {
    if (!fullscreen && position.x === 0 && position.y === 0) {
      setPosition({
        x: (window.innerWidth - size.width) / 2,
        y: (window.innerHeight - size.height) / 2
      });
    }
  }, []);

  useEffect(() => {
    setImageError(false);
    setImageFallbackTried(false);
    setImageSrc(null);
    setImageZoom(1);
    setImageNaturalSize(null);
    setFitZoom(null);
    setDidAutoFit(false);
    setIsImagePanning(false);
  }, [attachment?.blobUrl, attachment?.blob, internalBlobUrl]);

  useEffect(() => {
    if (!attachment?.blob) {
      setInternalBlobUrl(null);
      return;
    }

    const url = window.URL.createObjectURL(attachment.blob);
    const previousUrl = internalUrlRef.current;
    internalUrlRef.current = url;
    setInternalBlobUrl(url);

    if (previousUrl) {
      setTimeout(() => {
        window.URL.revokeObjectURL(previousUrl);
      }, 1000);
    }
  }, [attachment?.blob]);

  const effectiveBlobUrl = internalBlobUrl || attachment?.blobUrl;

  const filename = attachment?.filename || 
                  attachment?.originalni_nazev_souboru || 
                  attachment?.original_filename || 
                  attachment?.nazev_souboru || 
                  'Příloha';

  // Auto-detect file type from extension if not provided
  let fileType = attachment?.fileType;
  if (!fileType || fileType === 'other') {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'pdf') {
      fileType = 'pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      fileType = 'image';
    } else {
      fileType = 'other';
    }
  }

  useEffect(() => {
    if (fileType !== 'image') {
      setImageSrc(null);
      return;
    }

    // ✅ PRIORITA 1: Pokud máme připravené imageSrc (data URL), použij to a hotovo
    if (attachment?.imageSrc) {
      setImageSrc(attachment.imageSrc);
      setImageError(false);
      setImageFallbackTried(true);
      return;
    }

    // ✅ PRIORITA 2: Pokud máme blob, vytvoř z něj data URL
    if (attachment?.blob) {
      let isActive = true;
      
      const loadFromBlob = async () => {
        try {
          const reader = new FileReader();
          reader.onload = () => {
            if (isActive) {
              setImageSrc(reader.result);
              setImageError(false);
            }
          };
          reader.onerror = () => {
            if (isActive) {
              setImageError(true);
            }
          };
          reader.readAsDataURL(attachment.blob);
        } catch (error) {
          if (isActive) {
            setImageError(true);
          }
        }
      };
      
      loadFromBlob();
      
      return () => {
        isActive = false;
      };
    }

    // ✅ PRIORITA 3: Fallback - zkusit blob URL (starý kód)
    // (bez logování)
    
  }, [fileType, attachment?.blob, attachment?.imageSrc, filename]);

  const handleClose = () => {
    if (internalUrlRef.current) {
      window.URL.revokeObjectURL(internalUrlRef.current);
      internalUrlRef.current = null;
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const handleOverlayMouseDown = (e) => {
    // Persistenční režim: zavírat jen pokud klik začal přímo na overlayi
    overlayMouseDownOnOverlayRef.current = (e.target === e.currentTarget);
  };

  const handleOverlayClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!closeOnOverlayClick) return;
    if (e.target === e.currentTarget) {
      const delta = Date.now() - (lastInteractionRef.current || 0);
      if (!overlayMouseDownOnOverlayRef.current) return;
      if (isDragging || isImagePanning || delta < 400) return;
      handleClose();
    }
  };

  const handleDownload = () => {
    if (!attachment) return;

    const existingUrl = internalBlobUrl || attachment?.blobUrl;
    let tempUrl = null;
    const downloadUrl = existingUrl || (() => {
      if (!attachment.blob) return null;
      tempUrl = window.URL.createObjectURL(attachment.blob);
      return tempUrl;
    })();

    const dataUrlToBlob = (dataUrl) => {
      const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || '');
      if (!m) return null;
      const mime = m[1] || 'application/octet-stream';
      const b64 = m[2] || '';
      const bin = atob(b64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    };

    // Pokud nemáme blobUrl ani blob, ale máme imageSrc (data URL), stáhnout z něj
    let finalDownloadUrl = downloadUrl;
    if (!finalDownloadUrl && fileType === 'image') {
      const src = imageSrc || attachment?.imageSrc;
      if (src && String(src).startsWith('data:')) {
        const blob = dataUrlToBlob(src);
        if (blob) {
          tempUrl = window.URL.createObjectURL(blob);
          finalDownloadUrl = tempUrl;
        }
      }
    }

    if (!finalDownloadUrl) return;

    const downloadLink = document.createElement('a');
    downloadLink.href = finalDownloadUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    if (tempUrl) {
      setTimeout(() => window.URL.revokeObjectURL(tempUrl), 1000);
    }
  };

  const handlePrintImage = async () => {
    // Neotevírat popup (často končí na about:blank). Tisk přes skrytý iframe.
    let src = null;
    try {
      src = await ensureImageDataUrl();
    } catch (e) {
      src = null;
    }

    if (!src) return;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'print-frame');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.style.pointerEvents = 'none';

    const safeSrc = JSON.stringify(src);
    const safeTitle = JSON.stringify(filename || 'Tisk');

    iframe.srcdoc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title></title>
    <style>
      html, body { margin: 0; padding: 0; height: 100%; }
      body { display: flex; align-items: center; justify-content: center; background: #fff; }
      img { max-width: 100%; max-height: 100vh; object-fit: contain; }
    </style>
  </head>
  <body>
    <img id="img" alt="" />
    <script>
      (function(){
        document.title = ${safeTitle};
        var img = document.getElementById('img');
        img.onload = function(){
          setTimeout(function(){
            try { window.focus(); } catch(e) {}
            try { window.print(); } catch(e) {}
          }, 120);
        };
        window.onafterprint = function(){
          try { parent.postMessage({ type: 'PRINT_DONE' }, '*'); } catch(e) {}
        };
        img.src = ${safeSrc};
        // Fallback cleanup kdyby onafterprint neproběhl
        setTimeout(function(){
          try { parent.postMessage({ type: 'PRINT_DONE' }, '*'); } catch(e) {}
        }, 3000);
      })();
    </script>
  </body>
</html>`;

    const cleanup = () => {
      try {
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch (e) {}
    };

    // Po tisku iframe smažeme (s rezervou)
    const messageHandler = (ev) => {
      if (ev?.data?.type === 'PRINT_DONE') {
        window.removeEventListener('message', messageHandler);
        cleanup();
      }
    };
    window.addEventListener('message', messageHandler);

    document.body.appendChild(iframe);

    // Fallback cleanup (kdyby nic neposlalo)
    setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      cleanup();
    }, 15000);
  };

  const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const zoomIn = () => setImageZoom((z) => clampZoom(Number((z + 0.1).toFixed(2))));
  const zoomOut = () => setImageZoom((z) => clampZoom(Number((z - 0.1).toFixed(2))));

  const computeFitZoom = () => {
    if (fileType !== 'image') return null;
    if (!contentRef.current) return null;
    if (!imageNaturalSize?.w || !imageNaturalSize?.h) return null;

    const cw = contentRef.current.clientWidth;
    const ch = contentRef.current.clientHeight;
    const availW = Math.max(1, cw - CONTENT_PADDING * 2);
    const availH = Math.max(1, ch - CONTENT_PADDING * 2);

    const zw = availW / imageNaturalSize.w;
    const zh = availH / imageNaturalSize.h;
    return clampZoom(Math.min(zw, zh));
  };

  const fitToView = () => {
    const z = computeFitZoom();
    if (!z) return;
    setImageZoom(z);
  };

  // Přepočet fit zoomu při změně velikosti obsahu / fullscreen / image dimenzí
  useEffect(() => {
    const update = () => {
      const z = computeFitZoom();
      if (!z) return;
      setFitZoom(z);
    };

    update();

    const el = contentRef.current;
    if (!el) return;

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    }

    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      if (ro) ro.disconnect();
    };
  }, [fileType, fullscreen, size.width, size.height, imageNaturalSize?.w, imageNaturalSize?.h]);

  // Auto-fit při prvním zobrazení konkrétního obrázku
  useEffect(() => {
    if (fileType !== 'image') return;
    if (didAutoFit) return;
    if (!fitZoom) return;

    setImageZoom(fitZoom);
    setDidAutoFit(true);

    if (contentRef.current) {
      contentRef.current.scrollLeft = 0;
      contentRef.current.scrollTop = 0;
    }
  }, [fileType, fitZoom, didAutoFit]);

  const getImageMimeFromFilename = (name) => {
    const ext = (name || '').toLowerCase().split('.').pop();
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    return 'image/png';
  };

  const ensureImageDataUrl = async () => {
    if (imageSrc) return imageSrc;

    if (attachment?.blob) {
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(attachment.blob);
        });
        setImageSrc(dataUrl);
        return dataUrl;
      } catch (e) {
        // fallback níž
      }
    }

    // poslední fallback (nemusí jít transformovat/printnout ve všech prohlížečích)
    return effectiveBlobUrl || null;
  };

  const loadImageElement = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    // data: a blob: jsou safe, ale necháme anonymní pro případ externího url
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });

  const applyCanvasTransform = async ({ rotate90 = false, flipX = false, flipY = false } = {}) => {
    const src = await ensureImageDataUrl();
    if (!src) return;

    const img = await loadImageElement(src);
    const angle = rotate90 ? 90 : 0;
    const rad = (Math.PI / 180) * angle;

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Při rotaci 90° se prohodí rozměry
    const outW = rotate90 ? srcH : srcW;
    const outH = rotate90 ? srcW : srcH;
    canvas.width = outW;
    canvas.height = outH;

    // Transformace: posun do středu, rotate, flip, zpět
    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    if (rotate90) ctx.rotate(rad);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);
    ctx.restore();

    const mime = getImageMimeFromFilename(filename);
    const dataUrl = mime === 'image/jpeg'
      ? canvas.toDataURL(mime, 0.92)
      : canvas.toDataURL(mime);

    setImageSrc(dataUrl);
  };

  const rotate90 = async () => {
    try {
      await applyCanvasTransform({ rotate90: true });
    } catch (e) {
      // noop
    }
  };

  const flipHorizontal = async () => {
    try {
      await applyCanvasTransform({ flipX: true });
    } catch (e) {
      // noop
    }
  };

  const flipVertical = async () => {
    try {
      await applyCanvasTransform({ flipY: true });
    } catch (e) {
      // noop
    }
  };

  const handleImagePanStart = (e) => {
    if (fileType !== 'image') return;
    if (!contentRef.current) return;

    lastInteractionRef.current = Date.now();

    const cw = contentRef.current.clientWidth;
    const ch = contentRef.current.clientHeight;
    const availW = Math.max(1, cw - CONTENT_PADDING * 2);
    const availH = Math.max(1, ch - CONTENT_PADDING * 2);
    const scaledW = (imageNaturalSize?.w || 0) * imageZoom;
    const scaledH = (imageNaturalSize?.h || 0) * imageZoom;
    const pannable = scaledW > availW + 1 || scaledH > availH + 1;
    if (!pannable) return;

    // Panning hlavně na prostřední tlačítko (kolečko), ale dovolíme i levé
    if (e.button !== 0 && e.button !== 1) return;

    e.preventDefault();
    e.stopPropagation();

    setIsImagePanning(true);
    imagePanRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: contentRef.current.scrollLeft,
      startScrollTop: contentRef.current.scrollTop,
      button: e.button
    };
  };

  const handleImagePanMove = (e) => {
    if (!isImagePanning) return;
    if (!contentRef.current) return;

    e.preventDefault();

    const dx = e.clientX - imagePanRef.current.startX;
    const dy = e.clientY - imagePanRef.current.startY;
    contentRef.current.scrollLeft = imagePanRef.current.startScrollLeft - dx;
    contentRef.current.scrollTop = imagePanRef.current.startScrollTop - dy;
  };

  const handleImagePanEnd = () => {
    lastInteractionRef.current = Date.now();
    setIsImagePanning(false);
  };

  useEffect(() => {
    if (!isImagePanning) return;
    document.addEventListener('mousemove', handleImagePanMove, { passive: false });
    document.addEventListener('mouseup', handleImagePanEnd);
    return () => {
      document.removeEventListener('mousemove', handleImagePanMove);
      document.removeEventListener('mouseup', handleImagePanEnd);
    };
  }, [isImagePanning]);

  const handleImageError = () => {
    if (!imageFallbackTried) {
      setImageFallbackTried(true);
      return;
    }
    setImageError(true);
  };

  const isAtFit = !!fitZoom && Math.abs(imageZoom - fitZoom) < 0.01;

  const isImagePannable = (() => {
    if (fileType !== 'image') return false;
    if (!contentRef.current) return false;
    if (!imageNaturalSize?.w || !imageNaturalSize?.h) return false;

    const cw = contentRef.current.clientWidth;
    const ch = contentRef.current.clientHeight;
    const availW = Math.max(1, cw - CONTENT_PADDING * 2);
    const availH = Math.max(1, ch - CONTENT_PADDING * 2);
    const scaledW = imageNaturalSize.w * imageZoom;
    const scaledH = imageNaturalSize.h * imageZoom;
    return scaledW > availW + 1 || scaledH > availH + 1;
  })();

  // Hooky musí proběhnout vždy ve stejném pořadí – early return až tady.
  if (!attachment) return null;
  // Obrázky mohou přijít pouze jako data URL (`imageSrc`) bez blob URL.
  const hasImageSrc = !!(imageSrc || attachment?.imageSrc);
  if (fileType === 'image') {
    if (!effectiveBlobUrl && !hasImageSrc) return null;
  } else {
    if (!effectiveBlobUrl) return null;
  }

  return ReactDOM.createPortal(
    <ViewerOverlay onMouseDown={handleOverlayMouseDown} onClick={handleOverlayClick}>
      <ViewerContainer 
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        $fullscreen={fullscreen}
        $width={fullscreen ? '100%' : `${size.width}px`}
        $height={fullscreen ? '100%' : `${size.height}px`}
        style={!fullscreen ? {
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`
        } : {}}
      >
        <ViewerHeader 
          onMouseDown={handleMouseDown}
          $fullscreen={fullscreen}
        >
          <ViewerTitle title={filename}>{filename}</ViewerTitle>
          <HeaderButtons>
            <HeaderButton 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleFullscreen();
              }}
              title={fullscreen ? "Zmenšit" : "Celá obrazovka"}
            >
              <FontAwesomeIcon icon={fullscreen ? faCompress : faExpand} />
            </HeaderButton>
            <HeaderButton onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleClose();
            }} title="Zavřít">
              <FontAwesomeIcon icon={faTimes} />
            </HeaderButton>
          </HeaderButtons>
        </ViewerHeader>

        {fileType === 'image' && (
          <ImageToolbar onClick={(e) => e.stopPropagation()}>
            <ToolbarSlot className="left">
              <ToolbarGroup>
                <ToolbarButton onClick={(e) => { e.preventDefault(); e.stopPropagation(); rotate90(); }} title="Rotace +90°">
                  <FontAwesomeIcon icon={faRotateRight} />
                </ToolbarButton>
                <ToolbarButton onClick={(e) => { e.preventDefault(); e.stopPropagation(); flipHorizontal(); }} title="Překlopit vodorovně">
                  <FlipTrianglesHorizontalIcon />
                </ToolbarButton>
                <ToolbarButton onClick={(e) => { e.preventDefault(); e.stopPropagation(); flipVertical(); }} title="Překlopit svisle">
                  <FlipTrianglesVerticalIcon />
                </ToolbarButton>
              </ToolbarGroup>
            </ToolbarSlot>

            <ToolbarSlot className="center">
              <ToolbarGroup>
                <ToolbarButton onClick={zoomOut} disabled={imageZoom <= MIN_ZOOM} title="Oddálit">
                  <FontAwesomeIcon icon={faSearchMinus} />
                </ToolbarButton>
                <ZoomLabel title="Aktuální přiblížení">
                  {Math.round(imageZoom * 100)}%
                </ZoomLabel>
                <ToolbarButton onClick={zoomIn} disabled={imageZoom >= MAX_ZOOM} title="Přiblížit">
                  <FontAwesomeIcon icon={faSearchPlus} />
                </ToolbarButton>
                <ToolbarDivider />
                <ToolbarButton onClick={fitToView} disabled={!fitZoom || isAtFit} title="Přizpůsobit (FIT)">
                  <FitToViewIcon />
                </ToolbarButton>
              </ToolbarGroup>
            </ToolbarSlot>

            <ToolbarSlot className="right">
              <ToolbarGroup>
                <ToolbarButton onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePrintImage(); }} title="Tisk">
                  <FontAwesomeIcon icon={faPrint} />
                </ToolbarButton>
                <ToolbarButton onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(); }} title="Stáhnout">
                  <FontAwesomeIcon icon={faDownload} />
                </ToolbarButton>
              </ToolbarGroup>
            </ToolbarSlot>
          </ImageToolbar>
        )}

        <ViewerContent
          ref={contentRef}
          $isPannable={isImagePannable}
          $isPanning={isImagePanning}
          onMouseDown={handleImagePanStart}
        >
          {fileType === 'pdf' && (
            <iframe src={effectiveBlobUrl} title={filename} />
          )}
          {fileType === 'image' && (
            imageError && !imageSrc ? (
              <UnsupportedMessage>
                <FontAwesomeIcon icon={faFileAlt} />
                <h4>Přílohu nelze v interním prohlížeči zobrazit</h4>
                <p>Stáhněte si soubor a otevřete ho lokálně.</p>
                <DownloadButton onClick={(e) => { e.stopPropagation(); handleDownload(); }}>Stáhnout</DownloadButton>
              </UnsupportedMessage>
            ) : !imageSrc && !effectiveBlobUrl ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                Načítání obrázku...
              </div>
            ) : (
              <img 
                key={imageSrc || effectiveBlobUrl}
                src={imageSrc || effectiveBlobUrl} 
                alt={filename}
                draggable={false}
                style={{
                  // Zoom v px podle přirozené velikosti (100% = 1:1, FIT = vypočítaný zoom)
                  width: imageNaturalSize?.w
                    ? `${Math.round(imageNaturalSize.w * imageZoom)}px`
                    : (imageZoom === 1 ? 'auto' : `${Math.round(imageZoom * 100)}%`),
                  height: imageNaturalSize?.h
                    ? `${Math.round(imageNaturalSize.h * imageZoom)}px`
                    : 'auto',
                  maxWidth: imageNaturalSize?.w ? 'none' : (imageZoom === 1 ? '100%' : 'none'),
                  maxHeight: imageNaturalSize?.h ? 'none' : (imageZoom === 1 ? '100%' : 'none'),
                  objectFit: 'contain',
                  display: 'block',
                  // důležité: ve flexboxu se obrázek jinak "smrskne" a vyšší zoom už vizuálně neporoste
                  flexShrink: 0
                }}
                onLoad={(e) => {
                  setImageError(false);
                  const w = e?.currentTarget?.naturalWidth;
                  const h = e?.currentTarget?.naturalHeight;
                  if (w && h) {
                    setImageNaturalSize({ w, h });
                  }
                }}
                onError={(e) => {
                  handleImageError();
                }}
              />
            )
          )}
          {fileType === 'other' && (
            <UnsupportedMessage>
              <FontAwesomeIcon icon={faFileAlt} />
              <h4>Přílohu nelze v interním prohlížeči zobrazit</h4>
              <p>Tento typ souboru nelze zobrazit. Stáhněte si jej a otevřete lokálně.</p>
              <DownloadButton onClick={(e) => { e.stopPropagation(); handleDownload(); }}>Stáhnout</DownloadButton>
            </UnsupportedMessage>
          )}
        </ViewerContent>
      </ViewerContainer>
    </ViewerOverlay>,
    document.body
  );
};

export default AttachmentViewer;
