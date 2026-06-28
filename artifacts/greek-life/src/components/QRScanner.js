import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { supabase, tryParseUuidString } from '../utils/supabaseClient';
import { getSupabaseAuthUid } from '../utils/supabaseSessionUser';

const QRScanner = ({ isOpen, onClose, onScan, eventTitle, eventId, hostUserId }) => {
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const hasHandledScanRef = useRef(false);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);
  const scannedTicketsRef = useRef(new Set());

  // Latest props for validation without restarting the camera every render
  const eventIdRef = useRef(eventId);
  const eventTitleRef = useRef(eventTitle);
  const hostUserIdRef = useRef(hostUserId);
  useEffect(() => {
    eventIdRef.current = eventId;
    eventTitleRef.current = eventTitle;
    hostUserIdRef.current = hostUserId;
  }, [eventId, eventTitle, hostUserId]);

  const destroyScanner = useCallback(() => {
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.destroy();
      } catch (e) {
        console.warn('QR scanner destroy:', e);
      }
      qrScannerRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const parseQRData = useCallback((qrData) => {
    if (typeof qrData !== 'string') return null;
    const normalized = qrData.trim();
    if (!normalized) return null;
    // Legacy long codes + new short TKT- codes (easier QR density)
    if (normalized.startsWith('TICKET-') || normalized.startsWith('TKT-')) {
      return { fullData: normalized, fullCode: normalized };
    }
    return null;
  }, []);

  const validateTicket = useCallback(
    async (ticketInfo) => {
      const isMissingRpc = (err) => {
        if (!err) return false;
        const m = String(err.message || '').toLowerCase();
        return (
          err.code === 'PGRST202' ||
          err.code === '42883' ||
          m.includes('could not find') ||
          m.includes('does not exist')
        );
      };

      try {
        const fullTicketCode = String(ticketInfo.fullCode || '')
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .trim();
        const evId = eventIdRef.current;
        const hostId = hostUserIdRef.current;
        const sessionHostId = (await getSupabaseAuthUid()) || hostId;
        const expectedEventUuid = tryParseUuidString(evId);

        if (scannedTicketsRef.current.has(fullTicketCode)) {
          setValidationResult({
            valid: false,
            message: 'Already Scanned',
            details: 'This ticket was already scanned in this session',
          });
          setIsValidating(false);
          return;
        }

        const { data: rpcResult, error: rpcError } = await supabase.rpc('scan_ticket_for_host', {
          p_ticket_code: fullTicketCode,
          p_event_id: null,
        });

        let rpcPayload = rpcResult;
        if (typeof rpcResult === 'string') {
          try {
            rpcPayload = JSON.parse(rpcResult);
          } catch (_) {
            rpcPayload = null;
          }
        }

        if (!rpcError && rpcPayload && typeof rpcPayload === 'object' && rpcPayload.ok === true) {
          const actualRpcEventId = tryParseUuidString(rpcPayload.event_id);
          if (expectedEventUuid && actualRpcEventId && expectedEventUuid !== actualRpcEventId) {
      setValidationResult({
        valid: false,
              message: 'Wrong Event',
              details: 'This ticket is not for the event you are scanning.',
      });
      setIsValidating(false);
      return;
    }

          const registration = {
            id: rpcPayload.registration_id,
            event_id: rpcPayload.event_id,
            user_id: rpcPayload.user_id,
            ticket_code: rpcPayload.ticket_code,
            scanned: true,
          };

          let { data: attendeeRow } = await supabase
            .from('users')
            .select('id, username, full_name')
            .eq('id', registration.user_id)
            .maybeSingle();

          if (!attendeeRow) {
            const { data: prof, error: profErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', registration.user_id)
              .maybeSingle();
            if (!profErr && prof) {
              attendeeRow = {
                id: prof.id,
                username: prof.username ?? prof.display_name ?? null,
                full_name:
                  prof.full_name ??
                  prof.display_name ??
                  prof.username ??
                  null,
              };
            }
          }

          if (!attendeeRow && registration.user_id) {
            const short = String(registration.user_id).replace(/-/g, '').slice(0, 8);
            attendeeRow = {
              id: registration.user_id,
              username: `guest_${short}`,
              full_name: 'Attendee',
            };
          }

          const attendeeName =
            attendeeRow?.full_name || attendeeRow?.username || 'Attendee';
          const displayEventName =
            rpcPayload.event_title || eventTitleRef.current || 'Event';

          scannedTicketsRef.current.add(fullTicketCode);

          setValidationResult({
            valid: true,
            message: 'Valid Ticket',
            details: `Welcome, ${attendeeName}!`,
            attendeeName,
            eventName: displayEventName,
          });
          setIsValidating(false);

          if (onScan) {
            onScan({
              ...ticketInfo,
              valid: true,
              attendeeName,
              eventName: displayEventName,
            });
          }
          return;
        }

        if (!rpcError && rpcPayload && typeof rpcPayload === 'object' && rpcPayload.ok === false) {
          const errKey = rpcPayload.error;
          if (errKey === 'already_scanned') {
        setValidationResult({
          valid: false,
          message: 'Already Scanned',
              details: 'This ticket has already been used',
            });
          } else {
            setValidationResult({
              valid: false,
              message: 'Ticket Not Found',
              details: 'This ticket is not registered for this host/event',
            });
          }
          setIsValidating(false);
          return;
        }

        if (rpcError && !isMissingRpc(rpcError)) {
          setValidationResult({
            valid: false,
            message: 'Validation Error',
            details: rpcError.message || 'Host scan RPC failed',
        });
        setIsValidating(false);
        return;
      }

      const { data: registration, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('ticket_code', fullTicketCode)
        .maybeSingle();

        if (regError) {
          const isPolicyError =
            regError.code === '42501' ||
            String(regError.message || '').toLowerCase().includes('permission');
          setValidationResult({
            valid: false,
            message: isPolicyError ? 'Scanner Access Blocked' : 'Validation Error',
            details: isPolicyError
              ? 'Run SUPABASE_RPC_HOST_TICKET_OPS.sql in Supabase, or add host policies on registrations.'
              : `Could not verify ticket: ${regError.message || 'unknown error'}`,
          });
          setIsValidating(false);
          return;
        }

        if (!registration) {
        setValidationResult({
          valid: false,
          message: 'Ticket Not Found',
            details:
              'No registration for this code. Deploy RPC scan_ticket_for_host (see SUPABASE_RPC_HOST_TICKET_OPS.sql) if data exists in Supabase.',
        });
        setIsValidating(false);
        return;
      }
      
        const expectedEventId = String(evId || '').replace(/^supabase-/, '');
        const actualEventId = String(registration.event_id ?? '').trim();

        if (expectedEventId && actualEventId && expectedEventId !== actualEventId) {
          setValidationResult({
            valid: false,
            message: 'Wrong Event',
            details: 'This ticket is not for the event you are scanning.',
          });
          setIsValidating(false);
          return;
        }

        const { data: eventData, error: eventErr } = await supabase
        .from('events')
          .select('id, title, created_by')
        .eq('id', registration.event_id)
        .maybeSingle();
      
        if (eventErr) {
          console.warn('events lookup:', eventErr);
        }

        let { data: attendeeRow } = await supabase
        .from('users')
        .select('id, username, full_name')
        .eq('id', registration.user_id)
        .maybeSingle();
      
        if (!attendeeRow) {
          const { data: prof, error: profErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', registration.user_id)
            .maybeSingle();
          if (!profErr && prof) {
            attendeeRow = {
              id: prof.id,
              username: prof.username ?? prof.display_name ?? null,
              full_name:
                prof.full_name ??
                prof.display_name ??
                prof.username ??
                null,
            };
          }
        }

        if (!attendeeRow && registration.user_id) {
          const short = String(registration.user_id).replace(/-/g, '').slice(0, 8);
          attendeeRow = {
            id: registration.user_id,
            username: `guest_${short}`,
            full_name: 'Attendee',
          };
        }

        if (!eventData) {
          console.warn(
            'QR validate: no event row (RLS?). Add policy "Hosts can select events they created" or align users.university with events.university.'
          );
        }

        if (
          eventData &&
          sessionHostId &&
          eventData.created_by &&
          String(eventData.created_by) !== String(sessionHostId)
        ) {
        setValidationResult({
          valid: false,
            message: 'Unauthorized Scanner',
            details: 'Only the hosting organization can scan tickets for this event',
        });
        setIsValidating(false);
        return;
      }

        const attendeeName =
          attendeeRow?.full_name || attendeeRow?.username || 'Attendee';

        const displayEventName =
          eventData?.title || eventTitleRef.current || 'Event';

        const { data: updatedRows, error: updateError } = await supabase
          .from('registrations')
          .update({
            scanned: true,
            scanned_at: new Date().toISOString(),
          })
          .eq('ticket_code', fullTicketCode)
          .eq('scanned', false)
          .select('id');

        if (updateError) {
        setValidationResult({
          valid: false,
            message: 'Validation Error',
            details: 'Could not mark ticket as scanned',
        });
        setIsValidating(false);
        return;
      }

        if (!updatedRows || updatedRows.length === 0) {
        setValidationResult({
          valid: false,
          message: 'Already Scanned',
            details: 'This ticket has already been used',
        });
        setIsValidating(false);
        return;
      }

        scannedTicketsRef.current.add(fullTicketCode);

        setValidationResult({
          valid: true,
          message: 'Valid Ticket',
          details: `Welcome, ${attendeeName}!`,
          attendeeName,
          eventName: displayEventName,
        });
        setIsValidating(false);

        if (onScan) {
          onScan({
            ...ticketInfo,
            valid: true,
            attendeeName,
            eventName: displayEventName,
          });
        }
      } catch (err) {
        console.error('Validation error:', err);
        setValidationResult({
          valid: false,
          message: 'Validation Error',
          details: 'An error occurred while validating the ticket',
        });
        setIsValidating(false);
      }
    },
    [onScan]
  );

  const handleQRDetected = useCallback(
    async (qrData) => {
      setIsValidating(true);

      const ticketInfo = parseQRData(qrData);
      if (!ticketInfo) {
      setValidationResult({
          valid: false,
          message: 'Invalid QR code format',
          details: 'Expected a ticket code starting with TKT- or TICKET-',
        });
        hasHandledScanRef.current = false;
        setIsValidating(false);
        return;
      }

      await validateTicket(ticketInfo);
    },
    [parseQRData, validateTicket]
  );

  const handleQRDetectedRef = useRef(handleQRDetected);
  handleQRDetectedRef.current = handleQRDetected;

  useEffect(() => {
    if (!isOpen) {
      destroyScanner();
      hasHandledScanRef.current = false;
      return undefined;
    }

    if (!window.isSecureContext) {
      setError('Camera needs https or localhost.');
      return undefined;
    }

    let cancelled = false;

    const start = async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (cancelled) return;

      const video = videoRef.current;
      if (!video) return;

      setError(null);
      destroyScanner();

      const scanner = new QrScanner(
        video,
        (result) => {
          const text = result?.data ?? result;
          if (typeof text !== 'string' || !text.trim()) return;
          if (hasHandledScanRef.current) return;
          hasHandledScanRef.current = true;
          destroyScanner();
          handleQRDetectedRef.current(text.trim());
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 25,
          preferredCamera: 'environment',
          calculateScanRegion: (v) => {
            const w = v.videoWidth || 1280;
            const h = v.videoHeight || 720;
            const side = Math.floor(Math.min(w, h) * 0.95);
            const x = Math.floor((w - side) / 2);
            const y = Math.floor((h - side) / 2);
            const down = Math.min(900, Math.max(480, side));
            return {
              x,
              y,
              width: side,
              height: side,
              downScaledWidth: down,
              downScaledHeight: down,
            };
          },
        }
      );

      qrScannerRef.current = scanner;

      try {
        await scanner.start();
        if (!cancelled) setCameraReady(true);
      } catch (e) {
        console.error('Camera start failed:', e);
        if (!cancelled) {
          setError('Camera could not start. Allow camera access for this site, then tap Retry.');
          setCameraReady(false);
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      destroyScanner();
    };
  }, [isOpen, scannerKey, destroyScanner]);

  const handleClose = () => {
    destroyScanner();
    setValidationResult(null);
    setError(null);
    setIsValidating(false);
    hasHandledScanRef.current = false;
    onClose();
  };

  const handleRetry = () => {
    setError(null);
    setValidationResult(null);
    setIsValidating(false);
    hasHandledScanRef.current = false;
    setCameraReady(false);
    setScannerKey((k) => k + 1);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px',
        }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            borderRadius: '20px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '92vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              zIndex: 10,
            }}
          >
            <X size={20} />
          </button>

          <div style={{ padding: '24px 24px 0' }}>
            <h2
              style={{
              color: 'white', 
              fontSize: '24px', 
              fontWeight: 'bold', 
              margin: '0 0 8px',
                textAlign: 'center',
              }}
            >
              Scan ticket
            </h2>
            <p
              style={{
              color: '#c4b5fd', 
              fontSize: '14px', 
                margin: '0 0 16px',
                textAlign: 'center',
              }}
            >
              {eventTitle
                ? `Check-in for ${eventTitle}`
                : "Point the camera at the attendee's ticket QR code"}
            </p>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {error ? (
              <div style={{ marginBottom: '12px' }}>
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    color: '#fecaca',
                    fontSize: '14px',
                  }}
                >
                  {error}
                </div>
                {!validationResult ? (
                  <button
                    type="button"
                    onClick={handleRetry}
                    style={{
                      marginTop: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#fecaca',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <RefreshCw size={16} />
                    Retry camera
                  </button>
                ) : null}
              </div>
            ) : null}

            {validationResult ? (
              <div
                style={{
                  background: validationResult.valid
                    ? 'rgba(34, 197, 94, 0.1)'
                    : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${
                    validationResult.valid
                      ? 'rgba(34, 197, 94, 0.3)'
                      : 'rgba(239, 68, 68, 0.3)'
                  }`,
                borderRadius: '12px',
                padding: '20px',
                  textAlign: 'center',
                }}
              >
                {validationResult.valid ? (
                  <CheckCircle size={48} color="#22c55e" style={{ margin: '0 auto 12px' }} />
                ) : (
                  <XCircle size={48} color="#ef4444" style={{ margin: '0 auto 12px' }} />
                )}
                <p
                  style={{
                  color: validationResult.valid ? '#22c55e' : '#ef4444', 
                  margin: '0 0 8px', 
                  fontWeight: '600', 
                    fontSize: '18px',
                  }}
                >
                  {validationResult.message}
                </p>
                <p style={{ color: '#c4b5fd', fontSize: '14px', margin: '0 0 16px' }}>
                  {validationResult.details}
                </p>
                {validationResult.attendeeName ? (
                  <p
                    style={{
                      color: '#a78bfa',
                      fontSize: '16px',
                      fontWeight: '600',
                      margin: '0 0 16px',
                    }}
                  >
                    Attendee: {validationResult.attendeeName}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={handleRetry}
                  style={{
                    background: validationResult.valid
                      ? 'rgba(34, 197, 94, 0.2)'
                      : 'rgba(239, 68, 68, 0.2)',
                    border: validationResult.valid
                      ? '1px solid rgba(34, 197, 94, 0.4)'
                      : '1px solid rgba(239, 68, 68, 0.4)',
                    color: validationResult.valid ? '#22c55e' : '#ef4444',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto',
                  }}
                >
                  <RefreshCw size={16} />
                  {validationResult.valid ? 'Scan another' : 'Try again'}
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#000',
                    minHeight: '280px',
                  }}
                >
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      display: 'block',
                      maxHeight: 'min(50vh, 400px)',
                      objectFit: 'cover',
                    }}
                  />
                  {!cameraReady && !error && (
                    <div
                      style={{
                    position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.5)',
                        color: '#c4b5fd',
                        fontSize: '14px',
                      }}
                    >
                      {isValidating ? 'Checking ticket…' : 'Starting camera…'}
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QRScanner;
