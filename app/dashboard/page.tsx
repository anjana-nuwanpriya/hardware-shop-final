export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Today's Sales" value="LKR 0" />
        <Card title="Total Receivables" value="LKR 0" />
        <Card title="Total Payables" value="LKR 0" />
        <Card title="Low Stock Items" value="0" />
      </div>

      <div className="mt-8 p-6 bg-white rounded-lg shadow">
        <p className="text-gray-600">
          More dashboard features coming soon...
        </p>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}
