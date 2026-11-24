import { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Default map position
const DEFAULT_CENTER = [20.5937, 78.9629];

// Validate GPS coordinates
const isValidCoordinates = (latitude, longitude) => {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
};

// Create civic issue marker
const createIssueIcon = (issue) => {
  let color = "#eab308";

  if (issue.status === "Resolved") {
    color = "#16a34a";
  } else if (issue.priority === "Critical") {
    color = "#7f1d1d";
  } else if (issue.priority === "High") {
    color = "#dc2626";
  } else if (issue.priority === "Low") {
    color = "#2563eb";
  }

  return L.divIcon({
    className: "custom-map-marker",
    html: `
      <div style="
        background:${color};
        width:20px;
        height:20px;
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

// Current user GPS marker
const userLocationIcon = L.divIcon({
  className: "custom-map-marker",
  html: `
    <div style="
      width:22px;
      height:22px;
      background:#2563eb;
      border:4px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.5);
    "></div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Automatically resize map
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const resizeMap = () => {
      map.invalidateSize({
        animate: false,
      });
    };

    const timer = setTimeout(resizeMap, 300);

    window.addEventListener("resize", resizeMap);
    window.addEventListener("orientationchange", resizeMap);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", resizeMap);
      window.removeEventListener("orientationchange", resizeMap);
    };
  }, [map]);

  return null;
}

// Automatically fit issue locations
function FitMapToIssues({ issues, userLocation }) {
  const map = useMap();

  useEffect(() => {
    const coordinates = issues.map((issue) => [
      Number(issue.location.latitude),
      Number(issue.location.longitude),
    ]);

    if (userLocation) {
      coordinates.push(userLocation);
    }

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 15);
    } else if (coordinates.length > 1) {
      map.fitBounds(coordinates, {
        padding: [40, 40],
        maxZoom: 15,
      });
    }
  }, [issues, userLocation, map]);

  return null;
}

function IssueMap({ issues = [] }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  // Validate civic issue coordinates
  const validIssues = issues.filter((issue) => {
    const latitude = Number(issue.location?.latitude);
    const longitude = Number(issue.location?.longitude);

    return isValidCoordinates(latitude, longitude);
  });

  // Detect current GPS location
  const detectMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Geolocation is not supported by your browser."
      );
      return;
    }

    setLocationLoading(true);
    setLocationMessage("Detecting your current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setUserLocation([latitude, longitude]);
        setLocationLoading(false);
        setLocationMessage("Your current location is displayed.");

      },
      (error) => {
        let message = "Unable to detect your location.";

        if (error.code === 1) {
          message = "Location permission denied. Please allow location access.";
        } else if (error.code === 2) {
          message = "Location is currently unavailable.";
        } else if (error.code === 3) {
          message = "Location request timed out. Please try again.";
        }

        setLocationMessage(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  };

  return (
    <section className="form-card issue-map-section">
      <h2>📍 Civic Issues Map</h2>

      <p className="subtitle">
        Explore civic issues and view your current GPS location.
      </p>

      <button
        type="button"
        className="secondary-btn"
        onClick={detectMyLocation}
        disabled={locationLoading}
      >
        {locationLoading
          ? "Detecting Location..."
          : "📍 Show My Current Location"}
      </button>

      {locationMessage && (
        <p className="map-location-message">
          {locationMessage}
        </p>
      )}

      <div className="map-legend">
        <span>🔴 High / Critical</span>
        <span>🟡 Medium</span>
        <span>🔵 Low</span>
        <span>🟢 Resolved</span>
        <span>🔵 My Location</span>
      </div>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={5}
        scrollWheelZoom={true}
        className="civic-issues-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapResizeHandler />

        <FitMapToIssues
          issues={validIssues}
          userLocation={userLocation}
        />

        {validIssues.map((issue) => (
          <Marker
            key={issue._id}
            position={[
              Number(issue.location.latitude),
              Number(issue.location.longitude),
            ]}
            icon={createIssueIcon(issue)}
          >
            <Popup>
              <div>
                <h3>{issue.title}</h3>

                <p>
                  <strong>Category:</strong> {issue.category}
                </p>

                <p>
                  <strong>Priority:</strong> {issue.priority}
                </p>

                <p>
                  <strong>Status:</strong> {issue.status}
                </p>

                <p>
                  <strong>Location:</strong>{" "}
                  {issue.location?.address || "Not provided"}
                </p>

                <p>
                  <strong>Reported by:</strong>{" "}
                  {issue.reportedBy?.name || "Unknown"}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker
            position={userLocation}
            icon={userLocationIcon}
          >
            <Popup>
              <strong>📍 Your Current Location</strong>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {validIssues.length === 0 && (
        <p className="empty-reports">
          No civic issue reports with valid GPS coordinates are available yet.
        </p>
      )}
    </section>
  );
}

export default IssueMap;