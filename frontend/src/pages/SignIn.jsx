import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  X,
  AlertCircle,
  CheckCircle,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import cogniLogo from '../assets/cognitrace-showcase.png';

export default function SignIn() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, googleLogin } = useAuth();

  // Role slider: 'student' | 'faculty' (visual role toggle)
  const [activeRole, setActiveRole] = useState('student');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [googleError, setGoogleError] = useState('');

  // Ref to track whether this component instance is still mounted
  const mountedRef = useRef(true);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState({ loading: false, msg: '', error: false });

  // First-time Google registration profile completion
  const [pendingGoogle, setPendingGoogle] = useState(null); // { id_token, email, full_name }
  const [googleRole, setGoogleRole] = useState('student');
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
          // First-time Google user: prompt for role and required profile details
          setPendingGoogle({
            id_token: response.credential,
            email: res.email,
            full_name: res.full_name,
          });
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
    [googleLogin, navigate]
  );

  // Initialize Google Identity Services button
  const initializeGoogleButton = useCallback(
    (clientId) => {
      if (!window.google?.accounts?.id) return false;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        });

        const btnContainer = document.getElementById('googleSignInBtn');
        if (btnContainer) {
          btnContainer.innerHTML = '';
          window.google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width: 300,
          });
          setGoogleError('');
          return true;
        }
      } catch (err) {
        console.error('Error initializing Google Button:', err);
        setGoogleError('Google Sign-In initialization failed.');
      }
      return false;
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
    if (pendingGoogle) return; // Google button not needed during profile setup

    const googleClientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '665689614355-pftf1b4otha1kvi53n0vsruh25vmjqh6.apps.googleusercontent.com';

    let intervalId = null;
    let attempts = 0;

    const tryInit = () => {
      if (!mountedRef.current) return;
      if (window.google?.accounts?.id) {
        const rendered = initializeGoogleButton(googleClientId);
        if (rendered && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    // Try immediately
    tryInit();

    // If script is loading or DOM container is mounting, poll briefly
    intervalId = setInterval(() => {
      attempts++;
      tryInit();
      if (attempts > 30) {
        if (intervalId) clearInterval(intervalId);
        if (!window.google?.accounts?.id && mountedRef.current) {
          setGoogleError('Google Sign-In could not be loaded. Please check your connection or ad blocker.');
        }
      }
    }, 200);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [initializeGoogleButton, pendingGoogle]);

  // Handler: Email & Password Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      if (loggedInUser.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/faculty/dashboard');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Google Registration Completion (for first-time Google sign-in)
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

  // Handler: Forgot Password Request
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotStatus({ loading: true, msg: '', error: false });
    try {
      const res = await authAPI.forgotPassword(forgotEmail.trim());
      setForgotStatus({
        loading: false,
        msg: res.message || 'Password reset link dispatched if an account exists.',
        error: false,
      });
    } catch (err) {
      setForgotStatus({
        loading: false,
        msg: err.message || 'Password reset request failed.',
        error: true,
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F8F2] text-[#26332A] font-sans flex flex-col lg:flex-row-reverse selection:bg-[#315C46] selection:text-white">
      {/* ========================================================= */}
      {/* LEFT COLUMN: Clean Minimalist Form Area (50% Width)       */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center px-6 py-10 sm:px-12 lg:px-20 relative">
        <div className="w-full max-w-[420px] space-y-6">
          {/* Header matching the reference */}
          <div className="space-y-2 text-left">
            <h1 className="font-outfit text-3xl sm:text-4xl font-extrabold text-[#26332A] tracking-tight">
              Welcome back!
            </h1>
            <p className="text-xs sm:text-sm text-[#68766B] font-normal leading-relaxed">
              Simplify your workflow and boost your productivity with CogniTrace. Get started for free.
            </p>
          </div>

          {/* Student / Faculty Role Slider (Pill Toggle) */}
          <div className="flex bg-[#EFF1E7] p-1 rounded-full border border-[#D9E1D2]">
            <button
              type="button"
              onClick={() => setActiveRole('student')}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeRole === 'student'
                  ? 'bg-[#315C46] text-white shadow-sm'
                  : 'text-[#68766B] hover:text-black'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Student
            </button>
            <button
              type="button"
              onClick={() => setActiveRole('faculty')}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeRole === 'faculty'
                  ? 'bg-[#315C46] text-white shadow-sm'
                  : 'text-[#68766B] hover:text-black'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Faculty
            </button>
          </div>

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

          {/* SIGN IN FORM */}
          {!pendingGoogle ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
              {/* Username / Email Input */}
              <div className="space-y-1 text-left">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={activeRole === 'student' ? 'Student Email / Username' : 'Faculty Email / Username'}
                  className="w-full px-6 py-3.5 rounded-full border border-[#D9E1D2] bg-[#FCFCF8] focus:border-[#315C46] focus:ring-1 focus:ring-[#315C46] outline-none text-sm text-[#26332A] placeholder-[#879187] transition-all font-medium"
                  required
                  disabled={loading}
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 text-left">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-6 py-3.5 pr-12 rounded-full border border-[#D9E1D2] bg-[#FCFCF8] focus:border-[#315C46] focus:ring-1 focus:ring-[#315C46] outline-none text-sm text-[#26332A] placeholder-[#879187] transition-all font-medium"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-[#68766B] hover:text-[#68766B] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotEmail(email);
                    }}
                    className="text-xs text-[#68766B] hover:text-black font-semibold transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full bg-[#315C46] hover:bg-[#264B39] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#D9E1D2]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#F8F8F2] px-3 text-[#68766B] font-medium">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Google Button */}
              <div className="flex justify-center min-h-[44px]">
                <div id="googleSignInBtn" className="flex justify-center w-full" />
              </div>

              {/* Footer Switcher */}
              <div className="text-center text-xs text-[#68766B] pt-2">
                Not a member?{' '}
                <Link
                  to="/signup"
                  className="text-white hover:underline font-bold ml-1"
                >
                  Register now
                </Link>
              </div>
            </form>
            ) : (
              /* ========================================================= */
              /* FIRST-TIME GOOGLE PROFILE SETUP                           */
              /* ========================================================= */
              <div className="bg-[#F8F8F2] rounded-3xl border border-[#D9E1D2] shadow-[0_12px_40px_-10px_rgba(49,92,70,0.08)] p-6 sm:p-8 space-y-5 text-left animate-fadeIn">
                <div className="text-center space-y-1.5">
                  <div className="h-10 w-10 rounded-full bg-[#DCE8DC] flex items-center justify-center mx-auto mb-2 text-[#315C46] border border-[#D9E1D2]">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <h2 className="font-outfit text-xl font-bold text-[#26332A]">
                    Complete Your Profile
                  </h2>
                  <p className="text-xs text-[#68766B]">
                    Google account verified as{' '}
                    <span className="text-[#26332A] font-semibold">{pendingGoogle.email}</span>.
                    Select your CogniTrace role:
                  </p>
                </div>

                <form onSubmit={handleGoogleSetupSubmit} className="space-y-4">
                  {/* Role Radio Picker */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block">
                      Select Role *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setGoogleRole('student')}
                        className={`py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          googleRole === 'student'
                            ? 'bg-[#DCE8DC] border-[#315C46] text-[#315C46] shadow-sm font-bold'
                            : 'bg-[#FCFCF8] border-[#D9E1D2] text-[#68766B]'
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
                            ? 'bg-[#DCE8DC] border-[#315C46] text-[#315C46] shadow-sm font-bold'
                            : 'bg-[#FCFCF8] border-[#D9E1D2] text-[#68766B]'
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
                          <label className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block">
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
                            className="w-full px-3.5 py-2.5 bg-[#FCFCF8] rounded-xl border border-[#D9E1D2] focus:outline-none focus:border-[#315C46] text-xs text-[#26332A] placeholder-[#879187]"
                            placeholder="STU-101"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block">
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
                            className="w-full px-3.5 py-2.5 bg-[#FCFCF8] rounded-xl border border-[#D9E1D2] focus:outline-none focus:border-[#315C46] text-xs text-[#26332A] placeholder-[#879187]"
                            placeholder="21"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block">
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
                            className="w-full px-3.5 py-2.5 bg-[#FCFCF8] rounded-xl border border-[#D9E1D2] focus:outline-none focus:border-[#315C46] text-xs text-[#26332A] placeholder-[#879187]"
                            placeholder="Computer Science"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block">
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
                            className="w-full px-3.5 py-2.5 bg-[#FCFCF8] rounded-xl border border-[#D9E1D2] focus:outline-none focus:border-[#315C46] text-xs text-[#26332A] placeholder-[#879187]"
                            placeholder="Engineering"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block">
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
                          className="w-full px-3.5 py-2.5 bg-[#FCFCF8] rounded-xl border border-[#D9E1D2] focus:outline-none focus:border-[#315C46] text-xs text-[#26332A] placeholder-[#879187]"
                          placeholder="+1 555 019 2831"
                        />
                      </div>
                    </>
                  )}

                  {/* Faculty Role Fields */}
                  {googleRole === 'faculty' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block">
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
                          className="w-full px-3.5 py-2.5 bg-[#FCFCF8] rounded-xl border border-[#D9E1D2] focus:outline-none focus:border-[#315C46] text-xs text-[#26332A] placeholder-[#879187]"
                          placeholder="FAC-801"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block">
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
                            className="w-full px-3.5 py-2.5 bg-[#FCFCF8] rounded-xl border border-[#D9E1D2] focus:outline-none focus:border-[#315C46] text-xs text-[#26332A] placeholder-[#879187]"
                            placeholder="Associate Professor"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block">
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
                            className="w-full px-3.5 py-2.5 bg-[#FCFCF8] rounded-xl border border-[#D9E1D2] focus:outline-none focus:border-[#315C46] text-xs text-[#26332A] placeholder-[#879187]"
                            placeholder="Computer Science"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block">
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
                          className="w-full px-3.5 py-2.5 bg-[#FCFCF8] rounded-xl border border-[#D9E1D2] focus:outline-none focus:border-[#315C46] text-xs text-[#26332A] placeholder-[#879187]"
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
                      className="flex-1 py-2.5 bg-[#FCFCF8] border border-[#D9E1D2] hover:bg-[#E8EDE1] text-[#26332A] font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-[#315C46] hover:bg-[#264B39] disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-[#315C46]/25 flex items-center justify-center gap-1.5"
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

            {/* ========================================================= */}
            {/* FORGOT PASSWORD MODAL                                     */}
            {/* ========================================================= */}
            {showForgotModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
                <div className="bg-[#F8F8F2] max-w-sm w-full p-6 rounded-3xl border border-[#D9E1D2] shadow-2xl space-y-4 text-left relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotStatus({ loading: false, msg: '', error: false });
                    }}
                    className="absolute top-5 right-5 text-[#68766B] hover:text-[#26332A]"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="space-y-1">
                    <h3 className="font-outfit text-lg font-bold text-[#26332A]">
                      Reset Password
                    </h3>
                    <p className="text-xs text-[#68766B]">
                      Enter your email address to receive password reset instructions.
                    </p>
                  </div>

                  {forgotStatus.msg && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                        forgotStatus.error
                          ? 'bg-rose-50 border border-rose-200 text-rose-700'
                          : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      }`}
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{forgotStatus.msg}</span>
                    </div>
                  )}

                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#26332A] font-bold uppercase tracking-wider block">
                        Account Email
                      </label>
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#FCFCF8] rounded-xl border border-[#D9E1D2] focus:outline-none focus:border-[#315C46] text-xs text-[#26332A] placeholder-[#879187]"
                        placeholder="name@university.edu"
                        required
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotModal(false);
                          setForgotStatus({ loading: false, msg: '', error: false });
                        }}
                        className="flex-1 py-2.5 bg-[#FCFCF8] border border-[#D9E1D2] hover:bg-[#E8EDE1] text-[#26332A] font-semibold rounded-xl text-xs transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={forgotStatus.loading}
                        className="flex-1 py-2.5 bg-[#315C46] hover:bg-[#264B39] text-[#26332A] font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#315C46]/20"
                      >
                        {forgotStatus.loading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Send Link'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: Light Mint Rounded Illustration Card        */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full h-full min-h-[560px] lg:min-h-full bg-[#EFF1E7] rounded-[36px] sm:rounded-[44px] p-6 sm:p-10 lg:p-12 flex flex-col justify-between items-center text-center relative overflow-hidden border border-[#D9E1D2]">
          {/* Top Bar with Brand Badge & Telemetry Badge */}
          <div className="w-full flex items-center justify-between z-10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#26332A] bg-[#F8F8F2] backdrop-blur-md px-4 py-2 rounded-full border border-[#D9E1D2] shadow-sm">
              <GraduationCap className="h-4 w-4 text-[#315C46]" />
              <span className="font-outfit font-bold text-[#26332A]">Cogni<span className="text-[#315C46]">Trace</span></span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold bg-[#DCE8DC] text-[#264B39] border border-[#D9E1D2]">
              <span className="w-2 h-2 rounded-full bg-[#315C46] animate-pulse" />
              Live Telemetry
            </span>
          </div>

          {/* Center Illustration Area with Floating Badges */}
          <div className="relative my-auto py-8 flex flex-col items-center justify-center w-full max-w-[420px]">
            {/* Center Artwork */}
            <div className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-square flex items-center justify-center">
              <img
                src={cogniLogo}
                alt="CogniTrace Showcase"
                className="w-full h-auto max-h-[340px] object-contain drop-shadow-xl transition-transform duration-500 hover:scale-[1.02]"
              />
            </div>
          </div>

          {/* Carousel Pagination Dots matching reference */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="w-6 h-2 rounded-full bg-[#315C46]" />
            <span className="w-2 h-2 rounded-full bg-slate-300" />
          </div>

          {/* Bottom Title & Subtitle */}
          <div className="space-y-1.5 max-w-md pb-2">
            <h2 className="font-outfit text-xl sm:text-2xl font-bold text-[#26332A] leading-snug">
              Make your learning easier and organized with <span className="text-[#315C46]">CogniTrace</span>
            </h2>
            <p className="text-xs text-[#68766B] font-medium">
              Intelligent learning analytics, cohort confusion telemetry, and AI revision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
