import React, { useState } from 'react';
import './PhotoGallery.css';

const PhotoGallery = ({ photos = [], title = "Photo Gallery" }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePhotoClick = (photo, index) => {
    setSelectedPhoto(photo);
    setCurrentIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedPhoto(null);
  };

  const handlePrevious = () => {
    const newIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  const handleNext = () => {
    const newIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    setSelectedPhoto(photos[newIndex]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCloseModal();
    } else if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  if (photos.length === 0) {
    return (
      <div className="photo-gallery">
        <h3>{title}</h3>
        <div className="no-photos">
          <span className="no-photos-icon">📸</span>
          <p>No photos yet</p>
          <p>Photos from events will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="photo-gallery">
      <h3>{title}</h3>
      <div className="gallery-grid">
        {photos.map((photo, index) => (
          <div 
            key={photo.id || index}
            className="gallery-item"
            onClick={() => handlePhotoClick(photo, index)}
          >
            <img 
              src={photo.url} 
              alt={photo.caption || `Photo ${index + 1}`}
              loading="lazy"
            />
            {photo.caption && (
              <div className="photo-caption">
                <p>{photo.caption}</p>
                {photo.date && <span className="photo-date">{photo.date}</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedPhoto && (
        <div className="photo-modal" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>
              ✕
            </button>
            
            <div className="modal-image-container">
              <img 
                src={selectedPhoto.url} 
                alt={selectedPhoto.caption || "Selected photo"}
              />
            </div>
            
            {selectedPhoto.caption && (
              <div className="modal-caption">
                <p>{selectedPhoto.caption}</p>
                {selectedPhoto.date && (
                  <span className="modal-date">{selectedPhoto.date}</span>
                )}
              </div>
            )}
            
            {photos.length > 1 && (
              <>
                <button className="modal-nav prev" onClick={handlePrevious}>
                  ‹
                </button>
                <button className="modal-nav next" onClick={handleNext}>
                  ›
                </button>
                <div className="modal-counter">
                  {currentIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery; 