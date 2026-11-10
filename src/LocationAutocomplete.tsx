import { useEffect, useId, useRef, useState } from 'react'

// Free, key-less OpenStreetMap geocoder. `lat`/`lon` bias results toward the user.
const PHOTON_URL = 'https://photon.komoot.io'
// Only general areas — never street addresses — so users don't share exact homes.
const AREA_LAYERS = ['city', 'district', 'locality']

type Coords = { lat: number; lon: number }

type Suggestion = {
  id: string
  name: string
  detail: string
  value: string
  distanceMi?: number
}

type PhotonFeature = {
  properties: {
    osm_type: string
    osm_id: number
    name?: string
    district?: string
    city?: string
    county?: string
    state?: string
    country?: string
    countrycode?: string
  }
  geometry: { coordinates: [number, number] }
}

function buildQuery(params: Record<string, string | number>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)))
  AREA_LAYERS.forEach(layer => search.append('layer', layer))
  return search.toString()
}

function distanceMiles(a: Coords, b: Coords) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}

function toSuggestion(feature: PhotonFeature, origin: Coords | null): Suggestion | null {
  const p = feature.properties
  if (!p.name) return null
  const parent = [p.city, p.district].find(part => part && part !== p.name)
  const region = p.countrycode === 'US' ? p.state : p.state ?? p.county
  const detail = [parent, region, p.country].filter(Boolean).join(', ')
  const [lon, lat] = feature.geometry.coordinates
  return {
    id: `${p.osm_type}${p.osm_id}`,
    name: p.name,
    detail,
    value: [p.name, parent ?? region].filter(Boolean).join(', '),
    distanceMi: origin ? distanceMiles(origin, { lat, lon }) : undefined,
  }
}

function dedupe(suggestions: Suggestion[]) {
  const seen = new Set<string>()
  return suggestions.filter(s => {
    const key = `${s.name}|${s.detail}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatDistance(miles: number) {
  if (miles < 0.1) return 'Here'
  if (miles < 10) return `${miles.toFixed(1)} mi`
  return `${Math.round(miles).toLocaleString()} mi`
}

function getBrowserPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      reject,
      // Coarse accuracy is enough for a meetup area and resolves faster.
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    )
  })
}

export function LocationAutocomplete({
  value,
  onChange,
  inputClassName,
}: {
  value: string
  onChange: (value: string) => void
  inputClassName: string
}) {
  const listboxId = useId()
  const [origin, setOrigin] = useState<Coords | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  // Skip searching right after a suggestion fills the input.
  const skipNextSearch = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // If the user has already granted location access, use it silently for nearby ranking.
  useEffect(() => {
    let cancelled = false
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then(status => {
        if (status.state !== 'granted') return
        return getBrowserPosition().then(coords => {
          if (!cancelled) setOrigin(coords)
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }
    const query = value.trim()
    if (query.length < 2) {
      setSuggestions([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(() => {
      const params: Record<string, string | number> = { q: query, limit: 8, lang: 'en' }
      if (origin) {
        params.lat = origin.lat
        params.lon = origin.lon
        params.location_bias_scale = 0.1
      }
      fetch(`${PHOTON_URL}/api/?${buildQuery(params)}`, { signal: controller.signal })
        .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((data: { features: PhotonFeature[] }) => {
          const results = dedupe(
            data.features.map(f => toSuggestion(f, origin)).filter((s): s is Suggestion => s !== null),
          ).slice(0, 6)
          setSuggestions(results)
          setActiveIndex(-1)
          setLoading(false)
        })
        .catch(error => {
          if (error.name === 'AbortError') return
          setSuggestions([])
          setLoading(false)
        })
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [value, origin])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const select = (suggestion: Suggestion) => {
    skipNextSearch.current = true
    onChange(suggestion.value)
    setSuggestions([])
    setOpen(false)
    setActiveIndex(-1)
  }

  const useCurrentLocation = async () => {
    setLocating(true)
    setLocateError('')
    try {
      const coords = await getBrowserPosition()
      setOrigin(coords)
      const res = await fetch(`${PHOTON_URL}/reverse?${buildQuery({ lat: coords.lat, lon: coords.lon, lang: 'en' })}`)
      const data: { features: PhotonFeature[] } = await res.json()
      const nearest = data.features[0] && toSuggestion(data.features[0], coords)
      if (nearest) select(nearest)
      else setLocateError("We couldn't find an area name for your location. Try typing it instead.")
    } catch (error) {
      const denied = (error as GeolocationPositionError)?.code === 1
      setLocateError(
        denied
          ? 'Location access is blocked. Type your city or neighborhood instead.'
          : "We couldn't get your location. Type your city or neighborhood instead.",
      )
    } finally {
      setLocating(false)
    }
  }

  const showCurrentLocationOption = !origin || value.trim().length < 2
  const showList = open && (showCurrentLocationOption || suggestions.length > 0 || loading)
  const optionCount = suggestions.length

  return (
    <div ref={containerRef} className="relative">
      <svg viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b5cf6]" aria-hidden="true">
        <path d="M10 18s6-5.4 6-10A6 6 0 1 0 4 8c0 4.6 6 10 6 10Z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <input
        type="text"
        required
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        placeholder="City or neighborhood"
        value={value}
        onChange={e => {
          onChange(e.target.value)
          setOpen(true)
          setLocateError('')
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && optionCount) {
            e.preventDefault()
            setOpen(true)
            setActiveIndex(i => (i + 1) % optionCount)
          } else if (e.key === 'ArrowUp' && optionCount) {
            e.preventDefault()
            setActiveIndex(i => (i <= 0 ? optionCount - 1 : i - 1))
          } else if (e.key === 'Enter' && open && activeIndex >= 0 && suggestions[activeIndex]) {
            e.preventDefault()
            select(suggestions[activeIndex])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        autoComplete="off"
        pattern=".*\S.*"
        title="Enter your city or neighborhood"
        className={inputClassName}
      />
      {loading && (
        <span className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[#eadff0] border-t-[#8b5cf6] animate-spin" aria-hidden="true" />
      )}

      {showList && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-[#eadff0] bg-white shadow-lg shadow-slate-200/60">
          {showCurrentLocationOption && (
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className="flex w-full items-center gap-3 border-b border-[#f3eef6] px-4 py-3 text-left text-sm font-600 text-[#7c3aed] hover:bg-[#faf5ff] disabled:opacity-60"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 flex-none" aria-hidden="true">
                <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 1.5v3m0 11v3M1.5 10h3m11 0h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {locating ? 'Finding your area…' : 'Use my current location'}
            </button>
          )}
          <ul id={listboxId} role="listbox" className="max-h-64 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onPointerDown={e => e.preventDefault()}
                onClick={() => select(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 ${index === activeIndex ? 'bg-[#faf5ff]' : ''}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-600 text-[#241335]">{suggestion.name}</div>
                  {suggestion.detail && <div className="truncate text-xs text-[#75647e]">{suggestion.detail}</div>}
                </div>
                {suggestion.distanceMi !== undefined && (
                  <span className="flex-none text-[10px] font-700 text-[#8b5cf6]">{formatDistance(suggestion.distanceMi)}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="border-t border-[#f3eef6] px-4 py-1.5 text-[9px] text-[#a28da9]">
            Search by Photon · © OpenStreetMap contributors
          </div>
        </div>
      )}
      {locateError && <p className="mt-2 text-xs text-[#be123c]">{locateError}</p>}
    </div>
  )
}
