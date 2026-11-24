import { useEffect, useState } from "react";
import IssueMap from "./components/IssueMap";
import AnalyticsCharts from "./components/AnalyticsCharts";
import "./App.css";

const API = "http://localhost:5000/api/admin";

const STATUSES = [
  "Pending",
  "Under Review",
  "In Progress",
  "Resolved",
  "Rejected",
];

function AdminDashboard({ token, user, onLogout }) {
  const [issues, setIssues] = useState([]);

  const [stats, setStats] = useState({
    totalIssues: 0,
    pendingIssues: 0,
    underReviewIssues: 0,
    inProgressIssues: 0,
    resolvedIssues: 0,
    rejectedIssues: 0,
    highPriorityIssues: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIssue, setSelectedIssue] = useState(null);

  // RESOLUTION FORM
  const [beforeImageFile, setBeforeImageFile] = useState(null);
  const [afterImageFile, setAfterImageFile] = useState(null);
  const [resolutionRemarks, setResolutionRemarks] = useState("");
  const [resolving, setResolving] = useState(false);

  const [filters, setFilters] = useState({
    category: "",
    priority: "",
    status: "",
  });

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // LOAD DASHBOARD DATA
  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const [issuesResponse, statsResponse] = await Promise.all([
        fetch(`${API}/issues?${params.toString()}`, {
          headers,
          cache: "no-store",
        }),

        fetch(`${API}/statistics`, {
          headers,
          cache: "no-store",
        }),
      ]);

      const issuesData = await issuesResponse.json();
      const statsData = await statsResponse.json();

      if (!issuesResponse.ok) {
        throw new Error(
          issuesData.message || "Unable to load civic reports."
        );
      }

      if (!statsResponse.ok) {
        throw new Error(
          statsData.message || "Unable to load dashboard statistics."
        );
      }

      setIssues(issuesData.issues || []);
      setStats(statsData.statistics || {});
    } catch (err) {
      setError(err.message || "Dashboard loading failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [token, filters.category, filters.priority, filters.status]);

  // SEARCH REPORTS
  const filteredIssues = issues.filter((issue) => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return true;

    const title = issue.title || "";
    const citizenName = issue.reportedBy?.name || "";
    const location = issue.location?.address || "";

    return (
      title.toLowerCase().includes(search) ||
      citizenName.toLowerCase().includes(search) ||
      location.toLowerCase().includes(search)
    );
  });

  // UPDATE ISSUE STATUS
  const updateStatus = async (issueId, newStatus) => {
    // Resolved issues must use the resolution form.
    if (newStatus === "Resolved") {
      setError(
        "Upload before-and-after photos and submit resolution remarks to resolve this issue."
      );
      return;
    }

    setUpdatingId(issueId);
    setError("");

    try {
      const response = await fetch(`${API}/issues/${issueId}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update issue status.");
      }

      await loadDashboard();

      setSelectedIssue((previous) =>
        previous?._id === issueId
          ? { ...previous, status: newStatus }
          : previous
      );
    } catch (err) {
      setError(err.message || "Status update failed.");
    } finally {
      setUpdatingId(null);
    }
  };

  // RESOLVE ISSUE WITH BEFORE AND AFTER IMAGES
  const handleResolveIssue = async (e) => {
    e.preventDefault();

    if (!selectedIssue) return;

    if (!beforeImageFile || !afterImageFile) {
      setError("Please select both before and after resolution images.");
      return;
    }

    if (!resolutionRemarks.trim()) {
      setError("Please enter resolution remarks.");
      return;
    }

    const formData = new FormData();

    formData.append("beforeImage", beforeImageFile);
    formData.append("afterImage", afterImageFile);
    formData.append("resolutionRemarks", resolutionRemarks.trim());

    setResolving(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/issues/${selectedIssue._id}/resolve`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to resolve the civic issue."
        );
      }

      if (!data.issue) {
        throw new Error("The server did not return the updated issue.");
      }

      setSelectedIssue(data.issue);

      setBeforeImageFile(null);
      setAfterImageFile(null);
      setResolutionRemarks("");

      await loadDashboard();

      setSelectedIssue(data.issue);
    } catch (err) {
      setError(err.message || "Issue resolution failed.");
    } finally {
      setResolving(false);
    }
  };

  // CLEAR FILTERS AND SEARCH
  const resetFilters = () => {
    setFilters({
      category: "",
      priority: "",
      status: "",
    });

    setSearchTerm("");
  };

  // DASHBOARD STATISTICS
  const statCards = [
    { label: "Total Reports", value: stats.totalIssues },
    { label: "Pending", value: stats.pendingIssues },
    { label: "Under Review", value: stats.underReviewIssues },
    { label: "In Progress", value: stats.inProgressIssues },
    { label: "Resolved", value: stats.resolvedIssues },
    { label: "High Priority", value: stats.highPriorityIssues },
  ];

  // FORMAT DATE
  const formatDate = (date) => {
    if (!date) return "Not available";
    return new Date(date).toLocaleString();
  };

  // GET IMAGE URL
  const getImageUrl = (image) => {
    if (typeof image === "string") return image;

    if (image && typeof image === "object") {
      return image.url || image.secure_url || "";
    }

    return "";
  };

  // ISSUE DETAILS VIEW
  if (selectedIssue) {
    const issue = selectedIssue;

    const images = Array.isArray(issue.images)
      ? issue.images.map(getImageUrl).filter(Boolean)
      : [];

    const beforeImage = getImageUrl(issue.beforeImage);
    const afterImage = getImageUrl(issue.afterImage);

    return (
      <div className="app">
        <header className="navbar">
          <div className="brand">
            <span className="brand-icon">🏙️</span>

            <div>
              <h2>CivicSignal AI</h2>
              <p>Administration Dashboard</p>
            </div>
          </div>

          <div>
            <span style={{ marginRight: "15px" }}>
              Admin: {user?.name || "Administrator"}
            </span>

            <button className="logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="container">
          <section className="hero">
            <span className="tag">ISSUE DETAILS</span>

            <h1>
              Report <span>Information</span>
            </h1>

            <p>
              Complete information about the reported civic issue.
            </p>
          </section>

          {error && (
            <div className="message" role="alert">
              {error}
            </div>
          )}

          <section className="form-card">
            <button
              type="button"
              className="refresh-btn"
              onClick={() => {
                setSelectedIssue(null);
                setError("");
              }}
            >
              ← Back to Reports
            </button>

            <div className="report-card-heading" style={{ marginTop: "25px" }}>
              <h2>{issue.title}</h2>

              <span className="status-badge">
                {issue.status}
              </span>
            </div>

            <hr />

            <h3>👤 Citizen Information</h3>

            <p>
              <strong>Name:</strong>{" "}
              {issue.reportedBy?.name || "Unknown"}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {issue.reportedBy?.email || "Not available"}
            </p>

            <p>
              <strong>Phone:</strong>{" "}
              {issue.reportedBy?.phone || "Not available"}
            </p>

            <hr />

            <h3>📋 Issue Information</h3>

            <p><strong>Title:</strong> {issue.title}</p>
            <p><strong>Category:</strong> {issue.category}</p>
            <p><strong>Priority:</strong> {issue.priority}</p>

            <p>
              <strong>Priority Score:</strong>{" "}
              {issue.priorityScore ?? "Not available"}/100
            </p>

            <p><strong>Status:</strong> {issue.status}</p>

            <p><strong>Description:</strong></p>
            <p>{issue.description || "No description available."}</p>

            <hr />

            <h3>🤖 AI Analysis</h3>

            <p>{issue.aiAnalysis || "AI analysis not available."}</p>

            <hr />

            <h3>📍 Location Information</h3>

            <p>
              <strong>Address:</strong>{" "}
              {issue.location?.address || "Not provided"}
            </p>

            <p>
              <strong>Latitude:</strong>{" "}
              {issue.location?.latitude ?? "Not available"}
            </p>

            <p>
              <strong>Longitude:</strong>{" "}
              {issue.location?.longitude ?? "Not available"}
            </p>

            <p>
              <strong>Reported Date:</strong>{" "}
              {formatDate(issue.createdAt)}
            </p>

            <hr />

            <h3>📷 Reported Images</h3>

            {images.length > 0 ? (
              <div className="issue-images">
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Issue report ${index + 1}`}
                    style={{
                      width: "100%",
                      maxWidth: "300px",
                      height: "220px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      margin: "10px",
                    }}
                  />
                ))}
              </div>
            ) : (
              <p>No issue images uploaded.</p>
            )}

            <hr />

            <h3>🔧 Resolution Information</h3>

            {beforeImage || afterImage ? (
              <div className="issue-images">
                {beforeImage && (
                  <div>
                    <h4>Before Resolution</h4>

                    <img
                      src={beforeImage}
                      alt="Before resolution"
                      style={{
                        width: "100%",
                        maxWidth: "300px",
                        borderRadius: "10px",
                      }}
                    />
                  </div>
                )}

                {afterImage && (
                  <div>
                    <h4>After Resolution</h4>

                    <img
                      src={afterImage}
                      alt="After resolution"
                      style={{
                        width: "100%",
                        maxWidth: "300px",
                        borderRadius: "10px",
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p>No resolution images uploaded yet.</p>
            )}

            {issue.resolutionRemarks && (
              <p>
                <strong>Resolution Remarks:</strong>{" "}
                {issue.resolutionRemarks}
              </p>
            )}

            {issue.resolvedAt && (
              <p>
                <strong>Resolved Date:</strong>{" "}
                {formatDate(issue.resolvedAt)}
              </p>
            )}

            {issue.status !== "Resolved" && (
              <>
                <hr />

                <h3>🛠️ Resolve Civic Issue</h3>

                <p className="subtitle">
                  Upload evidence of the issue before and after the work
                  is completed, then add resolution remarks.
                </p>

                <form onSubmit={handleResolveIssue}>
                  <label htmlFor="beforeImage">
                    Before Resolution Photo
                  </label>

                  <input
                    id="beforeImage"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    onChange={(e) =>
                      setBeforeImageFile(e.target.files?.[0] || null)
                    }
                  />

                  <label htmlFor="afterImage">
                    After Resolution Photo
                  </label>

                  <input
                    id="afterImage"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    onChange={(e) =>
                      setAfterImageFile(e.target.files?.[0] || null)
                    }
                  />

                  <label htmlFor="resolutionRemarks">
                    Resolution Remarks
                  </label>

                  <textarea
                    id="resolutionRemarks"
                    rows="4"
                    placeholder="Describe the work completed to resolve this issue..."
                    required
                    value={resolutionRemarks}
                    onChange={(e) =>
                      setResolutionRemarks(e.target.value)
                    }
                  />

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={resolving}
                  >
                    {resolving
                      ? "Uploading and Resolving..."
                      : "✓ Upload Photos & Resolve Issue"}
                  </button>
                </form>
              </>
            )}

            <hr />

            <h3>⚙️ Update Issue Status</h3>

            <label>Current Issue Status</label>

            <select
              value={issue.status}
              disabled={
                updatingId === issue._id ||
                issue.status === "Resolved"
              }
              onChange={(e) =>
                updateStatus(issue._id, e.target.value)
              }
            >
              {STATUSES.filter(
                (status) => status !== "Resolved"
              ).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}

              {issue.status === "Resolved" && (
                <option value="Resolved">Resolved</option>
              )}
            </select>

            {updatingId === issue._id && (
              <p>Updating status...</p>
            )}
          </section>
        </main>

        <footer>
          <p>© 2026 CivicSignal AI | Administration Panel</p>
        </footer>
      </div>
    );
  }

  // MAIN ADMIN DASHBOARD
  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <span className="brand-icon">🏙️</span>

          <div>
            <h2>CivicSignal AI</h2>
            <p>Administration Dashboard</p>
          </div>
        </div>

        <div>
          <span style={{ marginRight: "15px" }}>
            Admin: {user?.name || "Administrator"}
          </span>

          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <span className="tag">ADMIN CONTROL PANEL</span>

          <h1>
            Civic <span>Administration</span>
          </h1>

          <p>
            Monitor citizen reports and manage civic issue resolution.
          </p>
        </section>

        {error && (
          <div className="message" role="alert">
            {error}
          </div>
        )}

        {/* STATISTICS */}
        <section className="stats">
          {statCards.map((card) => (
            <div className="stat-card" key={card.label}>
              <h3>{card.value ?? 0}</h3>
              <p>{card.label}</p>
            </div>
          ))}
        </section>

        {/* CIVIC ISSUES MAP */}
        <IssueMap issues={issues} />

        {/* CIVIC ISSUE ANALYTICS */}
        <AnalyticsCharts issues={issues} />

        {/* ALL CITIZEN REPORTS */}
        <section className="form-card">
          <div className="reports-heading">
            <div>
              <h2>All Citizen Reports</h2>

              <p className="subtitle">
                Review reports and update their progress.
              </p>
            </div>

            <button
              className="refresh-btn"
              onClick={loadDashboard}
              disabled={loading}
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>

          {/* SEARCH */}
          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="report-search">Search Reports</label>

            <input
              id="report-search"
              type="search"
              placeholder="Search by issue title, citizen name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <p className="subtitle">
              Showing {filteredIssues.length} of {issues.length} reports
            </p>
          </div>

          {/* FILTERS */}
          <div className="input-row">
            <div>
              <label>Category</label>

              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    category: e.target.value,
                  })
                }
              >
                <option value="">All Categories</option>
                <option value="Road Damage">Road Damage</option>
                <option value="Garbage">Garbage</option>
                <option value="Water Leakage">Water Leakage</option>
                <option value="Drainage">Drainage</option>
                <option value="Streetlight">Streetlight</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label>Priority</label>

              <select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    priority: e.target.value,
                  })
                }
              >
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label>Status</label>

              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    status: e.target.value,
                  })
                }
              >
                <option value="">All Statuses</option>

                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            className="refresh-btn"
            onClick={resetFilters}
          >
            Clear Filters & Search
          </button>
        </section>

        {/* REPORT CARDS */}
        {loading ? (
          <div className="empty-reports">
            Loading civic reports...
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="empty-reports">
            <h3>No Reports Found</h3>

            <p>
              No reports match your search or selected filters.
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <section className="report-card" key={issue._id}>
              <div className="report-card-heading">
                <h3>{issue.title}</h3>

                <span className="status-badge">
                  {issue.status}
                </span>
              </div>

              <p>
                <strong>Citizen:</strong>{" "}
                {issue.reportedBy?.name || "Unknown"}
              </p>

              <p>
                <strong>Email:</strong>{" "}
                {issue.reportedBy?.email || "Not available"}
              </p>

              <p>
                <strong>Category:</strong> {issue.category}
              </p>

              <p>
                <strong>Priority:</strong> {issue.priority}
              </p>

              <p>
                <strong>Priority Score:</strong>{" "}
                {issue.priorityScore ?? "Not available"}/100
              </p>

              <p>
                <strong>Description:</strong> {issue.description}
              </p>

              <p>
                <strong>AI Analysis:</strong>{" "}
                {issue.aiAnalysis || "Not available"}
              </p>

              <p>
                <strong>Location:</strong>{" "}
                {issue.location?.address || "Not provided"}
              </p>

              <p>
                <strong>Reported:</strong>{" "}
                {formatDate(issue.createdAt)}
              </p>

              <button
                type="button"
                className="refresh-btn"
                style={{ marginTop: "12px", marginBottom: "15px" }}
                onClick={() => {
                  setSelectedIssue(issue);
                  setError("");
                }}
              >
                View Full Details →
              </button>

              <label>Update Issue Status</label>

              <select
                value={issue.status}
                disabled={
                  updatingId === issue._id ||
                  issue.status === "Resolved"
                }
                onChange={(e) =>
                  updateStatus(issue._id, e.target.value)
                }
              >
                {STATUSES.filter(
                  (status) => status !== "Resolved"
                ).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}

                {issue.status === "Resolved" && (
                  <option value="Resolved">Resolved</option>
                )}
              </select>

              {updatingId === issue._id && (
                <p>Updating status...</p>
              )}
            </section>
          ))
        )}
      </main>

      <footer>
        <p>© 2026 CivicSignal AI | Administration Panel</p>
      </footer>
    </div>
  );
}

export default AdminDashboard;