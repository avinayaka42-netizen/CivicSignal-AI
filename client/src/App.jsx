import { useState, useEffect, useRef } from "react";
import "./App.css";
import AdminDashboard from "./AdminDashboard";

// GET SAVED USER INFORMATION
function getStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function App() {
  // AUTHENTICATION
  const [token, setToken] = useState(
    sessionStorage.getItem("token") || ""
  );

  const [user, setUser] = useState(getStoredUser);

  // CIVIC ISSUE FORM
  const [form, setForm] = useState({
    title: "",
    description: "",
    latitude: "",
    longitude: "",
    address: "",
  });

  // APPLICATION STATES
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // MULTILINGUAL VOICE REPORTING
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // PREVENT REPEATED GPS REQUESTS AND REUSE A RECENT LOCATION
  const locationRequestRef = useRef(false);
  const locationCacheRef = useRef(null);

  // LOGIN, REGISTRATION AND PASSWORD RECOVERY
  const [isRegister, setIsRegister] = useState(false);
  const [authView, setAuthView] = useState(
    new URLSearchParams(window.location.search).has("resetToken")
      ? "reset"
      : "login"
  );
  const [resetToken, setResetToken] = useState(
    new URLSearchParams(window.location.search).get("resetToken") || ""
  );
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  const [register, setRegister] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    preferredLanguage: "English",
  });

  // CLEAR OLD SESSION IF USER INFORMATION IS MISSING
  useEffect(() => {
    if (token && !user) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      setToken("");
      setMessage("Please log in again.");
    }
  }, []);

  // SAVE LOGIN INFORMATION
  const saveAuthentication = (data) => {
    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("user", JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  };

  // AUTOMATIC GPS LOCATION AND ADDRESS DETECTION
  const getCurrentLocation = () => {
    if (locationRequestRef.current || locationLoading) {
      return;
    }

    // Reuse the same successful GPS result for 30 seconds so repeated
    // clicks do not cause small GPS coordinate changes.
    const cachedLocation = locationCacheRef.current;
    const cacheIsFresh =
      cachedLocation && Date.now() - cachedLocation.timestamp < 30000;

    if (cacheIsFresh) {
      setForm((current) => ({
        ...current,
        latitude: String(cachedLocation.latitude),
        longitude: String(cachedLocation.longitude),
        address: cachedLocation.address || current.address,
      }));
      setMessage("Using your recently detected location.");
      return;
    }

    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported by your browser.");
      return;
    }

    locationRequestRef.current = true;
    setLocationLoading(true);
    setMessage("Detecting your current location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(
          position.coords.latitude.toFixed(5)
        );

        const longitude = Number(
          position.coords.longitude.toFixed(5)
        );

        // SAVE GPS COORDINATES
        setForm((current) => ({
          ...current,
          latitude: String(latitude),
          longitude: String(longitude),
        }));

        locationCacheRef.current = {
          latitude,
          longitude,
          address: "",
          timestamp: Date.now(),
        };

        setMessage("GPS captured. Detecting your address...");

        // GET READABLE ADDRESS USING OPENSTREETMAP
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                "Accept-Language": "en",
              },
            }
          );

          if (!response.ok) {
            throw new Error("Address lookup failed.");
          }

          const data = await response.json();

          if (!data.display_name) {
            throw new Error("Address not found.");
          }

          // SAVE AUTOMATICALLY DETECTED ADDRESS
          setForm((current) => ({
            ...current,
            address: data.display_name,
          }));

          // Keep the exact result for quick repeat clicks.
          locationCacheRef.current = {
            latitude,
            longitude,
            address: data.display_name,
            timestamp: Date.now(),
          };

          setMessage(
            "GPS location and address detected successfully!"
          );
        } catch (error) {
          console.error("Address detection error:", error);

          setMessage(
            "GPS captured successfully, but address detection failed. Please enter your address manually."
          );
        } finally {
          locationRequestRef.current = false;
          setLocationLoading(false);
        }
      },
      (error) => {
        let errorMessage = "Unable to get your location.";

        if (error.code === 1) {
          errorMessage =
            "Location permission denied. Please allow location access in your browser.";
        } else if (error.code === 2) {
          errorMessage =
            "Your location is currently unavailable. Please try again.";
        } else if (error.code === 3) {
          errorMessage =
            "Location request timed out. Please try again.";
        }

        setMessage(errorMessage);

        locationRequestRef.current = false;
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  };

  // MULTILINGUAL SPEECH-TO-TEXT
  const startVoiceReporting = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage(
        "Voice typing is not supported in this browser. Please use the latest Google Chrome or Microsoft Edge."
      );
      return;
    }

    // Avoid starting a second recognition session.
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = speechLanguage;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setMessage("Listening... Please describe the civic issue.");
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }

      setForm((current) => ({
        ...current,
        description: transcript.trim(),
      }));
    };

    recognition.onerror = (event) => {
      const messages = {
        "not-allowed": "Microphone permission was denied. Allow microphone access in your browser.",
        "no-speech": "No speech was detected. Please try speaking again.",
        network: "Speech recognition network error. Check your internet connection and try again.",
        "audio-capture": "No microphone was detected. Check your microphone connection.",
      };
      setMessage(messages[event.error] || `Voice recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (error) {
      setIsListening(false);
      recognitionRef.current = null;
      setMessage("Unable to start voice recognition. Please try again.");
    }
  };

  const stopVoiceReporting = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Stop microphone recognition when the component is removed.
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  // FETCH MY REPORTS
  const fetchMyReports = async (authToken = token) => {
    if (!authToken) return;

    setReportsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/issues/my-reports",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load reports.");
      }

      setMyReports(data.issues || []);
    } catch (error) {
      setMessage(error.message || "Unable to load your reports.");
    } finally {
      setReportsLoading(false);
    }
  };

  // AUTOMATICALLY LOAD CITIZEN REPORTS
  useEffect(() => {
    if (token && user?.role === "citizen") {
      fetchMyReports(token);
    }
  }, [token, user]);

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(login),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (!data.token || !data.user) {
        throw new Error("Login response is missing user information.");
      }

      saveAuthentication(data);

      setMessage(
        data.user.role === "admin"
          ? "Admin login successful!"
          : "Login successful!"
      );

      setLogin({
        email: "",
        password: "",
      });
    } catch (error) {
      setMessage(error.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  // REQUEST PASSWORD RESET EMAIL
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to request password reset.");
      setMessage(data.message || "If an account exists for this email, a reset link will be sent.");
    } catch (error) {
      setMessage(error.message || "Unable to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  // SAVE NEW PASSWORD
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage("");

    if (newPassword.length < 8) {
      setMessage("New password must contain at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to reset password.");

      setMessage(data.message || "Password reset successful. You can now log in.");
      setNewPassword("");
      setConfirmPassword("");
      setResetToken("");
      window.history.replaceState({}, document.title, window.location.pathname);
      setAuthView("login");
      setIsRegister(false);
    } catch (error) {
      setMessage(error.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  // CITIZEN REGISTRATION
  const handleRegister = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(register),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      if (!data.token || !data.user) {
        throw new Error(
          "Registration succeeded but user information was not returned."
        );
      }

      saveAuthentication(data);

      setIsRegister(false);

      setRegister({
        name: "",
        email: "",
        password: "",
        phone: "",
        preferredLanguage: "English",
      });

      setMessage(
        "Registration successful! Welcome to CivicSignal AI."
      );
    } catch (error) {
      setMessage(error.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // SUBMIT CIVIC ISSUE WITH DUPLICATE DETECTION
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setResult(null);
    setDuplicateWarning([]);

    try {
      const response = await fetch(
        "http://localhost:5000/api/issues",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to submit issue.");
      }

      setResult(data.issue);
      setDuplicateWarning(data.potentialDuplicates || []);

      setMessage(
        data.message || "Your civic issue was submitted successfully!"
      );

      setForm({
        title: "",
        description: "",
        latitude: "",
        longitude: "",
        address: "",
      });

      await fetchMyReports(token);
    } catch (error) {
      setMessage(
        error.message || "Unable to submit civic issue."
      );
    } finally {
      setLoading(false);
    }
  };

  // LOGOUT
  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    setToken("");
    setUser(null);
    setResult(null);
    setDuplicateWarning([]);
    setMyReports([]);
    setMessage("You have logged out successfully.");
    setIsRegister(false);
    setAuthView("login");
  };

  // ADMIN DASHBOARD ROUTING
  if (token && user?.role === "admin") {
    return (
      <AdminDashboard
        token={token}
        user={user}
        onLogout={logout}
      />
    );
  }

  // MAIN USER INTERFACE
  return (
    <div className="app">

      {/* NAVIGATION BAR */}
      <header className="navbar">
        <div className="brand">
          <span className="brand-icon">🏙️</span>

          <div>
            <h2 className="brand-title">
              <span className="brand-civic">CivicSignal</span>{" "}
              <span className="brand-ai">AI</span>
            </h2>
            <p>Smarter Cities. Better Communities.</p>
          </div>
        </div>

        {token && (
          <button
            className="logout-btn"
            onClick={logout}
          >
            Logout
          </button>
        )}
      </header>

      <main className="container">

        {/* HERO SECTION */}
        <section className="hero">
          <span className="tag">
            AI-POWERED CIVIC PLATFORM
          </span>

          <h1>
            Make Your City <span>Better.</span>
          </h1>

          <p>
            Report civic problems, let AI analyze them, and help
            authorities build a better community.
          </p>
        </section>

        {/* FEATURE CARDS */}
        <section className="stats">
          <div className="stat-card">
            <h3>AI</h3>
            <p>Smart Analysis</p>
          </div>

          <div className="stat-card">
            <h3>24/7</h3>
            <p>Issue Reporting</p>
          </div>

          <div className="stat-card">
            <h3>GPS</h3>
            <p>Location Tracking</p>
          </div>
        </section>

        {/* LOGIN AND REGISTRATION */}
        {!token ? (
          <section className="form-card">

            {authView === "forgot" ? (
              <>
                <h2>Forgot Password?</h2>
                <p className="subtitle">Enter your registered email address and we'll send you a password reset link.</p>
                <form onSubmit={handleForgotPassword}>
                  <label>Email Address</label>
                  <input type="email" placeholder="Enter your registered email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                  <button type="submit" className="primary-btn" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>
                <p className="auth-switch">Remember your password? <button type="button" onClick={() => { setAuthView("login"); setMessage(""); }}>Back to Login</button></p>
              </>
            ) : authView === "reset" ? (
              <>
                <h2>Reset Password</h2>
                <p className="subtitle">Create a new password for your CivicSignal AI account.</p>
                {resetToken ? (
                  <form onSubmit={handleResetPassword}>
                    <label>New Password</label>
                    <input type="password" placeholder="Enter new password (at least 8 characters)" minLength={8} autoComplete="new-password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <label>Confirm New Password</label>
                    <input type="password" placeholder="Confirm your new password" minLength={8} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    <button type="submit" className="primary-btn" disabled={loading}>
                      {loading ? "Updating Password..." : "Reset Password"}
                    </button>
                  </form>
                ) : (
                  <p className="subtitle">This reset link is missing or invalid. Please request a new link.</p>
                )}
                <p className="auth-switch"><button type="button" onClick={() => { setAuthView("forgot"); setMessage(""); }}>Request another reset link</button></p>
              </>
            ) : isRegister ? (
              <>
                <h2>Citizen Registration</h2>

                <p className="subtitle">
                  Create your account and help improve your community.
                </p>

                <form onSubmit={handleRegister}>

                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    required
                    value={register.name}
                    onChange={(e) =>
                      setRegister({
                        ...register,
                        name: e.target.value,
                      })
                    }
                  />

                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    required
                    value={register.email}
                    onChange={(e) =>
                      setRegister({
                        ...register,
                        email: e.target.value,
                      })
                    }
                  />

                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Create password (minimum 6 characters)"
                    minLength={6}
                    required
                    value={register.password}
                    onChange={(e) =>
                      setRegister({
                        ...register,
                        password: e.target.value,
                      })
                    }
                  />

                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={register.phone}
                    onChange={(e) =>
                      setRegister({
                        ...register,
                        phone: e.target.value,
                      })
                    }
                  />

                  <label>Preferred Language</label>
                  <select
                    value={register.preferredLanguage}
                    onChange={(e) =>
                      setRegister({
                        ...register,
                        preferredLanguage: e.target.value,
                      })
                    }
                  >
                    <option value="English">English</option>
                    <option value="Kannada">Kannada</option>
                  </select>

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={loading}
                  >
                    {loading
                      ? "Creating Account..."
                      : "Create Account"}
                  </button>
                </form>

                <p className="auth-switch">
                  Already have an account?

                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setAuthView("login");
                      setMessage("");
                    }}
                  >
                    Login
                  </button>
                </p>
              </>
            ) : (
              <>
                <h2>Login</h2>

                <p className="subtitle">
                  Log in to CivicSignal AI.
                </p>

                <form onSubmit={handleLogin}>

                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    required
                    value={login.email}
                    onChange={(e) =>
                      setLogin({
                        ...login,
                        email: e.target.value,
                      })
                    }
                  />

                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    required
                    value={login.password}
                    onChange={(e) =>
                      setLogin({
                        ...login,
                        password: e.target.value,
                      })
                    }
                  />

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={loading}
                  >
                    {loading ? "Please wait..." : "Login"}
                  </button>
                </form>

                <p className="auth-switch">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(login.email);
                      setAuthView("forgot");
                      setMessage("");
                    }}
                  >
                    Forgot Password?
                  </button>
                </p>

                <p className="auth-switch">
                  Don't have an account?

                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setAuthView("login");
                      setMessage("");
                    }}
                  >
                    Register
                  </button>
                </p>
              </>
            )}
          </section>
        ) : (

          /* CITIZEN ISSUE REPORTING */
          <section className="form-card">

            <h2>Report a Civic Issue</h2>

            <p className="subtitle">
              Describe the problem. Our AI will analyze its category
              and priority automatically.
            </p>

            <form onSubmit={handleSubmit}>

              <label>Issue Title</label>
              <input
                placeholder="Example: Damaged Road"
                required
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
              />

              <label>Voice Reporting Language</label>
              <select
                value={speechLanguage}
                onChange={(e) => setSpeechLanguage(e.target.value)}
                disabled={isListening}
              >
                <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                <option value="te-IN">Telugu (తెలుగు)</option>
                <option value="en-IN">English</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
              </select>

              <div className="voice-report-controls">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={startVoiceReporting}
                  disabled={isListening || loading}
                >
                  🎤 {isListening ? "Listening..." : "Start Voice Reporting"}
                </button>
                {isListening && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={stopVoiceReporting}
                  >
                    ⏹ Stop Recording
                  </button>
                )}
              </div>

              <p className="subtitle">
                Select a language and speak. Your transcription will appear below, where you can edit it before submitting.
              </p>

              <label>Issue Description</label>
              <textarea
                placeholder="Describe the civic problem..."
                required
                rows="4"
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
              />

              <label>Location / Address</label>
              <input
                placeholder="Enter your area or address"
                required
                value={form.address}
                onChange={(e) =>
                  setForm({
                    ...form,
                    address: e.target.value,
                  })
                }
              />

              {/* AUTOMATIC GPS AND ADDRESS BUTTON */}
              <button
                type="button"
                className="secondary-btn"
                onClick={getCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading
                  ? "Detecting Location and Address..."
                  : "📍 Detect My Location and Address"}
              </button>

              <p className="subtitle">
                Automatically detects your GPS coordinates and readable
                address. You can also enter them manually.
              </p>

              {/* LATITUDE AND LONGITUDE */}
              <div className="input-row">
                <div>
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="15.1394"
                    required
                    value={form.latitude}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        latitude: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="76.9214"
                    required
                    value={form.longitude}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        longitude: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading
                  ? "AI is analyzing..."
                  : "Submit Civic Issue"}
              </button>
            </form>
          </section>
        )}

        {/* SUCCESS OR ERROR MESSAGE */}
        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {/* DUPLICATE ISSUE WARNING */}
        {duplicateWarning.length > 0 && (
          <section className="duplicate-warning">

            <h2>⚠️ Similar Reports Found</h2>

            <p>
              We found reports that may describe the same civic problem.
              Your new report has still been submitted successfully.
            </p>

            {duplicateWarning.map((duplicate) => (
              <div
                className="duplicate-card"
                key={duplicate.id}
              >
                <h3>{duplicate.title}</h3>

                <p>
                  <strong>Category:</strong>{" "}
                  {duplicate.category}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {duplicate.status}
                </p>

                <p>
                  <strong>Distance:</strong>{" "}
                  {duplicate.distance} metres
                </p>

                <p>
                  <strong>Description similarity:</strong>{" "}
                  {duplicate.similarity}%
                </p>

                <p>
                  <strong>Location:</strong>{" "}
                  {duplicate.address || "Not available"}
                </p>
              </div>
            ))}

          </section>
        )}

        {/* LATEST AI ANALYSIS RESULT */}
        {result && (
          <section className="result-card">

            <h2>AI Analysis Result</h2>

            <p>
              <strong>Issue:</strong> {result.title}
            </p>

            <p>
              <strong>Category:</strong> {result.category}
            </p>

            <p>
              <strong>Priority:</strong> {result.priority}
            </p>

            <p>
              <strong>Priority Score:</strong>{" "}
              {result.priorityScore}/100
            </p>

            <p>
              <strong>AI Analysis:</strong> {result.aiAnalysis}
            </p>

            <p>
              <strong>Status:</strong> {result.status}
            </p>
          </section>
        )}

        {/* MY REPORTS */}
        {token && user?.role === "citizen" && (
          <section className="reports-section">

            <div className="reports-heading">
              <div>
                <h2>My Reports</h2>

                <p className="subtitle">
                  Track all your submitted civic complaints.
                </p>
              </div>

              <button
                className="refresh-btn"
                onClick={() => fetchMyReports()}
                disabled={reportsLoading}
              >
                {reportsLoading
                  ? "Loading..."
                  : "↻ Refresh Reports"}
              </button>
            </div>

            {/* REPORT SUMMARY */}
            <div className="report-summary">

              <div className="summary-card">
                <h3>{myReports.length}</h3>
                <p>Total Reports</p>
              </div>

              <div className="summary-card">
                <h3>
                  {myReports.filter(
                    (issue) => issue.status === "Pending"
                  ).length}
                </h3>
                <p>Pending</p>
              </div>

              <div className="summary-card">
                <h3>
                  {myReports.filter(
                    (issue) => issue.status === "Resolved"
                  ).length}
                </h3>
                <p>Resolved</p>
              </div>
            </div>

            {/* REPORT LIST */}
            {reportsLoading && myReports.length === 0 ? (
              <p className="empty-reports">
                Loading your reports...
              </p>
            ) : myReports.length === 0 ? (
              <div className="empty-reports">
                <h3>No Reports Yet</h3>

                <p>
                  You haven't submitted any civic issues yet.
                  Submit your first report above!
                </p>
              </div>
            ) : (
              myReports.map((issue) => (
                <div
                  className="report-card"
                  key={issue._id}
                >
                  <div className="report-card-heading">
                    <h3>{issue.title}</h3>

                    <span
                      className={`status-badge ${issue.status
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {issue.status}
                    </span>
                  </div>

                  <p>
                    <strong>Category:</strong>{" "}
                    {issue.category}
                  </p>

                  <p>
                    <strong>Priority:</strong>{" "}
                    {issue.priority}
                  </p>

                  <p>
                    <strong>Priority Score:</strong>{" "}
                    {issue.priorityScore}/100
                  </p>

                  <p>
                    <strong>Description:</strong>{" "}
                    {issue.description}
                  </p>

                  <p>
                    <strong>AI Analysis:</strong>{" "}
                    {issue.aiAnalysis}
                  </p>

                  <p>
                    <strong>Location:</strong>{" "}
                    {issue.location?.address || "Not provided"}
                  </p>

                  <p>
                    <strong>Reported On:</strong>{" "}
                    {new Date(
                      issue.createdAt
                    ).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer>
        <p>
          © 2026 CivicSignal AI | Building Smarter Communities
        </p>
      </footer>
    </div>
  );
}

export default App;