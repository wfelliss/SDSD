import { WifiOff, RefreshCw } from "lucide-react"; 

const Maintenance = () => {
  const handleRetry = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-100 p-4 font-sans">
      
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-zinc-200">
        
        <div className="flex justify-center mb-6">
          <div className="bg-rose-50 p-4 rounded-full">
            <WifiOff className="w-10 h-10 text-rose-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 mb-2">
          Service Unavailable
        </h1>
        
        <p className="text-zinc-500 mb-8 leading-relaxed">
          We are currently having trouble connecting to our servers.
          <br className="hidden sm:block" />
          Please check back in a few moments.
        </p>

        <button
          onClick={handleRetry}
          className="group w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98]"
        >
          <RefreshCw className="w-5 h-5 transition-transform duration-500 group-hover:rotate-180" />
          Retry Connection
        </button>
      </div>
    </div>
  );
};

export default Maintenance;