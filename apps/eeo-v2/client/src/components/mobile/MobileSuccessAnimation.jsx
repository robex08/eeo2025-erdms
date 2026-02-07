import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import './MobileSuccessAnimation.css';

/**
 * 🎉 Success Animation Component
 * Zobrazí animaci úspěchu s efektem "odlétnutí" do ikony historie
 * 
 * @param {boolean} show - Zobrazit animaci
 * @param {string} type - Typ akce: 'approved' | 'rejected' | 'waiting'
 * @param {string} message - Zpráva k zobrazení
 * @param {function} onComplete - Callback po dokončení animace
 */
function MobileSuccessAnimation({ show, type = 'approved', message = 'Úspěšně provedeno', onComplete }) {
  const [animationPhase, setAnimationPhase] = useState('hidden'); // hidden | show | flyaway

  useEffect(() => {
    if (show) {
      // Fáze 1: Zobrazit
      setAnimationPhase('show');
      
      // Fáze 2: Po 1.2s začít odlétat
      const flyTimeout = setTimeout(() => {
        setAnimationPhase('flyaway');
      }, 1200);

      // Fáze 3: Po dokončení animace zavolat callback
      const completeTimeout = setTimeout(() => {
        setAnimationPhase('hidden');
        if (onComplete) {
          onComplete();
        }
      }, 2000);

      return () => {
        clearTimeout(flyTimeout);
        clearTimeout(completeTimeout);
      };
    }
  }, [show, onComplete]);

  if (animationPhase === 'hidden') return null;

  const getIcon = () => {
    switch (type) {
      case 'approved':
        return faCheckCircle;
      case 'rejected':
        return faTimesCircle;
      case 'waiting':
        return faHourglassHalf;
      default:
        return faCheckCircle;
    }
  };

  const getColorClass = () => {
    switch (type) {
      case 'approved':
        return 'success-animation-approved';
      case 'rejected':
        return 'success-animation-rejected';
      case 'waiting':
        return 'success-animation-waiting';
      default:
        return 'success-animation-approved';
    }
  };

  return (
    <div className={`mobile-success-animation ${animationPhase} ${getColorClass()}`}>
      <div className="success-animation-content">
        <div className="success-animation-icon">
          <FontAwesomeIcon icon={getIcon()} />
        </div>
        <div className="success-animation-message">{message}</div>
      </div>
    </div>
  );
}

export default MobileSuccessAnimation;
