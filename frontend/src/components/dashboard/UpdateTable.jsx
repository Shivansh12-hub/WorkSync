import { MessageSquare, Eye } from "lucide-react";

export default function UpdateTable({
  updates,
  onSelectUpdate,
  showActions,
  showFeedbackButton,
}) {
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

  const showActionColumn = showActions || showFeedbackButton;

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
              {showActionColumn && <th className="text-center py-3 px-2">Action</th>}
            </tr>
          </thead>

          <tbody>
            {updates?.map((item) => (
              <tr
                key={item._id}
                className={`border-b ${
                  showActionColumn ? "hover:bg-gray-50 cursor-pointer" : ""
                }`}
              >
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
                {showActionColumn && (
                  <td className="text-center py-3 px-2">
                    {showFeedbackButton ? (
                      <button
                        onClick={() => onSelectUpdate && onSelectUpdate(item)}
                        className="inline-flex items-center gap-2 text-green-600 hover:text-green-900 font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        View Feedback
                      </button>
                    ) : (
                      <button
                        onClick={() => onSelectUpdate && onSelectUpdate(item)}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-900 font-medium"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Feedback
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}