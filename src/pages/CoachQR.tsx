import QrCodeCard from "../components/QrCodeCard";
import TopNav from "../components/TopNav";
import { signOut } from "../lib/auth";

export default function CoachQR() {
  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <TopNav role="coach" onSignOut={() => signOut()} />
        <header className="space-y-2 no-print">
          <h1 className="text-2xl font-semibold">QR del box</h1>
          <p className="text-sm text-[#6a6f57]">
            Comparte este QR para que los atletas hagan check-in.
          </p>
        </header>

        <QrCodeCard />
      </div>
    </div>
  );
}
