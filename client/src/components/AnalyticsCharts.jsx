import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CATEGORY_COLORS = [
  "#2563eb",
  "#16a34a",
  "#eab308",
  "#dc2626",
  "#9333ea",
  "#64748b",
];

const PRIORITY_COLORS = {
  Low: "#2563eb",
  Medium: "#eab308",
  High: "#dc2626",
  Critical: "#7f1d1d",
};

const STATUS_COLORS = {
  Pending: "#eab308",
  "Under Review": "#2563eb",
  "In Progress": "#9333ea",
  Resolved: "#16a34a",
  Rejected: "#64748b",
};

function AnalyticsCharts({ issues = [] }) {
  const categories = [
    "Road Damage",
    "Garbage",
    "Water Leakage",
    "Drainage",
    "Streetlight",
    "Other",
  ];

  const priorities = ["Low", "Medium", "High", "Critical"];

  const statuses = [
    "Pending",
    "Under Review",
    "In Progress",
    "Resolved",
    "Rejected",
  ];

  const categoryData = categories.map((category) => ({
    name: category,
    reports: issues.filter((issue) => issue.category === category).length,
  }));

  const priorityData = priorities.map((priority) => ({
    name: priority,
    reports: issues.filter((issue) => issue.priority === priority).length,
  }));

  const statusData = statuses.map((status) => ({
    name: status,
    reports: issues.filter((issue) => issue.status === status).length,
  }));

  const totalReports = issues.length;

  return (
    <section className="analytics-section">
      <div className="analytics-heading">
        <h2>📊 Civic Issue Analytics</h2>
        <p>Visual overview of reported civic issues.</p>
        <h3>Total Reports: {totalReports}</h3>
      </div>

      <div className="analytics-grid">

        {/* CATEGORY CHART */}
        <div className="analytics-card">
          <h3>Reports by Category</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-20}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="reports"
                name="Reports"
                radius={[6, 6, 0, 0]}
              >
                {categoryData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={CATEGORY_COLORS[index]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PRIORITY CHART */}
        <div className="analytics-card">
          <h3>Reports by Priority</h3>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priorityData}
                dataKey="reports"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={95}
                label
              >
                {priorityData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={PRIORITY_COLORS[entry.name]}
                  />
                ))}
              </Pie>

              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* STATUS CHART */}
        <div className="analytics-card">
          <h3>Reports by Status</h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-15}
                textAnchor="end"
                height={65}
                interval={0}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="reports"
                name="Reports"
                radius={[6, 6, 0, 0]}
              >
                {statusData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </section>
  );
}

export default AnalyticsCharts;