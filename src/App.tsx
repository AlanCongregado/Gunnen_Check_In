import { Route, Routes, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AthleteHome from "./pages/AthleteHome";
import ReserveClass from "./pages/ReserveClass";
import QRScan from "./pages/QRScan";
import SelectClass from "./pages/SelectClass";
import ConfirmCheckIn from "./pages/ConfirmCheckIn";
import AttendanceHistory from "./pages/AttendanceHistory";
import CoachDashboard from "./pages/CoachDashboard";
import ClassDetails from "./pages/ClassDetails";
import AttendanceList from "./pages/AttendanceList";
import ProtectedRoute from "./routes/ProtectedRoute";
import MyReservations from "./pages/MyReservations";
import CoachQR from "./pages/CoachQR";
import PublicRoute from "./routes/PublicRoute";
import RootRedirect from "./routes/RootRedirect";
import CoachClasses from "./pages/CoachClasses";
import CoachEditClass from "./pages/CoachEditClass";
import AuthDebug from "./components/AuthDebug";
import ResetSession from "./pages/ResetSession";
import Profile from "./pages/Profile";
import StudentDirectory from "./pages/StudentDirectory";
import ReportInjury from "./pages/ReportInjury";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAthletes from "./pages/AdminAthletes";

const Placeholder = ({ title }: { title: string }) => (
  <div className="min-h-screen p-4 sm:p-6">
    <div className="max-w-md mx-auto rounded-xl card p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-[#6a6f57]">
        Pantalla en construcción.
      </p>
    </div>
  </div>
);

export default function App() {
  const { search } = useLocation();
  const showDebug = search.includes("debug=1");

  return (
    <>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/reset" element={<ResetSession />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/athlete"
          element={
            <ProtectedRoute role="athlete">
              <AthleteHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reserve"
          element={
            <ProtectedRoute role="athlete">
              <ReserveClass />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute role="athlete">
              <QRScan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/select-class"
          element={
            <ProtectedRoute role="athlete">
              <SelectClass />
            </ProtectedRoute>
          }
        />
        <Route
          path="/confirm"
          element={
            <ProtectedRoute role="athlete">
              <ConfirmCheckIn />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute role="athlete">
              <AttendanceHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-reservations"
          element={
            <ProtectedRoute role="athlete">
              <MyReservations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach"
          element={
            <ProtectedRoute role="coach">
              <CoachDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach/class/:id"
          element={
            <ProtectedRoute role="coach">
              <ClassDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach/class/:id/attendance"
          element={
            <ProtectedRoute role="coach">
              <AttendanceList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach/classes"
          element={
            <ProtectedRoute role="coach">
              <CoachClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach/classes/:id/edit"
          element={
            <ProtectedRoute role="coach">
              <CoachEditClass />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach/students"
          element={
            <ProtectedRoute role={["coach", "admin"]}>
              <StudentDirectory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/athletes"
          element={
            <ProtectedRoute role="admin">
              <AdminAthletes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach/qr"
          element={
            <ProtectedRoute role="coach">
              <CoachQR />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report-injury"
          element={
            <ProtectedRoute role="athlete">
              <ReportInjury />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Placeholder title="Página no encontrada" />} />
      </Routes>
      {showDebug && <AuthDebug />}
    </>
  );
}
