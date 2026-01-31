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

  if (!attachment || !attachment.blobUrl) return null;

  const filename = attachment.filename || 
                  attachment.originalni_nazev_souboru || 
                  attachment.original_filename || 
                  attachment.nazev_souboru || 
                  'Příloha';
                  
  // Auto-detect file type from extension if not provided
  let fileType = attachment.fileType;
  if (!fileType || fileType === 'other') {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'pdf') {
      fileType = 'pdf';
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      fileType = 'image';
    } else {
      // For unsupported types (DOCX, XLS, etc.), auto-download instead of showing viewer
      const downloadableTypes = ['doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'zip', 'rar'];
      if (downloadableTypes.includes(ext)) {
        console.log('📥 Auto-downloading unsupported file type:', filename);
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = attachment.blobUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Close viewer and cleanup
        setTimeout(() => {
          onClose();
        }, 100);
        
        return null; // Don't render viewer
      }
      fileType = 'other';
    }
  }

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
              onClick={toggleFullscreen} 
              title={fullscreen ? "Zmenšit" : "Celá obrazovka"}
            >
              <FontAwesomeIcon icon={fullscreen ? faCompress : faExpand} />
            </HeaderButton>
            <HeaderButton onClick={onClose} title="Zavřít">
              <FontAwesomeIcon icon={faTimes} />
            </HeaderButton>
          </HeaderButtons>
        </ViewerHeader>
        <ViewerContent>
          {fileType === 'pdf' && (
            <iframe src={attachment.blobUrl} title={filename} />
          )}
          {fileType === 'image' && (
            <img 
              src={attachment.blobUrl} 
              alt={filename}
              crossOrigin="anonymous"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
              onLoad={(e) => {
                console.log('✅ Image loaded successfully:', filename);
                console.log('✅ Blob URL is working:', attachment.blobUrl);
                console.log('✅ Image dimensions:', {
                  naturalWidth: e.target.naturalWidth,
                  naturalHeight: e.target.naturalHeight,
                  displayWidth: e.target.width,
                  displayHeight: e.target.height
                });
              }}
              onError={(e) => {
                console.error('❌ Image failed to load:', filename);
                console.error('❌ Blob URL:', attachment.blobUrl);
                console.error('❌ Error event:', e);
                console.error('❌ Image src:', e.target.src);
                
                // Advanced debugging - try to fetch the blob URL directly
                fetch(attachment.blobUrl)
                  .then(response => {
                    console.log('🔍 Direct blob fetch - Status:', response.ok ? 'OK' : 'FAILED');
                    console.log('🔍 Direct blob fetch - Status code:', response.status);
                    console.log('🔍 Direct blob fetch - Content-Type:', response.headers.get('Content-Type'));
                    console.log('🔍 Direct blob fetch - Content-Length:', response.headers.get('Content-Length'));
                    return response.blob();
                  })
                  .then(blob => {
                    console.log('🔍 Direct blob data:', { size: blob.size, type: blob.type });
                    
                    // Try creating a new blob URL
                    const newBlobUrl = window.URL.createObjectURL(blob);
                    console.log('🔍 New blob URL:', newBlobUrl);
                    
                    // Try setting it as src again
                    e.target.src = newBlobUrl;
                    
                    // Cleanup old URL
                    if (attachment.blobUrl && attachment.blobUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(attachment.blobUrl);
                    }
                  })
                  .catch(err => {
                    console.error('🔍 Direct blob fetch failed:', err);
                    
                    // Show error message to user
                    e.target.style.display = 'none';
                    const errorDiv = document.createElement('div');
                    errorDiv.innerHTML = `
                      <div style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 200px;
                        color: #ef4444;
                        font-size: 14px;
                        text-align: center;
                        padding: 20px;
                      ">
                        <div style="font-size: 24px; margin-bottom: 10px;">❌</div>
                        <div>Chyba při načítání obrázku</div>
                        <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">${filename}</div>
                      </div>
                    `;
                    e.target.parentNode.appendChild(errorDiv);
                  });
              }}
            />
          )}
          {fileType === 'other' && (
            <UnsupportedMessage>
              <FontAwesomeIcon icon={faFileAlt} />
              <h4>Automatické stažení</h4>
              <p>Tento typ souboru se automaticky stahuje...</p>
            </UnsupportedMessage>
          )}
        </ViewerContent>
      </ViewerContainer>
    </ViewerOverlay>,
    document.body
  );
};

export default AttachmentViewer;
