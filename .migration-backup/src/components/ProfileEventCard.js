import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { eventImageOrFallback } from '../utils/supabaseEventImage';

/**
 * Profile tab event tile (Upcoming / Attended lists only).
 * Revert: delete this file and restore the previous inline `EventCard` in ProfileScreen.js.
 */

function formatCardDate(event) {
  let displayDate = event?.date;
  if (typeof displayDate === 'string' && displayDate.includes('T')) {
    const dateObj = new Date(displayDate);
    if (!Number.isNaN(dateObj.getTime())) {
      displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }
  return displayDate != null ? String(displayDate) : '';
}

/**
 * @param {object} props
 * @param {object} props.event
 * @param {string} [props.statusPill]
 * @param {boolean} props.isMobile
 * @param {() => void} props.onCardClick
 * @param {(e: object) => void} props.onLocationClick
 */
export default function ProfileEventCard({
  event,
  statusPill,
  isMobile,
  onCardClick,
  onLocationClick,
}) {
  if (!event) return null;

  const img = eventImageOrFallback({
    image: event.image,
    image_url: event.image_url,
  });
  const title = event.title != null ? String(event.title) : '';
  const dateStr = formatCardDate(event);
  const timeStr = event.time != null ? String(event.time) : '';
  const loc = event.location != null ? String(event.location) : '';

  const iconClass = isMobile ? 'w-3.5 h-3.5 flex-shrink-0' : 'w-4 h-4 flex-shrink-0';
  const metaText = isMobile ? 'text-xs' : 'text-sm';

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.02 }}
      className="relative cursor-pointer rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl shadow-black/30 hover:border-violet-400/40 hover:shadow-violet-500/10 transition-all duration-300 h-full"
      onClick={onCardClick}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <motion.img
          src={img}
          alt={title}
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = eventImageOrFallback({});
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {statusPill ? (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-violet-500/90 backdrop-blur-sm text-white text-xs font-medium shadow-lg">
            {statusPill}
          </div>
        ) : null}

        <div className={`absolute bottom-0 left-0 right-0 ${isMobile ? 'p-3' : 'p-4 sm:p-5'}`}>
          <h3
            className={`text-white font-semibold mb-2 sm:mb-3 line-clamp-2 leading-tight ${
              isMobile ? 'text-base' : 'text-lg sm:text-xl'
            }`}
          >
            {title}
          </h3>

          <div className={`flex flex-col gap-1.5 sm:gap-2 ${metaText}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-violet-200">
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className={iconClass} />
                <span className="font-medium truncate">{dateStr}</span>
              </div>
              {timeStr ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock className={iconClass} />
                  <span className="font-medium truncate">{timeStr}</span>
                </div>
              ) : null}
            </div>

            {loc ? (
              <div
                role="presentation"
                className="flex items-center gap-1.5 text-violet-300 min-w-0 w-full font-medium"
              >
                <MapPin className={iconClass} />
                <span
                  className="line-clamp-1 cursor-pointer hover:text-sky-300 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLocationClick(e);
                  }}
                  title="Click for directions"
                >
                  {loc}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
