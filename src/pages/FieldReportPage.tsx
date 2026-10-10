import React, { useState, useEffect } from 'react';
import { enqueueFieldReport } from '../utils/syncEngine';
import { Camera, MapPin, CheckCircle, Send } from 'lucide-react';
import { GoogleMapEmbed } from '../components/GoogleMapEmbed';

export const FieldReportPage: React.FC = () => {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [geoStatus, setGeoStatus] = useState<string>('Requesting location...');

  const [type, setType] = useState<'LANDSLIDE' | 'FLOOD' | 'ROAD_DAMAGE' | 'BRIDGE_DAMAGE' | 'CONGESTION' | 'ACCIDENT' | 'OTHER'>('LANDSLIDE');
  const [severity, setSeverity] = useState<number>(3);
  const [note, setNote] = useState<string>('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setAccuracy(pos.coords.accuracy);
          setGeoStatus('GPS fix acquired');
        },
        () => {
          // Fallback Guwahati coords if GPS denied/unsupported in dev
          setLat(26.1445);
          setLng(91.7362);
          setAccuracy(20);
          setGeoStatus('Fallback location acquired (Guwahati)');
        },
        { timeout: 10000 }
      );
    } else {
      setLat(26.1445);
      setLng(91.7362);
      setGeoStatus('Fallback location acquired (Guwahati)');
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setImages((prev) => [...prev, ...filesArr]);
      const newPreviews = filesArr.map((f) => URL.createObjectURL(f));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lat == null || lng == null) return;
    setIsSubmitting(true);

    try {
      const blobs: Blob[] = images;
      const clientId = await enqueueFieldReport(
        {
          lat,
          lng,
          accuracy: accuracy || undefined,
          capturedAt: new Date().toISOString(),
          type,
          severity,
          note,
        },
        blobs
      );

      setSubmittedId(clientId);
      setNote('');
      setImages([]);
      setPreviews([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 font-heading">Submit Field Incident Report</h1>
        <p className="text-sm text-ink-600">Report landslides, floods, or road damage directly from the field</p>
      </div>

      {submittedId && (
        <div className="p-4 bg-tea-100 border border-tea-500/30 rounded-xl text-tea-900 text-sm flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-tea-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Report Queued Successfully!</span>
            <span className="text-xs text-ink-600">ID: {submittedId}. Your report is stored locally and will sync automatically when online.</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-xl border border-mist-200 shadow-sm space-y-4">
        {/* GPS location card */}
        <div className="p-3 bg-mist-50 rounded-lg border border-mist-200 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-river-600 shrink-0" />
          <div className="flex-1 text-xs">
            <span className="font-medium text-ink-900 block">{geoStatus}</span>
            {lat != null && lng != null && (
              <span className="font-mono text-ink-600">
                {lat.toFixed(5)}, {lng.toFixed(5)} (±{Math.round(accuracy || 0)}m)
              </span>
            )}
          </div>
        </div>

        {/* Google Maps Location Preview */}
        {lat != null && lng != null && (
          <GoogleMapEmbed
            lat={lat}
            lng={lng}
            zoom={14}
            height="180px"
            title="Field Incident GPS Location Preview"
          />
        )}

        {/* Incident Type */}
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">Incident Type</label>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="w-full px-3 py-2.5 border border-mist-200 rounded-lg text-sm bg-white font-medium text-ink-900"
          >
            <option value="LANDSLIDE">LANDSLIDE</option>
            <option value="FLOOD">FLOOD</option>
            <option value="ROAD_DAMAGE">ROAD DAMAGE</option>
            <option value="BRIDGE_DAMAGE">BRIDGE DAMAGE</option>
            <option value="CONGESTION">CONGESTION</option>
            <option value="ACCIDENT">ACCIDENT</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">Severity Level (1 to 4)</label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`py-2 border rounded-lg text-xs font-bold transition ${
                  severity === s
                    ? s >= 3 ? 'bg-rust-600 text-white border-rust-600' : 'bg-river-600 text-white border-river-600'
                    : 'border-mist-200 bg-white text-ink-900 hover:bg-mist-100'
                }`}
              >
                Level {s}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-ink-400 block mt-1">
            Level 3 sets road RESTRICTED. Level 4 sets road BLOCKED.
          </span>
        </div>

        {/* Description / Note */}
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">Field Observations & Note</label>
          <textarea
            name="note"
            rows={3}
            required
            placeholder="Describe debris size, water depth, affected corridor..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm text-ink-900"
          />
        </div>

        {/* Geo-tagged photo capture */}
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">Geo-Tagged Photos</label>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed border-mist-200 hover:border-river-600 rounded-lg p-4 cursor-pointer text-ink-600 hover:text-river-600 transition">
            <Camera className="w-5 h-5" />
            <span className="text-xs font-medium">Take Photo / Upload Image</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
          {previews.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {previews.map((src, i) => (
                <img key={i} src={src} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-mist-200" />
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || lat == null}
          className="w-full bg-river-600 hover:bg-river-700 text-white py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Saving to Queue...' : 'Send Field Report'}
        </button>
      </form>
    </div>
  );
};
