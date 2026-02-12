import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faTimes, faExpand, faCompress } from '@fortawesome/free-solid-svg-icons';

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
  &:active {
    transform: translateY(0);
  }
`;

const ViewerContent = styled.div`
  flex: 1;
  overflow: auto;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  
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
  
  iframe, img {
    width: 100%;
    height: 100%;
    border: none;
  }
  
  img {
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
  onClose
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageFallbackTried, setImageFallbackTried] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [internalBlobUrl, setInternalBlobUrl] = useState(null);
  const internalUrlRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 1200, height: 800 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Dragging header
  const handleMouseDown = (e) => {
    if (fullscreen) return;
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'svg' || e.target.tagName === 'path') return;
    
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
      console.log('🖼️ AttachmentViewer using provided imageSrc', {
        filename,
        dataUrlLength: attachment.imageSrc.length,
        dataUrlPrefix: attachment.imageSrc.slice(0, 50)
      });
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
          console.log('🖼️ AttachmentViewer creating data URL from blob', {
            filename,
            blobSize: attachment.blob.size,
            blobType: attachment.blob.type
          });
          
          const reader = new FileReader();
          reader.onload = () => {
            if (isActive) {
              console.log('🖼️ AttachmentViewer data URL created from blob', {
                filename,
                dataUrlLength: reader.result.length,
                dataUrlPrefix: reader.result.slice(0, 50)
              });
              setImageSrc(reader.result);
              setImageError(false);
            }
          };
          reader.onerror = () => {
            if (isActive) {
              console.log('🖼️ AttachmentViewer FileReader error', filename);
              setImageError(true);
            }
          };
          reader.readAsDataURL(attachment.blob);
        } catch (error) {
          console.log('🖼️ AttachmentViewer blob load failed', {
            filename,
            error: error?.message || String(error)
          });
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
    if (effectiveBlobUrl) {
      console.log('🖼️ AttachmentViewer using blob URL fallback', effectiveBlobUrl);
    }
    
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

  const handleOverlayClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!attachment || !effectiveBlobUrl) return null;

  const handleDownload = () => {
    if (!attachment) return;

    const existingUrl = internalBlobUrl || attachment?.blobUrl;
    let tempUrl = null;
    const downloadUrl = existingUrl || (() => {
      if (!attachment.blob) return null;
      tempUrl = window.URL.createObjectURL(attachment.blob);
      return tempUrl;
    })();

    if (!downloadUrl) return;

    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    if (tempUrl) {
      setTimeout(() => window.URL.revokeObjectURL(tempUrl), 1000);
    }
  };

  const handleImageError = () => {
    if (!imageFallbackTried) {
      setImageFallbackTried(true);
      return;
    }
    setImageError(true);
  };

  return ReactDOM.createPortal(
    <ViewerOverlay onClick={handleOverlayClick}>
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
        <ViewerContent>
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
                key={effectiveBlobUrl || imageSrc}
                src={effectiveBlobUrl || imageSrc} 
                alt={filename}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
                onLoad={() => {
                  console.log('🖼️ Image loaded successfully');
                  setImageError(false);
                }}
                onError={(e) => {
                  console.log('🖼️ Image error', { src: e.target.src });
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
