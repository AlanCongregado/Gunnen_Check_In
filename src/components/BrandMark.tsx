import { useState } from "react";

export default function BrandMark({
  size = 48
}: {
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full border-2 border-[#31470b] flex items-center justify-center text-[#31470b] font-semibold"
      >
        G
      </div>
    );
  }

  return (
    <img
      src="/assets/gunnen-logo.png"
      alt="Gunnen"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="rounded-full border-2 border-[#31470b] object-contain"
    />
  );
}
