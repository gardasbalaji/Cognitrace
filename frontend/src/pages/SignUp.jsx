import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import cogniLogo from '../assets/cognitrace-showcase.png';

export default function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, register, googleLogin } = useAuth();

  // Role toggle: 'student' | 'faculty'
  const initialRole = searchParams.get('role') === 'faculty' ? 'faculty' : 'student';
  const [activeRole, setActiveRole] = useState(initialRole);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [googleError, setGoogleError] = useState('');

  // Ref to track whether this component instance is still mounted
  const mountedRef = useRef(true);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Student registration details
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    studentId: '',
    age: '',
    course: '',
    college: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Faculty registration details
  const [facultyForm, setFacultyForm] = useState({
    fullName: '',
    employeeId: '',
    designation: '',
    department: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // First-time Google registration profile completion
  const [pendingGoogle, setPendingGoogle] = useState(null); // { id_token, email, full_name }
  const [googleRole, setGoogleRole] = useState(initialRole);
  const [googleStudentFields, setGoogleStudentFields] = useState({
    studentId: '',
    age: '',
    course: '',
    college: '',
    phone: '',
  });
  const [googleFacultyFields, setGoogleFacultyFields] = useState({
    employeeId: '',
    designation: '',
    department: '',
    phone: '',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      if (user.role === 'student') {
        navigate('/student/dashboard', { replace: true });
      } else if (user.role === 'faculty') {
        navigate('/faculty/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Handle Google OAuth Credential response
  const handleGoogleCredentialResponse = useCallback(
    async (response) => {
      if (!response?.credential) return;

      setLoading(true);
      setErrorMessage('');

      try {
        const res = await googleLogin({ id_token: response.credential });

        if (res?.needs_profile) {
          setPendingGoogle({
            id_token: response.credential,
            email: res.email,
            full_name: res.full_name,
          });
          setGoogleRole(activeRole);
        } else if (res?.user?.role) {
          if (res.user.role === 'student') {
            navigate('/student/dashboard');
          } else {
            navigate('/faculty/dashboard');
          }
        }
      } catch (err) {
        setErrorMessage(err.message || 'Google authentication failed.');
      } finally {
        setLoading(false);
      }
    },
    [activeRole, googleLogin, navigate]
  );

  // Initialize Google Identity Services button
  const initializeGoogleButton = useCallback(
    (clientId) => {
      if (!window.google?.accounts?.id) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });

        const btnContainer = document.getElementById('googleSignUpBtn');
        if (btnContainer) {
          btnContainer.innerHTML = '';
          window.google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            text: 'signup_with',
            shape: 'pill',
            width: 300,
          });
        }
      } catch (err) {
        console.error('Error initializing Google Button:', err);
      }
    },
    [handleGoogleCredentialResponse]
  );

  // Set mountedRef false on unmount so async callbacks skip stale DOM access
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load / attach to Google Identity Services SDK
  useEffect(() => {
    if (pendingGoogle) return;

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) return;

    const existingScript = document.getElementById('google-client-script');

    if (window.google?.accounts?.id) {
      initializeGoogleButton(googleClientId);
    } else if (existingScript) {
      const onLoad = () => {
        if (mountedRef.current) initializeGoogleButton(googleClientId);
      };
      const onError = () => {
        if (mountedRef.current) setGoogleError('Google Sign-Up could not be loaded.');
      };
      existingScript.addEventListener('load', onLoad);
      existingScript.addEventListener('error', onError);
      return () => {
        existingScript.removeEventListener('load', onLoad);
        existingScript.removeEventListener('error', onError);
      };
    } else {
      const script = document.createElement('script');
      script.id = 'google-client-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', () => {
        if (mountedRef.current) initializeGoogleButton(googleClientId);
      });
      script.addEventListener('error', () => {
        if (mountedRef.current) setGoogleError('Google Sign-Up could not be loaded.');
      });
      document.body.appendChild(script);
    }
  }, [initializeGoogleButton, pendingGoogle]);

  // Handler: Student Registration Submit
  const handleStudentRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!studentForm.fullName.trim() || !studentForm.studentId.trim() || !studentForm.age) {
      setErrorMessage('Full name, Student ID, and age are required.');
      return;
    }

    if (!studentForm.email.trim() || !studentForm.password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    if (studentForm.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (studentForm.password !== studentForm.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role: 'student',
        full_name: studentForm.fullName.trim(),
        email: studentForm.email.trim(),
        password: studentForm.password,
        phone: studentForm.phone.trim() || null,
        student_id: studentForm.studentId.trim(),
        age: parseInt(studentForm.age, 10),
        course: studentForm.course.trim() || null,
        college: studentForm.college.trim() || null,
      };

      await register(payload);
      navigate('/student/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Student registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Faculty Registration Submit
  const handleFacultyRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!facultyForm.fullName.trim() || !facultyForm.employeeId.trim()) {
      setErrorMessage('Full name and Employee ID are required.');
      return;
    }

    if (!facultyForm.email.trim() || !facultyForm.password) {
      setErrorMessage('Email and password are required.');
      return;
    }

    if (facultyForm.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (facultyForm.password !== facultyForm.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role: 'faculty',
        full_name: facultyForm.fullName.trim(),
        email: facultyForm.email.trim(),
        password: facultyForm.password,
        phone: facultyForm.phone.trim() || null,
        employee_id: facultyForm.employeeId.trim(),
        designation: facultyForm.designation.trim() || null,
        department: facultyForm.department.trim() || null,
      };

      await register(payload);
      navigate('/faculty/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Faculty registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Google Registration Completion
  const handleGoogleSetupSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!pendingGoogle?.id_token) {
      setErrorMessage('Google session expired. Please sign in again.');
      setPendingGoogle(null);
      return;
    }

    if (googleRole === 'student') {
      if (!googleStudentFields.studentId.trim() || !googleStudentFields.age) {
        setErrorMessage('Student ID and age are required.');
        return;
      }
    } else {
      if (!googleFacultyFields.employeeId.trim()) {
        setErrorMessage('Employee ID is required.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        id_token: pendingGoogle.id_token,
        role: googleRole,
        phone:
          (googleRole === 'student'
            ? googleStudentFields.phone
            : googleFacultyFields.phone
          )?.trim() || null,
        ...(googleRole === 'student'
          ? {
              student_id: googleStudentFields.studentId.trim(),
              age: parseInt(googleStudentFields.age, 10),
              course: googleStudentFields.course.trim() || null,
              college: googleStudentFields.college.trim() || null,
            }
          : {
              employee_id: googleFacultyFields.employeeId.trim(),
              designation: googleFacultyFields.designation.trim() || null,
              department: googleFacultyFields.department.trim() || null,
            }),
      };

      const res = await googleLogin(payload);
      if (res?.user?.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/faculty/dashboard');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Google profile completion failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-800 font-sans flex flex-col lg:flex-row-reverse selection:bg-black selection:text-white">
      {/* ========================================================= */}
      {/* LEFT COLUMN: Clean Minimalist Form Area (50% Width)       */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center px-6 py-10 sm:px-10 lg:px-16 relative overflow-y-auto">
        <div className="w-full max-w-[500px] space-y-5 my-auto">
          {/* Header */}
          <div className="space-y-2 text-left">
            <h1 className="font-outfit text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Create an account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
              Select your academic role to proceed with CogniTrace.
            </p>
          </div>

          {/* Role Switcher Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveRole('student');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeRole === 'student'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-slate-500 hover:text-black'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Student Registration
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveRole('faculty');
                setErrorMessage('');
              }}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeRole === 'faculty'
                  ? 'bg-black text-white shadow-sm'
                  : 'text-slate-500 hover:text-black'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Faculty Registration
            </button>
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            {activeRole === 'student'
              ? 'Student accounts feature personalized confusion telemetry & contextual AI summaries.'
              : 'Open registration for all educators and teaching assistants. No approval required.'}
          </p>

          {/* Global Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700 text-left animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Google SDK load failure */}
          {googleError && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-800 text-left">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="font-medium">{googleError}</span>
            </div>
          )}

          {/* MAIN REGISTRATION FORM */}
          {!pendingGoogle ? (
            <div className="space-y-4 text-left">

                {/* STUDENT FORM */}
                {activeRole === 'student' && (
                  <form onSubmit={handleStudentRegisterSubmit} className="space-y-3.5 pt-1">
                    {/* Full Name & Student ID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={studentForm.fullName}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, fullName: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] transition-all outline-none font-medium"
                          placeholder="Alex Mercer"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Student ID *
                        </label>
                        <input
                          type="text"
                          value={studentForm.studentId}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, studentId: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] transition-all outline-none font-medium"
                          placeholder="STU-10492"
                          required
                        />
                      </div>
                    </div>

                    {/* Age & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Age *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={studentForm.age}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, age: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] transition-all outline-none font-medium"
                          placeholder="21"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={studentForm.phone}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, phone: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] transition-all outline-none font-medium"
                          placeholder="+1 555 019 2831"
                        />
                      </div>
                    </div>

                    {/* Course & College */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Course / Major
                        </label>
                        <input
                          type="text"
                          value={studentForm.course}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, course: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] transition-all outline-none font-medium"
                          placeholder="Computer Science"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          College / University
                        </label>
                        <input
                          type="text"
                          value={studentForm.college}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, college: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] transition-all outline-none font-medium"
                          placeholder="Engineering Institute"
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                        Email Address *
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={studentForm.email}
                          onChange={(e) =>
                            setStudentForm({ ...studentForm, email: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] pl-10 transition-all outline-none font-medium"
                          placeholder="alex@university.edu"
                          required
                        />
                        <Mail className="h-4 w-4 absolute left-3.5 top-3 text-[#6c8e85]" />
                      </div>
                    </div>

                    {/* Password & Confirm */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Password * (min 8)
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={studentForm.password}
                            onChange={(e) =>
                              setStudentForm({ ...studentForm, password: e.target.value })
                            }
                            className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] pl-10 pr-9 transition-all outline-none font-medium"
                            placeholder="••••••••"
                            required
                          />
                          <Lock className="h-4 w-4 absolute left-3.5 top-3 text-[#6c8e85]" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-[#6c8e85] hover:text-[#0f2e28]"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Confirm Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={studentForm.confirmPassword}
                            onChange={(e) =>
                              setStudentForm({
                                ...studentForm,
                                confirmPassword: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] pl-10 pr-9 transition-all outline-none font-medium"
                            placeholder="••••••••"
                            required
                          />
                          <Lock className="h-4 w-4 absolute left-3.5 top-3 text-[#6c8e85]" />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3 text-[#6c8e85] hover:text-[#0f2e28]"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-black hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-full text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                          Creating Student Account...
                        </>
                      ) : (
                        'Register Student Account'
                      )}
                    </button>
                  </form>
                )}

                {/* FACULTY FORM */}
                {activeRole === 'faculty' && (
                  <form onSubmit={handleFacultyRegisterSubmit} className="space-y-3.5 pt-1">
                    {/* Full Name & Employee ID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={facultyForm.fullName}
                          onChange={(e) =>
                            setFacultyForm({ ...facultyForm, fullName: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] transition-all outline-none font-medium"
                          placeholder="Prof. Eleanor Vance"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Employee ID *
                        </label>
                        <input
                          type="text"
                          value={facultyForm.employeeId}
                          onChange={(e) =>
                            setFacultyForm({ ...facultyForm, employeeId: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] transition-all outline-none font-medium"
                          placeholder="FAC-8021"
                          required
                        />
                      </div>
                    </div>

                    {/* Designation & Department */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={facultyForm.designation}
                          onChange={(e) =>
                            setFacultyForm({ ...facultyForm, designation: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] transition-all outline-none font-medium"
                          placeholder="Associate Professor"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Department
                        </label>
                        <input
                          type="text"
                          value={facultyForm.department}
                          onChange={(e) =>
                            setFacultyForm({ ...facultyForm, department: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] transition-all outline-none font-medium"
                          placeholder="Computer Science"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={facultyForm.phone}
                        onChange={(e) =>
                          setFacultyForm({ ...facultyForm, phone: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] transition-all outline-none font-medium"
                        placeholder="+1 555 491 0284"
                      />
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                        Email Address *
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={facultyForm.email}
                          onChange={(e) =>
                            setFacultyForm({ ...facultyForm, email: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] pl-10 transition-all outline-none font-medium"
                          placeholder="evance@university.edu"
                          required
                        />
                        <Mail className="h-4 w-4 absolute left-3.5 top-3 text-[#6c8e85]" />
                      </div>
                    </div>

                    {/* Password & Confirm */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Password * (min 8)
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={facultyForm.password}
                            onChange={(e) =>
                              setFacultyForm({ ...facultyForm, password: e.target.value })
                            }
                            className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] pl-10 pr-9 transition-all outline-none font-medium"
                            placeholder="••••••••"
                            required
                          />
                          <Lock className="h-4 w-4 absolute left-3.5 top-3 text-[#6c8e85]" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-[#6c8e85] hover:text-[#0f2e28]"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Confirm Password *
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={facultyForm.confirmPassword}
                            onChange={(e) =>
                              setFacultyForm({
                                ...facultyForm,
                                confirmPassword: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 bg-[#f8fcfa] hover:bg-white focus:bg-white rounded-xl border border-[#d2e5e0] focus:border-[#0d6e63] focus:ring-4 focus:ring-[#0d6e63]/10 text-xs text-[#0f2e28] placeholder-[#90a8a1] pl-10 pr-9 transition-all outline-none font-medium"
                            placeholder="••••••••"
                            required
                          />
                          <Lock className="h-4 w-4 absolute left-3.5 top-3 text-[#6c8e85]" />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3 text-[#6c8e85] hover:text-[#0f2e28]"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-black hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-full text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                          Creating Faculty Account...
                        </>
                      ) : (
                        'Register Faculty Account'
                      )}
                    </button>
                  </form>
                )}

                {/* Google Authentication Section */}
                <div className="relative pt-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-slate-400 font-medium">
                      or register with
                    </span>
                  </div>
                </div>

                <div className="flex justify-center pt-1 min-h-[44px]">
                  <div id="googleSignUpBtn" className="flex justify-center w-full" />
                </div>

                {/* Link to Sign In */}
                <div className="pt-2 text-xs text-slate-500 text-center">
                  Already have an account?{' '}
                  <Link
                    to="/signin"
                    className="text-slate-900 font-bold hover:underline ml-1"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            ) : (
              /* ========================================================= */
              /* FIRST-TIME GOOGLE PROFILE SETUP                           */
              /* ========================================================= */
              <div className="bg-white rounded-3xl border border-[#dfece8] shadow-[0_12px_40px_-10px_rgba(13,110,99,0.08)] p-6 sm:p-8 space-y-5 text-left animate-fadeIn">
                <div className="text-center space-y-1.5">
                  <div className="h-10 w-10 rounded-full bg-[#e6f6f2] flex items-center justify-center mx-auto mb-2 text-[#0d6e63] border border-[#cdebe3]">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <h2 className="font-outfit text-xl font-bold text-[#0f2e28]">
                    Complete Your Profile
                  </h2>
                  <p className="text-xs text-[#52736c]">
                    Google account verified as{' '}
                    <span className="text-[#0f2e28] font-semibold">{pendingGoogle.email}</span>.
                    Select your CogniTrace role:
                  </p>
                </div>

                <form onSubmit={handleGoogleSetupSubmit} className="space-y-4">
                  {/* Role Radio Picker */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                      Select Role *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setGoogleRole('student')}
                        className={`py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          googleRole === 'student'
                            ? 'bg-[#e6f6f2] border-[#0d6e63] text-[#0d6e63] shadow-sm font-bold'
                            : 'bg-[#f8fcfa] border-[#d2e5e0] text-[#5c7c74]'
                        }`}
                      >
                        <UserCheck className="h-4 w-4" />
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setGoogleRole('faculty')}
                        className={`py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          googleRole === 'faculty'
                            ? 'bg-[#e6f6f2] border-[#0d6e63] text-[#0d6e63] shadow-sm font-bold'
                            : 'bg-[#f8fcfa] border-[#d2e5e0] text-[#5c7c74]'
                        }`}
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Faculty
                      </button>
                    </div>
                  </div>

                  {/* Student Role Fields */}
                  {googleRole === 'student' && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                            Student ID *
                          </label>
                          <input
                            type="text"
                            value={googleStudentFields.studentId}
                            onChange={(e) =>
                              setGoogleStudentFields({
                                ...googleStudentFields,
                                studentId: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 bg-[#f8fcfa] rounded-xl border border-[#d2e5e0] focus:outline-none focus:border-[#0d6e63] text-xs text-[#0f2e28] placeholder-[#90a8a1]"
                            placeholder="STU-101"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                            Age *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={googleStudentFields.age}
                            onChange={(e) =>
                              setGoogleStudentFields({
                                ...googleStudentFields,
                                age: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 bg-[#f8fcfa] rounded-xl border border-[#d2e5e0] focus:outline-none focus:border-[#0d6e63] text-xs text-[#0f2e28] placeholder-[#90a8a1]"
                            placeholder="21"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                            Course
                          </label>
                          <input
                            type="text"
                            value={googleStudentFields.course}
                            onChange={(e) =>
                              setGoogleStudentFields({
                                ...googleStudentFields,
                                course: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 bg-[#f8fcfa] rounded-xl border border-[#d2e5e0] focus:outline-none focus:border-[#0d6e63] text-xs text-[#0f2e28] placeholder-[#90a8a1]"
                            placeholder="Computer Science"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                            College
                          </label>
                          <input
                            type="text"
                            value={googleStudentFields.college}
                            onChange={(e) =>
                              setGoogleStudentFields({
                                ...googleStudentFields,
                                college: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 bg-[#f8fcfa] rounded-xl border border-[#d2e5e0] focus:outline-none focus:border-[#0d6e63] text-xs text-[#0f2e28] placeholder-[#90a8a1]"
                            placeholder="Engineering"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={googleStudentFields.phone}
                          onChange={(e) =>
                            setGoogleStudentFields({
                              ...googleStudentFields,
                              phone: e.target.value,
                            })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] rounded-xl border border-[#d2e5e0] focus:outline-none focus:border-[#0d6e63] text-xs text-[#0f2e28] placeholder-[#90a8a1]"
                          placeholder="+1 555 019 2831"
                        />
                      </div>
                    </>
                  )}

                  {/* Faculty Role Fields */}
                  {googleRole === 'faculty' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Employee ID *
                        </label>
                        <input
                          type="text"
                          value={googleFacultyFields.employeeId}
                          onChange={(e) =>
                            setGoogleFacultyFields({
                              ...googleFacultyFields,
                              employeeId: e.target.value,
                            })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] rounded-xl border border-[#d2e5e0] focus:outline-none focus:border-[#0d6e63] text-xs text-[#0f2e28] placeholder-[#90a8a1]"
                          placeholder="FAC-801"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                            Designation
                          </label>
                          <input
                            type="text"
                            value={googleFacultyFields.designation}
                            onChange={(e) =>
                              setGoogleFacultyFields({
                                ...googleFacultyFields,
                                designation: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 bg-[#f8fcfa] rounded-xl border border-[#d2e5e0] focus:outline-none focus:border-[#0d6e63] text-xs text-[#0f2e28] placeholder-[#90a8a1]"
                            placeholder="Associate Professor"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                            Department
                          </label>
                          <input
                            type="text"
                            value={googleFacultyFields.department}
                            onChange={(e) =>
                              setGoogleFacultyFields({
                                ...googleFacultyFields,
                                department: e.target.value,
                              })
                            }
                            className="w-full px-3.5 py-2.5 bg-[#f8fcfa] rounded-xl border border-[#d2e5e0] focus:outline-none focus:border-[#0d6e63] text-xs text-[#0f2e28] placeholder-[#90a8a1]"
                            placeholder="Computer Science"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#486b62] font-bold uppercase tracking-wider block">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={googleFacultyFields.phone}
                          onChange={(e) =>
                            setGoogleFacultyFields({
                              ...googleFacultyFields,
                              phone: e.target.value,
                            })
                          }
                          className="w-full px-3.5 py-2.5 bg-[#f8fcfa] rounded-xl border border-[#d2e5e0] focus:outline-none focus:border-[#0d6e63] text-xs text-[#0f2e28] placeholder-[#90a8a1]"
                          placeholder="+1 555 491 0284"
                        />
                      </div>
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setPendingGoogle(null)}
                      className="flex-1 py-2.5 bg-[#f8fcfa] border border-[#d2e5e0] hover:bg-[#edf6f4] text-[#486b62] font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-[#0d6e63] hover:bg-[#0a5850] disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-[#0d6e63]/25 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Complete Setup
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: Light Mint Rounded Illustration Card        */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full h-full min-h-[560px] lg:min-h-full bg-[#f0f7f3] rounded-[36px] sm:rounded-[44px] p-6 sm:p-10 lg:p-12 flex flex-col justify-between items-center text-center relative overflow-hidden border border-[#e1eee6]">
          {/* Top Bar with Brand Badge & Telemetry Badge */}
          <div className="w-full flex items-center justify-between z-10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200/60 shadow-sm">
              <GraduationCap className="h-4 w-4 text-[#0d6e63]" />
              <span className="font-outfit font-bold text-slate-900">Cogni<span className="text-[#0d6e63]">Trace</span></span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-100/90 text-emerald-800 border border-emerald-200/70">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>

          {/* Center Illustration Area */}
          <div className="relative my-auto py-8 flex flex-col items-center justify-center w-full max-w-[420px]">
            <div className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-square flex items-center justify-center">
              <img
                src={cogniLogo}
                alt="CogniTrace Showcase"
                className="w-full h-auto max-h-[340px] object-contain drop-shadow-xl transition-transform duration-500 hover:scale-[1.02]"
              />
            </div>
          </div>

          {/* Carousel Pagination Dots */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="w-6 h-2 rounded-full bg-black" />
            <span className="w-2 h-2 rounded-full bg-slate-300" />
          </div>

          {/* Bottom Title & Subtitle */}
          <div className="space-y-1.5 max-w-md pb-2">
            <h2 className="font-outfit text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              Make your learning easier and organized with <span className="text-[#0d6e63]">CogniTrace</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Intelligent learning analytics, cohort confusion telemetry, and AI revision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
