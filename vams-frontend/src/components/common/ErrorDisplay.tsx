interface ErrorDisplayProps {
  message: string | null;
}

const ErrorDisplay = ({ message }: ErrorDisplayProps) => {
  if (!message) return null;

  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      {message}
    </div>
  );
};

export default ErrorDisplay;
