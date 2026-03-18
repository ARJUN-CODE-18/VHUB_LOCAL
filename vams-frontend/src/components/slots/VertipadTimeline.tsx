interface SlotTimelineItem {
  vertipad: string;
  aircraft?: string;
  start: string;
  end: string;
}

interface VertipadTimelineProps {
  slots: SlotTimelineItem[];
}

const VertipadTimeline = ({ slots }: VertipadTimelineProps) => {
  return (
    <div className="bg-white shadow rounded-lg p-4 mt-6">
      <h2 className="text-lg font-bold mb-4 text-gray-900">Vertipad Timeline</h2>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-700">
            <th className="text-left pb-2">Vertipad</th>
            <th className="text-left pb-2">Aircraft</th>
            <th className="text-left pb-2">Start</th>
            <th className="text-left pb-2">End</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, index) => (
            <tr key={index} className="border-t border-gray-100">
              <td className="py-2">{slot.vertipad}</td>
              <td
                className={`py-2 ${
                  slot.aircraft ? 'text-green-600 font-semibold' : 'text-gray-500'
                }`}
              >
                {slot.aircraft ?? 'AVAILABLE'}
              </td>
              <td className="py-2">{slot.start}</td>
              <td className="py-2">{slot.end}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VertipadTimeline;
