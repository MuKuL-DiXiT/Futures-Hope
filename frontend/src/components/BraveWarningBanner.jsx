import { useEffect, useState } from "react";

export default function BraveWarningBanner() {
  const [isBrave, setIsBrave] = useState(false);

  useEffect(() => {
    navigator.brave?.isBrave?.().then((res) => {
      if (res) setIsBrave(true);
    });
  }, []);

  if (!isBrave) return null;

  return (
    <div className="bg-yellow-500 text-black text-sm p-3 text-center shadow-md fixed top-0 w-full z-50">
      <strong>Brave Browser Detected:</strong> Please <span className="font-semibold">allow cookies</span> or use <span className="font-semibold">Chrome</span> to continue.
    </div>
  );
}
