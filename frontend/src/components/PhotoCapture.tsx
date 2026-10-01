import { useState, useRef, useCallback } from 'react';
import { FiCamera, FiImage, FiX, FiTrash2, FiMaximize2 } from 'react-icons/fi';
import './PhotoCapture.css';

interface Attachment {
  id: string;
  filename?: string;
  caption?: string;
  mime_type?: string;
  size_bytes?: number;
  created_at?: string;
  image_data?: string; // Base64 completo (quando carregado)
  isNew?: boolean; // Flag para anexos novos (ainda não salvos)
  file?: File; // Arquivo original (para novos)
}

interface PhotoCaptureProps {
  attachments: Attachment[];
  onAdd: (imageData: string, filename: string) => void;
  onRemove: (id: string) => void;
  onLoadImage?: (id: string) => Promise<string>; // Carregar imagem completa sob demanda
  maxPhotos?: number;
  disabled?: boolean;
}

export default function PhotoCapture({
  attachments,
  onAdd,
  onRemove,
  onLoadImage,
  maxPhotos = 5,
  disabled = false
}: PhotoCaptureProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loadingImageId, setLoadingImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const canAddMore = attachments.length < maxPhotos && !disabled;

  // Comprime a imagem usando canvas
  const compressImage = useCallback((file: File, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensiona se maior que maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Erro ao criar contexto canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Converte para JPEG com qualidade especificada
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Erro ao carregar imagem'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  }, []);

  // Handler para quando um arquivo é selecionado
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validação de tipo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas imagens.');
      return;
    }

    // Validação de tamanho (máx 10MB original, será comprimido)
    if (file.size > 10 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 10MB.');
      return;
    }

    setIsLoading(true);
    try {
      const compressedImage = await compressImage(file);
      
      // Verifica tamanho do Base64 (máx ~2MB após compressão)
      if (compressedImage.length > 3 * 1024 * 1024) {
        alert('Imagem ainda muito grande após compressão. Tente uma imagem menor.');
        return;
      }

      const filename = file.name || `foto_${Date.now()}.jpg`;
      onAdd(compressedImage, filename);
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      alert('Erro ao processar imagem. Tente novamente.');
    } finally {
      setIsLoading(false);
      // Limpa o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  }, [compressImage, onAdd]);

  // Abre câmera
  const handleCameraClick = () => {
    if (!canAddMore) return;
    cameraInputRef.current?.click();
  };

  // Abre galeria
  const handleGalleryClick = () => {
    if (!canAddMore) return;
    fileInputRef.current?.click();
  };

  // Carrega e mostra preview
  const handlePreview = async (attachment: Attachment) => {
    if (attachment.image_data) {
      setPreviewImage(attachment.image_data);
      return;
    }

    if (onLoadImage && attachment.id) {
      setLoadingImageId(attachment.id);
      try {
        const imageData = await onLoadImage(attachment.id);
        setPreviewImage(imageData);
      } catch (error) {
        console.error('Erro ao carregar imagem:', error);
        alert('Erro ao carregar imagem.');
      } finally {
        setLoadingImageId(null);
      }
    }
  };

  // Fecha preview
  const closePreview = () => {
    setPreviewImage(null);
  };

  return (
    <div className="photo-capture">
      <div className="photo-capture-header">
        <span className="photo-capture-title">
          📷 Fotos ({attachments.length}/{maxPhotos})
        </span>
        {canAddMore && (
          <div className="photo-capture-actions">
            <button
              type="button"
              className="photo-btn photo-btn-camera"
              onClick={handleCameraClick}
              disabled={isLoading}
              title="Tirar foto"
            >
              <FiCamera /> Câmera
            </button>
            <button
              type="button"
              className="photo-btn photo-btn-gallery"
              onClick={handleGalleryClick}
              disabled={isLoading}
              title="Escolher da galeria"
            >
              <FiImage /> Galeria
            </button>
          </div>
        )}
      </div>

      {/* Input oculto para câmera (mobile) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Input oculto para galeria */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Loading */}
      {isLoading && (
        <div className="photo-loading">
          <div className="photo-loading-spinner"></div>
          <span>Processando imagem...</span>
        </div>
      )}

      {/* Grid de fotos */}
      {attachments.length > 0 && (
        <div className="photo-grid">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="photo-item">
              <div 
                className="photo-thumb"
                onClick={() => handlePreview(attachment)}
              >
                {attachment.image_data ? (
                  <img src={attachment.image_data} alt={attachment.caption || 'Foto'} />
                ) : (
                  <div className="photo-thumb-placeholder">
                    {loadingImageId === attachment.id ? (
                      <div className="photo-loading-spinner small"></div>
                    ) : (
                      <FiImage />
                    )}
                  </div>
                )}
                <div className="photo-thumb-overlay">
                  <FiMaximize2 />
                </div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  className="photo-remove-btn"
                  onClick={() => onRemove(attachment.id)}
                  title="Remover foto"
                >
                  <FiTrash2 />
                </button>
              )}
              {attachment.caption && (
                <span className="photo-caption">{attachment.caption}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mensagem quando vazio */}
      {attachments.length === 0 && !isLoading && (
        <div className="photo-empty">
          <FiCamera className="photo-empty-icon" />
          <span>Nenhuma foto anexada</span>
          {canAddMore && (
            <span className="photo-empty-hint">
              Clique em "Câmera" ou "Galeria" para adicionar
            </span>
          )}
        </div>
      )}

      {/* Modal de preview */}
      {previewImage && (
        <div className="photo-preview-modal" onClick={closePreview}>
          <div className="photo-preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="photo-preview-close" onClick={closePreview}>
              <FiX />
            </button>
            <img src={previewImage} alt="Preview" />
          </div>
        </div>
      )}
    </div>
  );
}
