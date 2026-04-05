export default function UpdateTable({ updates }) {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700";
      case "BLOCKED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="bg-white shadow rounded-xl p-5 mt-6 overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4">Updates</h2>

      {updates?.length === 0 ? (
        <p className="text-gray-500 text-center py-6">No updates found</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-2">User</th>
              <th className="text-left py-3 px-2">Description</th>
              <th className="text-center py-3 px-2">Hours</th>
              <th className="text-center py-3 px-2">Status</th>
              <th className="text-center py-3 px-2">Date</th>
            </tr>
          </thead>

          <tbody>
            {updates?.map((item) => (
              <tr key={item._id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2">
                  <span className="font-medium">{item.userId?.name || "N/A"}</span>
                </td>
                <td className="py-3 px-2 text-sm">{item.description}</td>
                <td className="text-center py-3 px-2">{item.hours}h</td>
                <td className="text-center py-3 px-2">
                  <span className={`px-3 py-1 rounded text-sm ${getStatusBadgeColor(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="text-center py-3 px-2 text-sm">
                  {formatDate(item.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}