import { useState } from "react";

type Props = {
  message: string;
  details?: string | null;
};

export default function ErrorDetails({ message, details }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span>{message}</span>
        {details && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs underline"
          >
            {open ? "Ocultar" : "Ver detalle"}
          </button>
        )}
      </div>
      {details && open && (
        <pre className="whitespace-pre-wrap text-xs text-red-700 bg-red-100 p-2 rounded">
          {details}
        </pre>
      )}
    </div>
  );
}
