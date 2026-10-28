



import LectureFeedbackForm from '../../components/LectureFeedbackForm';

import React, { useState, useEffect, useRef } from 'react';

import { useSearchParams, useNavigate } from 'react-router-dom';

import {

  Play,

  AlertCircle

} from 'lucide-react';



export default function SessionAnalysis() {

  const [searchParams] = useSearchParams();

  const navigate = useNavigate();



  const videoRef = useRef(null);

  const ytPlayerRef = useRef(null);



  // --------------------------------------------------

  // TELEMETRY REFS & ROLLING WINDOW

  // --------------------------------------------------

  const lastTimeRef = useRef(0);

  const lastSpeedRef = useRef(1.0);



  /*

   * Client-side rolling window memory (30-second window).

   * Stores recent interaction event timestamps in browser memory

   * to compute exact rolling interaction densities for the XGBoost model.

   */

  const eventHistoryRef = useRef([]);



  // YouTube initialization/state control

  const ytInitializedRef = useRef(false);

  const ytLastStateRef = useRef(null);

  const ytPollingRef = useRef(null);

  const ytInitTimeoutRef = useRef(null);

  const ytIgnoreStateRef = useRef(true);



  /*

   * Prevent seek-related YouTube PAUSED events

   * from being counted as real pauses.

   */

  const ytIgnoreNextPauseRef = useRef(false);



  /*

   * Prevent intentional transcript timestamp

   * navigation from being counted as learner

   * rewind/forward telemetry.

   */

  const ytIgnoreNextSeekRef = useRef(false);

  const ytObservedStateRef = useRef(null);



  // Prevent duplicate end-of-video completion calls

  const lectureCompletionRef = useRef(null);

  const [completionStatus, setCompletionStatus] = useState("idle");

  const [showCompletionAlert, setShowCompletionAlert] = useState(false);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const [quizGenerationSuccess, setQuizGenerationSuccess] = useState(false);



  // Whole-video quiz state

  const [showQuizModal, setShowQuizModal] = useState(false);

  const [quizLoading, setQuizLoading] = useState(false);

  const [quizError, setQuizError] = useState('');

  const [quizQuestions, setQuizQuestions] = useState([]);

  const [quizAnswers, setQuizAnswers] = useState({});

  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [quizScore, setQuizScore] = useState(null);



  const [lectures, setLectures] = useState([]);

  const [selectedLecture, setSelectedLecture] = useState(null);

  const [loading, setLoading] = useState(true);



  const [logs, setLogs] = useState([]);

  const [showConfusionAlert, setShowConfusionAlert] = useState(false);

  const [lastTime, setLastTime] = useState(0);



  const [ytPlayer, setYtPlayer] = useState(null);

  const [sessionStats, setSessionStats] = useState(null);



  // AI artifacts are returned at the top level of the analysis API.

  // Keep them separate from session_analytics so the buttons work

  // while the student is watching.

  const [aiArtifacts, setAiArtifacts] = useState({

    summary: null,

    revisionNotes: null,

    finalVideoQuiz: null

  });



  const [activeTab, setActiveTab] = useState('logs');

  const [transcriptData, setTranscriptData] = useState([]);

  const [transcriptLoading, setTranscriptLoading] = useState(false);



  // --------------------------------------------------

  // HELPER: RESET TELEMETRY HISTORY

  // --------------------------------------------------

  const resetTelemetryTracker = () => {

    console.log("🧹 Clearing 30s rolling telemetry window history");

    eventHistoryRef.current = [];

  };



  // --------------------------------------------------

  // LOAD YOUTUBE IFRAME API

  // --------------------------------------------------

  useEffect(() => {

    if (window.YT && window.YT.Player) {

      return;

    }



    const existingScript = document.querySelector(

      'script[src="https://www.youtube.com/iframe_api"]'

    );



    if (!existingScript) {

      const tag = document.createElement('script');



      tag.src = 'https://www.youtube.com/iframe_api';

      tag.async = true;



      const firstScriptTag =

        document.getElementsByTagName('script')[0];



      if (firstScriptTag?.parentNode) {

        firstScriptTag.parentNode.insertBefore(

          tag,

          firstScriptTag

        );

      } else {

        document.head.appendChild(tag);

      }

    }

  }, []);



  // --------------------------------------------------

  // LOAD LECTURES

  // --------------------------------------------------

  useEffect(() => {

    fetch('/api/student/lectures')

      .then((res) => res.json())

      .then((json) => {

        setLectures(json);



        const playId =

          searchParams.get('play') || 'lec_2';



        const found =

          json.find(

            (lecture) => lecture.id === playId

          ) || json[0];



        setSelectedLecture(found);

        setLoading(false);

      })

      .catch(() => {

        const fallbackList = [

          {

            id: 'lec_1',

            title:

              'Lecture 1: Introduction to Data Structures & Arrays',

            video_url: '/videos/demo-lecture.mp4'

          },

          {

            id: 'lec_2',

            title:

              'Lecture 2: Linked Lists - Singly & Doubly Linked Lists',

            video_url: '/videos/demo-lecture.mp4'

          },

          {

            id: 'lec_3',

            title:

              'Lecture 3: Stacks & Queues - Principles and Applications',

            video_url: '/videos/demo-lecture.mp4'

          }

        ];



        setLectures(fallbackList);



        const playId =

          searchParams.get('play') || 'lec_2';



        const found =

          fallbackList.find(

            (lecture) => lecture.id === playId

          ) || fallbackList[0];



        setSelectedLecture(found);

        setLoading(false);

      });

  }, [searchParams]);



  // --------------------------------------------------

  // LOAD SESSION ANALYTICS

  // --------------------------------------------------

  useEffect(() => {

    if (!selectedLecture) return;



    fetch(

      `/api/student/lecture/${selectedLecture.id}/analysis`

    )

      .then((res) => res.json())

      .then((json) => {

        setSessionStats(

          json.session_analytics || json

        );



        setAiArtifacts({

          summary: json.ai_summary || null,

          revisionNotes: json.ai_revision_notes || null,

          finalVideoQuiz: json.final_video_quiz || null

        });

      })

      .catch(() => {

        setSessionStats(null);

      });



    setLogs([]);

    setShowConfusionAlert(false);



    if (activeTab === 'transcript') {

      fetchTranscript();

    }

  }, [selectedLecture, activeTab]);



  // --------------------------------------------------

  // SELECT / RESTORE ACTIVE SESSION

  // --------------------------------------------------

  useEffect(() => {

    if (!selectedLecture?.id) return;



    fetch('/api/student/session/select', {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json'

      },

      body: JSON.stringify({

        lecture_id: selectedLecture.id

      })

    })

      .then((res) => {

        if (!res.ok) {

          throw new Error(`Session select failed: ${res.status}`);

        }

        return res.json();

      })

      .then((data) => {

        // Restore the persisted analytics for this lecture.

        if (data?.session_analytics) {

          setSessionStats(data.session_analytics);

        } else if (data) {

          setSessionStats(data);

        }



        // Re-read the analysis endpoint because it also

        // contains AI summary / notes / final quiz artifacts.

        return fetch(

          `/api/student/lecture/${selectedLecture.id}/analysis`

        );

      })

      .then((res) => {

        if (!res) return null;

        if (!res.ok) {

          throw new Error(`Analysis refresh failed: ${res.status}`);

        }

        return res.json();

      })

      .then((analysisData) => {

        if (!analysisData) return;



        setSessionStats(

          analysisData.session_analytics || analysisData

        );



        setAiArtifacts({

          summary: analysisData.ai_summary || null,

          revisionNotes: analysisData.ai_revision_notes || null,

          finalVideoQuiz: analysisData.final_video_quiz || null

        });

      })

      .catch((error) => {

        console.warn('Session selection failed:', error);

      });

  }, [selectedLecture?.id]);



  // --------------------------------------------------

  // TRANSCRIPT

  // --------------------------------------------------

  const fetchTranscript = () => {

    if (!selectedLecture) return;



    setTranscriptLoading(true);



    fetch(

      `/api/faculty/lecture/${selectedLecture.id}/transcript`

    )

      .then((res) => res.json())

      .then((json) => {

        setTranscriptData(

          Array.isArray(json) ? json : []

        );



        setTranscriptLoading(false);

      })

      .catch(() => {

        setTranscriptData([]);

        setTranscriptLoading(false);

      });

  };



  // --------------------------------------------------

  // TIMESTAMP CONVERSION

  // --------------------------------------------------

  const convertTimestampToSeconds = (timestamp) => {

    if (!timestamp) return 0;



    const parts = timestamp.split(':');



    if (parts.length === 2) {

      return (

        parseInt(parts[0], 10) * 60 +

        parseInt(parts[1], 10)

      );

    }



    if (parts.length === 3) {

      return (

        parseInt(parts[0], 10) * 3600 +

        parseInt(parts[1], 10) * 60 +

        parseInt(parts[2], 10)

      );

    }



    return 0;

  };



  // --------------------------------------------------

  // TRANSCRIPT CLICK

  // --------------------------------------------------

  const handleTranscriptClick = (timestamp) => {

    const seconds =

      convertTimestampToSeconds(timestamp);



    /*

     * This is an intentional navigation by the

     * learner through the transcript.

     *

     * It must NOT become rewind/forward telemetry.

     */

    ytIgnoreNextSeekRef.current = true;

    ytIgnoreNextPauseRef.current = true;



    if (

      selectedLecture?.youtube_id &&

      ytPlayerRef.current &&

      typeof ytPlayerRef.current.seekTo ===

        'function'

    ) {

      ytPlayerRef.current.seekTo(

        seconds,

        true

      );



      lastTimeRef.current = seconds;

      setLastTime(seconds);

    } else if (videoRef.current) {

      videoRef.current.currentTime = seconds;



      lastTimeRef.current = seconds;

      setLastTime(seconds);

    }

  };



  // --------------------------------------------------

  // MANUAL CONFUSION

  // --------------------------------------------------

  const handleManualConfusion = () => {

    resetTelemetryTracker(); // Reset actions on manual confusion trigger

    postEventLog('manual_confusion');



    navigate(

      `/student/help-center?lec=${selectedLecture.id}`

    );

  };



  // --------------------------------------------------

  // CONFUSION MODAL ACTION HANDLERS

  // --------------------------------------------------

  const handleDismissConfusion = () => {

    resetTelemetryTracker(); // Reset rolling 30s window actions to 0

    setShowConfusionAlert(false);

  };



  const handleOpenHelpCenter = () => {

    resetTelemetryTracker(); // Reset rolling 30s window actions to 0

    setShowConfusionAlert(false);

    openHelpCenter();

  };



  // --------------------------------------------------

  // YOUTUBE PLAYER

  // --------------------------------------------------

  useEffect(() => {

    if (!selectedLecture?.youtube_id) {

      return;

    }



    // Reset telemetry refs and rolling buffer for new lecture

    ytInitializedRef.current = false;

    ytLastStateRef.current = null;

    ytIgnoreStateRef.current = true;



    ytIgnoreNextPauseRef.current = false;

    ytIgnoreNextSeekRef.current = false;

    ytObservedStateRef.current = null;

    eventHistoryRef.current = [];



    lectureCompletionRef.current = null;

    setCompletionStatus("idle");



    lastTimeRef.current = 0;

    setLastTime(0);



    // Stop previous polling

    if (ytPollingRef.current) {

      clearInterval(ytPollingRef.current);

      ytPollingRef.current = null;

    }



    // Cancel previous initialization timeout

    if (ytInitTimeoutRef.current) {

      clearTimeout(ytInitTimeoutRef.current);

      ytInitTimeoutRef.current = null;

    }



    // Destroy previous player

    if (ytPlayerRef.current) {

      try {

        ytPlayerRef.current.destroy();

      } catch (error) {

        console.warn(

          'Previous YouTube player destroy failed:',

          error

        );

      }



      ytPlayerRef.current = null;

    }



    setYtPlayer(null);



    let cancelled = false;

    let initAttempts = 0;



    const initPlayer = () => {

      if (cancelled) return;



      if (

        window.YT &&

        window.YT.Player

      ) {

        try {

          ytPlayerRef.current =

            new window.YT.Player(

              'yt-player-container',

              {

                videoId:

                  selectedLecture.youtube_id,



                playerVars: {

                  autoplay: 0,

                  controls: 1,

                  rel: 0,

                  fs: 1,

                  playsinline: 1

                },



                events: {

                  // ------------------------------------

                  // YOUTUBE READY

                  // ------------------------------------

                  onReady: (event) => {

                    if (cancelled) return;



                    const player =

                      event.target;



                    ytPlayerRef.current =

                      player;



                    ytInitializedRef.current =

                      true;



                    setYtPlayer(player);



                    let actualTime = 0;



                    try {

                      actualTime =

                        player.getCurrentTime();

                    } catch (error) {

                      actualTime = 0;

                    }



                    lastTimeRef.current =

                      actualTime;



                    setLastTime(actualTime);



                    let currentSpeed = 1.0;



                    try {

                      currentSpeed =

                        player.getPlaybackRate();

                    } catch (error) {

                      currentSpeed = 1.0;

                    }



                    lastSpeedRef.current =

                      currentSpeed;



                    // Handle ?t= parameter

                    const timeParam =

                      searchParams.get('t');



                    if (timeParam) {

                      const startTime =

                        parseFloat(timeParam);



                      if (

                        Number.isFinite(

                          startTime

                        )

                      ) {

                        /*

                         * Initial URL positioning is

                         * intentional and should not be

                         * counted as learner seeking.

                         */

                        ytIgnoreNextSeekRef.current =

                          true;



                        ytIgnoreNextPauseRef.current =

                          true;



                        player.seekTo(

                          startTime,

                          true

                        );



                        lastTimeRef.current =

                          startTime;



                        setLastTime(

                          startTime

                        );

                      }

                    }



                    /*

                     * Ignore initial YouTube state

                     * changes for a short period.

                     */

                    setTimeout(() => {

                      if (

                        !cancelled &&

                        ytPlayerRef.current ===

                          player

                      ) {

                        try {

                          const current =

                            player.getCurrentTime();



                          lastTimeRef.current =

                            current;



                          setLastTime(

                            current

                          );

                        } catch (error) {

                          // Ignore

                        }



                        ytIgnoreStateRef.current =

                          false;



                        /*

                         * Initial URL positioning has

                         * now completed.

                         */

                        ytIgnoreNextSeekRef.current =

                          false;

                        ytIgnoreNextPauseRef.current =

                          false;

                      }

                    }, 800);

                  },



                  // ------------------------------------

                  // YOUTUBE STATE CHANGE

                  // ------------------------------------

                  onStateChange: (event) => {

                    handleYoutubeStateChange(

                      event

                    );

                  },



                  // ------------------------------------

                  // PLAYBACK RATE CHANGE

                  // ------------------------------------

                  onPlaybackRateChange: (

                    event

                  ) => {

                    handleYoutubeRateChange(

                      event

                    );

                  }

                }

              }

            );

        } catch (error) {

          console.error(

            'YouTube player initialization failed:',

            error

          );

        }

      } else if (initAttempts < 40) {

        initAttempts++;



        ytInitTimeoutRef.current =

          setTimeout(

            initPlayer,

            300

          );

      }

    };



    ytInitTimeoutRef.current =

      setTimeout(

        initPlayer,

        100

      );



    return () => {

      cancelled = true;



      if (ytInitTimeoutRef.current) {

        clearTimeout(

          ytInitTimeoutRef.current

        );



        ytInitTimeoutRef.current = null;

      }



      if (ytPollingRef.current) {

        clearInterval(

          ytPollingRef.current

        );



        ytPollingRef.current = null;

      }



      if (ytPlayerRef.current) {

        try {

          ytPlayerRef.current.destroy();

        } catch (error) {

          console.warn(

            'YouTube cleanup failed:',

            error

          );

        }



        ytPlayerRef.current = null;

      }



      ytInitializedRef.current =

        false;



      ytLastStateRef.current =

        null;



      ytIgnoreNextPauseRef.current =

        false;



      ytIgnoreNextSeekRef.current =

        false;

    };

  }, [

    selectedLecture,

    searchParams

  ]);



  // --------------------------------------------------

  // TELEMETRY & ML CONFUSION DETECTION

  // --------------------------------------------------

  const postEventLog = async (

    eventType,

    metadata = {}

  ) => {

    if (!selectedLecture) return;



    let currentTime = lastTimeRef.current || 0;

    let playbackSpeed = lastSpeedRef.current || 1.0;

    let duration = 1.0;



    // Read the REAL current YouTube position/duration.

    if (

      selectedLecture.youtube_id &&

      ytPlayerRef.current &&

      typeof ytPlayerRef.current.getCurrentTime === 'function'

    ) {

      try {

        currentTime =

          Number(ytPlayerRef.current.getCurrentTime()) || 0;



        playbackSpeed =

          Number(ytPlayerRef.current.getPlaybackRate()) || 1.0;



        duration =

          Number(ytPlayerRef.current.getDuration()) || 1.0;

      } catch (error) {

        console.error(

          'Unable to read YouTube telemetry values:',

          error

        );

      }

    }



    // HTML5/local video fallback.

    else if (videoRef.current) {

      currentTime =

        Number(videoRef.current.currentTime) || 0;



      playbackSpeed =

        Number(videoRef.current.playbackRate) || 1.0;



      duration =

        Number(videoRef.current.duration) || 1.0;

    }



    // --------------------------------------------------

    // ROLLING WINDOW CALCULATION (30-second window)

    // --------------------------------------------------

    const now = Date.now();

    eventHistoryRef.current.push({ type: eventType, time: now });



    // Filter events to keep ONLY those from the last 30 seconds

    const thirtySecondsAgo = now - 30000;

    eventHistoryRef.current = eventHistoryRef.current.filter(e => e.time >= thirtySecondsAgo);



    // Compute rolling 30-second interaction feature densities for XGBoost

    const rewinds_30s = eventHistoryRef.current.filter(e => e.type === 'rewind').length;

    const pauses_30s = eventHistoryRef.current.filter(e => e.type === 'pause').length;

    const resumes_30s = eventHistoryRef.current.filter(e => e.type === 'resume').length;

    const seeks_30s = eventHistoryRef.current.filter(e => e.type === 'forward_seek').length;



    const watchDuration =

      duration > 0

        ? Math.min(

            100,

            Math.max(

              0,

              (currentTime / duration) * 100

            )

          )

        : 0;



    const payload = {

      lecture_id: selectedLecture.id,

      event_type: eventType,

      timestamp: currentTime,

      playback_speed: playbackSpeed,

      watch_duration: watchDuration,



      // ML Rolling Window Feature Matrix

      rewinds_30s,

      pauses_30s,

      resumes_30s,

      seeks_30s,



      ...metadata

    };



    console.log(

      '📡 TELEMETRY EVENT SENT:',

      payload

    );



    try {

      const response = await fetch(

        '/api/student/session-analysis/log',

        {

          method: 'POST',

          headers: {

            'Content-Type': 'application/json'

          },

          body: JSON.stringify(payload)

        }

      );



      const responseText = await response.text();



      let data = {};

      try {

        data = responseText

          ? JSON.parse(responseText)

          : {};

      } catch {

        data = {

          raw_response: responseText

        };

      }



      if (!response.ok) {

        throw new Error(

          `Telemetry HTTP ${response.status}: ${responseText}`

        );

      }



      console.log(

        '✅ TELEMETRY SAVED:',

        eventType,

        data

      );



      // Show the event immediately in Activity Logs.

      setLogs((previous) => [

        ...previous,

        {

          type: eventType,

          timestamp: currentTime,

          playback_speed: playbackSpeed,

          metadata,

          response: data

        }

      ]);



      // Trigger AI Help Modal if XGBoost Model / Heuristic flags confusion

      if (data.confusion_detected || data.trigger_ai_help) {

        setShowConfusionAlert(true);

      }



      // Refresh persisted analytics from backend.

      const analysisResponse = await fetch(

        `/api/student/lecture/${selectedLecture.id}/analysis`

      );



      if (analysisResponse.ok) {

        const analysisData =

          await analysisResponse.json();



        setSessionStats(

          analysisData.session_analytics ||

          analysisData

        );



        setAiArtifacts({

          summary:

            analysisData.ai_summary || null,

          revisionNotes:

            analysisData.ai_revision_notes || null,

          finalVideoQuiz:

            analysisData.final_video_quiz || null

        });

      }

    } catch (error) {

      console.error(

        '❌ TELEMETRY WAS NOT SAVED:',

        error

      );

    }

  };



  // --------------------------------------------------

  // PLAYBACK RATE

  // --------------------------------------------------

  const handleYoutubeRateChange = (

    event

  ) => {

    if (

      !ytPlayerRef.current

    ) {

      return;

    }



    let newSpeed = 1.0;



    try {

      newSpeed =

        ytPlayerRef.current.getPlaybackRate();

    } catch (error) {

      return;

    }



    const previousSpeed =

      lastSpeedRef.current;



    if (

      newSpeed ===

      previousSpeed

    ) {

      return;

    }



    lastSpeedRef.current =

      newSpeed;



    postEventLog(

      'speed_change',

      {

        previous_speed:

          previousSpeed,



        new_speed:

          newSpeed

      }

    );

  };



  // --------------------------------------------------

  // VIDEO COMPLETION + WHOLE-VIDEO QUIZ

  // --------------------------------------------------

  const completeLecture = async () => {

    if (!selectedLecture?.id) return;



    if (lectureCompletionRef.current === selectedLecture.id) {

      return;

    }



    lectureCompletionRef.current = selectedLecture.id;

    setCompletionStatus("generating");



    console.log("?? VIDEO COMPLETED:", selectedLecture.id);



    try {

      const response = await fetch(

        `/api/student/lecture/${selectedLecture.id}/complete?difficulty=medium`,

        {

          method: "POST",

          headers: {

            "Content-Type": "application/json"

          }

        }

      );



      const responseText = await response.text();



      let data = {};

      try {

        data = responseText ? JSON.parse(responseText) : {};

      } catch {

        data = {};

      }



      if (!response.ok) {

        throw new Error(

          data?.detail ||

          `Completion request failed with status ${response.status}`

        );

      }



      console.log("? COMPLETION RESPONSE:", data);



      const generatedQuiz =

        data.final_video_quiz ||

        data.quiz ||

        null;



      if (generatedQuiz) {

        setAiArtifacts((previous) => ({

          ...previous,

          finalVideoQuiz: generatedQuiz

        }));



        const generatedQuestions =

          extractQuizQuestions(generatedQuiz);



        if (generatedQuestions.length > 0) {

          setQuizQuestions(generatedQuestions);

          setQuizAnswers({});

          setQuizSubmitted(false);

          setQuizScore(null);

          setQuizError("");

        }

      }



      setCompletionStatus(

        data.quiz_available ? "completed" : "error"

      );



      // Automatically launch AI quiz questions right after suggestions/feedback is submitted

      const availableQuestions = generatedQuiz ? extractQuizQuestions(generatedQuiz) : [];

      if (availableQuestions.length > 0) {

        setShowQuizModal(true);

      } else {

        loadFinalVideoQuiz(true);

      }



      /*

       * Refresh analytics only. This does NOT generate another quiz.

       */

      const analysisResponse = await fetch(

        `/api/student/lecture/${selectedLecture.id}/analysis`

      );



      if (analysisResponse.ok) {

        const analysisData = await analysisResponse.json();



        setSessionStats(

          analysisData.session_analytics || analysisData

        );



        setAiArtifacts((previous) => ({

          ...previous,

          summary:

            analysisData.ai_summary || previous.summary,

          revisionNotes:

            analysisData.ai_revision_notes || previous.revisionNotes,

          finalVideoQuiz:

            analysisData.final_video_quiz ||

            generatedQuiz ||

            previous.finalVideoQuiz

        }));

      }

    } catch (error) {

      console.error("? VIDEO COMPLETION FAILED:", error);

      

      // We don't reset lectureCompletionRef so they don't get spammed with it again.

      setCompletionStatus("error");

    }

  };



  const handleVideoEnded = () => {

    // Show feedback modal instead of immediately completing

    if (!selectedLecture?.id) return;

    if (lectureCompletionRef.current === selectedLecture.id) {

      return;

    }

    setShowFeedbackModal(true);

  };



  // --------------------------------------------------

  // YOUTUBE STATE CHANGE

  // --------------------------------------------------

  /*

   * YouTube state codes:

   * 1 = PLAYING

   * 2 = PAUSED

   * 0 = ENDED

   * 3 = BUFFERING

   *

   * Play/pause telemetry is primarily handled by the polling

   * loop below. This avoids missing YouTube state transitions.

   */

  const handleYoutubeStateChange = (event) => {

    const player = ytPlayerRef.current;

    if (!player) return;



    let currentTime = 0;



    try {

      currentTime = Number(player.getCurrentTime()) || 0;

    } catch {

      return;

    }



    if (ytIgnoreStateRef.current) {

      lastTimeRef.current = currentTime;

      setLastTime(currentTime);

      return;

    }



    if (event.data === 0) {

      lastTimeRef.current = currentTime;

      setLastTime(currentTime);

      handleVideoEnded();

    }

  };



  // --------------------------------------------------

  // YOUTUBE POLLING - TELEMETRY + COMPLETION

  // --------------------------------------------------

  useEffect(() => {

    if (

      !selectedLecture?.youtube_id ||

      !ytPlayer ||

      !ytPlayerRef.current ||

      !ytInitializedRef.current

    ) {

      return;

    }



    if (ytPollingRef.current) {

      clearInterval(ytPollingRef.current);

    }



    /*

     * Wait until the initial YouTube state has been ignored.

     * Then establish the real current state without creating

     * a fake PLAY/PAUSE event.

     */

    ytObservedStateRef.current = null;



    ytPollingRef.current = setInterval(() => {

      const player = ytPlayerRef.current;



      if (!player || !ytInitializedRef.current) {

        return;

      }



      let currentTime = 0;

      let duration = 0;

      let playerState = -1;



      try {

        currentTime = Number(player.getCurrentTime()) || 0;

        duration = Number(player.getDuration()) || 0;

        playerState = Number(player.getPlayerState());

      } catch {

        return;

      }



      setLastTime(currentTime);



      /*

       * Do not process telemetry until initial player setup

       * has finished.

       */

      if (ytIgnoreStateRef.current) {

        lastTimeRef.current = currentTime;

        return;

      }



      /*

       * Establish the first real state.

       */

      if (ytObservedStateRef.current === null) {

        ytObservedStateRef.current = playerState;

        lastTimeRef.current = currentTime;

        return;

      }



      const previousState = ytObservedStateRef.current;

      const previousTime = lastTimeRef.current;

      const difference = currentTime - previousTime;



      /*

       * ------------------------------------------------

       * PLAY

       * ------------------------------------------------

       */

      if (

        playerState === 1 &&

        previousState !== 1

      ) {

        console.log("▶️ PLAY:", currentTime);

        postEventLog("play");

      }



      /*

       * ------------------------------------------------

       * PAUSE

       * ------------------------------------------------

       */

      if (

        playerState === 2 &&

        previousState === 1

      ) {

        console.log("⏸️ PAUSE:", currentTime);

        postEventLog("pause");

      }



      /*

       * ------------------------------------------------

       * REWIND / FORWARD

       * ------------------------------------------------

       *

       * Normal playback advances slowly between polls.

       * A jump of >= 2.5 seconds is treated as a learner seek.

       */

      if (

        Math.abs(difference) >= 2.5 &&

        !ytIgnoreNextSeekRef.current

      ) {

        if (difference < 0) {

          console.log(

            "⏪ REWIND:",

            previousTime,

            "→",

            currentTime

          );



          postEventLog("rewind", {

            previous_timestamp: previousTime,

            current_timestamp: currentTime,

            seconds_delta: Math.abs(difference),

            rewind_from: previousTime,

            rewind_to: currentTime

          });

        } else if (difference > 0) {

          console.log(

            "⏩ FORWARD:",

            previousTime,

            "→",

            currentTime

          );



          postEventLog("forward_seek", {

            previous_timestamp: previousTime,

            current_timestamp: currentTime,

            seconds_delta: difference,

            seek_from: previousTime,

            seek_to: currentTime

          });

        }

      } else if (

        Math.abs(difference) >= 2.5 &&

        ytIgnoreNextSeekRef.current

      ) {

        /*

         * This jump was intentionally caused by transcript

         * navigation. Do not count it as learner seeking.

         */

        console.log(

          "📝 IGNORING INTENTIONAL SEEK:",

          previousTime,

          "→",

          currentTime

        );



        ytIgnoreNextSeekRef.current = false;

      }



      /*

       * ------------------------------------------------

       * END OF VIDEO

       * ------------------------------------------------

       *

       * Some YouTube embeds do not reliably expose ENDED

       * through the exact same timing, so also check duration.

       */

      if (

        playerState === 0 ||

        (

          duration > 0 &&

          currentTime >= duration - 0.75

        )

      ) {

        completeLecture();

      }



      ytObservedStateRef.current = playerState;

      lastTimeRef.current = currentTime;

    }, 500);



    return () => {

      if (ytPollingRef.current) {

        clearInterval(ytPollingRef.current);

        ytPollingRef.current = null;

      }

    };

  }, [selectedLecture?.youtube_id, ytPlayer]);



  // --------------------------------------------------

  // HTML VIDEO TELEMETRY

  // --------------------------------------------------

  const handlePlay = () => {

    if (!videoRef.current) {

      return;

    }



    const currentTime =

      videoRef.current.currentTime;



    lastTimeRef.current =

      currentTime;



    setLastTime(

      currentTime

    );



    postEventLog(

      'play'

    );

  };



  const handlePause = () => {

    if (!videoRef.current) {

      return;

    }



    const currentTime =

      videoRef.current.currentTime;



    lastTimeRef.current =

      currentTime;



    setLastTime(

      currentTime

    );



    postEventLog(

      'pause'

    );

  };



  const handleSeeked = () => {

    if (!videoRef.current) {

      return;

    }



    const currentTime =

      videoRef.current.currentTime;



    const previousTime =

      lastTimeRef.current;



    const difference =

      currentTime -

      previousTime;



    /*

     * Ignore very small changes caused by

     * normal browser/video progression.

     */

    if (

      Math.abs(difference) >= 2.0

    ) {

      if (

        difference > 0

      ) {

        postEventLog(

          'forward_seek',

          {

            from:

              previousTime,



            to:

              currentTime,



            distance:

              difference

          }

        );

      } else {

        postEventLog(

          'rewind',

          {

            from:

              previousTime,



            to:

              currentTime,



            distance:

              Math.abs(

                difference

              )

          }

        );

      }

    }



    lastTimeRef.current =

      currentTime;



    setLastTime(

      currentTime

    );

  };



  const handleRateChange = () => {

    if (!videoRef.current) {

      return;

    }



    const newSpeed =

      videoRef.current.playbackRate;



    const previousSpeed =

      lastSpeedRef.current;



    if (

      newSpeed ===

      previousSpeed

    ) {

      return;

    }



    lastSpeedRef.current =

      newSpeed;



    postEventLog(

      'speed_change',

      {

        previous_speed:

          previousSpeed,



        new_speed:

          newSpeed

      }

    );

  };



  // --------------------------------------------------

  // LECTURE CHANGE

  // --------------------------------------------------

  const handleLectureChange = (

    lectureId

  ) => {

    const lecture =

      lectures.find(

        (item) =>

          item.id ===

          lectureId

      );



    if (!lecture) {

      return;

    }



    /*

     * Reset completion state for the

     * newly selected lecture.

     */

    lectureCompletionRef.current =

      null;



    setCompletionStatus(

      "idle"

    );



    setShowCompletionAlert(false);



    setSelectedLecture(

      lecture

    );



    setLastTime(0);



    lastTimeRef.current =

      0;



    lastSpeedRef.current =

      1.0;



    eventHistoryRef.current = [];



    setLogs([]);



    setSessionStats(

      null

    );



    setAiArtifacts({

      summary: null,

      revisionNotes: null,

      finalVideoQuiz: null

    });



    setShowQuizModal(false);

    setQuizLoading(false);

    setQuizError('');

    setQuizQuestions([]);

    setQuizAnswers({});

    setQuizSubmitted(false);

    setQuizScore(null);



    setTranscriptData([]);



    setShowConfusionAlert(

      false

    );



    navigate(

      `/student/session?play=${lecture.id}`,

      {

        replace: true

      }

    );

  };



  // --------------------------------------------------

  // FORMAT TIME

  // --------------------------------------------------

  const formatTime = (

    seconds

  ) => {

    const total =

      Math.max(

        0,

        Math.floor(

          Number(seconds) || 0

        )

      );



    const minutes =

      Math.floor(

        total / 60

      );



    const remaining =

      total % 60;



    return `${String(

      minutes

    ).padStart(

      2,

      '0'

    )}:${String(

      remaining

    ).padStart(

      2,

      '0'

    )}`;

  };



  // --------------------------------------------------

  // VIDEO COMPLETION STATUS REFRESH

  // --------------------------------------------------

  useEffect(() => {

    if (

      completionStatus !==

      "completed"

    ) {

      return;

    }



    if (

      !selectedLecture?.id

    ) {

      return;

    }



    /*

     * Fetch the latest analysis once

     * after completion so the UI gets

     * the generated artifacts.

     */

    const refreshAnalysis =

      async () => {

        try {

          const response =

            await fetch(

              `/api/student/lecture/${selectedLecture.id}/analysis`

            );



          if (!response.ok) {

            return;

          }



          const data =

            await response.json();



          setSessionStats(

            data.session_analytics ||

            data

          );



          setAiArtifacts({

            summary: data.ai_summary || null,

            revisionNotes: data.ai_revision_notes || null,

            finalVideoQuiz: data.final_video_quiz || null

          });

        } catch (error) {

          console.warn(

            'Unable to refresh completed lecture analysis:',

            error

          );

        }

      };



    refreshAnalysis();

  }, [

    completionStatus,

    selectedLecture?.id

  ]);



  // --------------------------------------------------

  // COMPLETION STATUS

  // --------------------------------------------------

  const renderCompletionStatus =

    () => {

      if (

        completionStatus ===

        "generating"

      ) {

        return (

          <div className="mb-4 px-4 py-3 rounded-xl border border-primary-500/20 bg-primary-500/10">



            <p className="text-xs font-bold text-primary-300">

              Lecture completed

            </p>



            <p className="text-[11px] text-slate-400 mt-1">

              Generating AI summary, AI notes and whole-video quiz...

            </p>



          </div>

        );

      }



      if (

        completionStatus ===

        "completed"

      ) {

        return (

          <div className="mb-4 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10">



            <p className="text-xs font-bold text-emerald-300">

              Lecture completed

            </p>



            <p className="text-[11px] text-slate-400 mt-1">

              AI summary, AI notes and whole-video quiz are ready.

            </p>



          </div>

        );

      }



      if (

        completionStatus ===

        "error"

      ) {

        return (

          <button

            onClick={

              completeLecture

            }

            className="w-full mb-4 px-4 py-3 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-left"

          >



            <p className="text-xs font-bold text-rose-300">

              AI generation failed

            </p>



            <p className="text-[11px] text-slate-400 mt-1">

              Click to retry generating the lecture artifacts.

            </p>



          </button>

        );

      }



      return null;

    };



  // --------------------------------------------------

  // CLEANUP YOUTUBE PLAYER

  // --------------------------------------------------

  useEffect(() => {

    return () => {

      if (

        ytPollingRef.current

      ) {

        clearInterval(

          ytPollingRef.current

        );



        ytPollingRef.current =

          null;

      }



      if (

        ytInitTimeoutRef.current

      ) {

        clearTimeout(

          ytInitTimeoutRef.current

        );



        ytInitTimeoutRef.current =

          null;

      }



      if (

        ytPlayerRef.current

      ) {

        try {

          ytPlayerRef.current.destroy();

        } catch (error) {

          console.warn(

            'YouTube player cleanup failed:',

            error

          );

        }



        ytPlayerRef.current =

          null;

      }

    };

  }, []);



  // --------------------------------------------------

  // CONFUSION ALERT TIMEOUT

  // --------------------------------------------------

  useEffect(() => {

    if (

      !showConfusionAlert

    ) {

      return;

    }



    const timeout =

      setTimeout(() => {

        resetTelemetryTracker(); // Reset rolling buffer on auto-dismiss timeout

        setShowConfusionAlert(

          false

        );

      }, 5000);



    return () =>

      clearTimeout(

        timeout

      );

  }, [

    showConfusionAlert

  ]);



  // --------------------------------------------------

  // NAVIGATION HELPERS

  // --------------------------------------------------

  const openHelpCenter = () => {

    if (

      !selectedLecture?.id

    ) {

      return;

    }



    navigate(

      `/student/help-center?lec=${selectedLecture.id}`

    );

  };



  const returnToVideo = () => {

    if (

      !selectedLecture?.id

    ) {

      return;

    }



    navigate(

      `/student/session?play=${selectedLecture.id}`

    );

  };



  // --------------------------------------------------

  // WHOLE-VIDEO QUIZ

  // --------------------------------------------------

  const extractQuizQuestions = (payload) => {

    if (!payload) return [];



    let data = payload;



    // Some APIs return the quiz as a JSON string.

    if (typeof data === 'string') {

      try {

        data = JSON.parse(data);

      } catch {

        return [];

      }

    }



    if (Array.isArray(data)) {

      return data;

    }



    const candidates = [

      data.questions,

      data.quiz?.questions,

      data.final_video_quiz?.questions,

      data.final_video_quiz,

      data.data?.questions,

      data.data?.quiz?.questions

    ];



    for (const candidate of candidates) {

      if (Array.isArray(candidate)) {

        return candidate;

      }



      if (typeof candidate === 'string') {

        try {

          const parsed = JSON.parse(candidate);

          if (Array.isArray(parsed)) return parsed;

          if (Array.isArray(parsed?.questions)) return parsed.questions;

        } catch {

          // Continue checking other possible response shapes.

        }

      }

    }



    return [];

  };



  const getQuestionText = (question) =>

    question?.question ||

    question?.question_text ||

    question?.text ||

    question?.prompt ||

    'Question';



  const getQuestionOptions = (question) => {

    const options =

      question?.options ||

      question?.choices ||

      question?.answer_options ||

      [];



    if (Array.isArray(options)) {

      return options;

    }



    if (options && typeof options === 'object') {

      return Object.entries(options).map(

        ([key, value]) => `${key}. ${value}`

      );

    }



    return [];

  };



  const getCorrectAnswer = (question) =>

    question?.correct_answer ??

    question?.correctAnswer ??

    question?.correct_option ??

    question?.correct_option_index ??

    question?.correct_answer_index ??

    question?.answer ??

    question?.correct;



  const isAnswerCorrect = (question, selectedValue) => {

    if (selectedValue === undefined || selectedValue === null) {

      return false;

    }



    const options = getQuestionOptions(question);

    const correct = getCorrectAnswer(question);



    if (correct === undefined || correct === null) {

      return false;

    }



    // Numeric answer/index.

    if (typeof correct === 'number') {

      if (Number(selectedValue) === correct) return true;

      if (Number(selectedValue) + 1 === correct) return true;

    }



    const selectedIndex = Number(selectedValue);

    const correctString = String(correct).trim();



    // Letter answer such as A/B/C/D.

    if (/^[A-Za-z]$/.test(correctString)) {

      const index = correctString.toUpperCase().charCodeAt(0) - 65;

      if (selectedIndex === index) return true;

    }



    // Compare the selected option text with the answer.

    const selectedOption = options[selectedIndex];

    if (selectedOption !== undefined) {

      const cleanOption = String(selectedOption)

        .replace(/^[A-Za-z0-9][.)]\s]+/, '')

        .trim()

        .toLowerCase();



      const cleanCorrect = correctString

        .replace(/^[A-Za-z0-9][.)]\s]+/, '')

        .trim()

        .toLowerCase();



      if (cleanOption === cleanCorrect) return true;

    }



    return correctString === String(selectedValue).trim();

  };



  const loadFinalVideoQuiz = async (openAfterLoad = false) => {

    if (!selectedLecture?.id) return false;



    setQuizLoading(true);

    setQuizError('');



    try {

      /*

       * The completion endpoint generates/stores the quiz.

       * This GET endpoint only retrieves the generated quiz.

       * A few retries handle the small delay between generation

       * finishing and the quiz becoming readable by the UI.

       */

      let latestQuestions = [];



      for (let attempt = 0; attempt < 5; attempt++) {

        const response = await fetch(

          `/api/student/lecture/${selectedLecture.id}/final-quiz?difficulty=medium`

        );



        if (response.ok) {

          const data = await response.json();

          latestQuestions = extractQuizQuestions(data);



          if (latestQuestions.length > 0) {

            setQuizQuestions(latestQuestions);

            setAiArtifacts((previous) => ({

              ...previous,

              finalVideoQuiz: data

            }));

            setQuizAnswers({});

            setQuizSubmitted(false);

            setQuizScore(null);



            if (openAfterLoad) {

              setShowCompletionAlert(false);

              setShowQuizModal(true);

            }



            setQuizLoading(false);

            return true;

          }

        }



        if (attempt < 4) {

          await new Promise((resolve) => setTimeout(resolve, 1500));

        }

      }



      throw new Error(

        'The quiz was generated, but the questions are not available yet. Please try again in a moment.'

      );

    } catch (error) {

      console.error('Whole-video quiz loading failed:', error);

      setQuizError(error.message || 'Unable to load the whole-video quiz.');

      setQuizLoading(false);

      return false;

    }

  };



  const openWholeVideoQuiz = async () => {

    setShowCompletionAlert(false);



    if (quizQuestions.length > 0) {

      setShowQuizModal(true);

      return;

    }



    await loadFinalVideoQuiz(true);

  };



  const handleQuizAnswer = (questionIndex, optionIndex) => {

    if (quizSubmitted) return;



    setQuizAnswers((previous) => ({

      ...previous,

      [questionIndex]: optionIndex

    }));

  };



  const submitWholeVideoQuiz = () => {

    if (!quizQuestions.length) return;



    let correct = 0;



    quizQuestions.forEach((question, index) => {

      if (isAnswerCorrect(question, quizAnswers[index])) {

        correct += 1;

      }

    });



    const percentage = Math.round(

      (correct / quizQuestions.length) * 100

    );



    setQuizScore({

      correct,

      total: quizQuestions.length,

      percentage

    });

    setQuizSubmitted(true);

  };



  const closeQuizModal = () => {

    setShowQuizModal(false);

    setShowCompletionAlert(true);

  };



  const openAISummary = () => {

    if (!selectedLecture?.id || !aiArtifacts.summary) return;



    navigate(

      `/student/summary?lec=${selectedLecture.id}`

    );

  };



  const openAIRevisionNotes = () => {

    if (!selectedLecture?.id || !aiArtifacts.revisionNotes) return;



    navigate(

      `/student/notes?lec=${selectedLecture.id}`

    );

  };



  // --------------------------------------------------

  // LOADING

  // --------------------------------------------------

  if (loading) {

    return (

      <div className="flex-1 flex items-center justify-center min-h-screen bg-brand-950">



        <div className="text-center">



          <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />



          <p className="text-xs text-slate-500 mt-3">

            Loading lecture...

          </p>



        </div>



      </div>

    );

  }



  // --------------------------------------------------

  // NO LECTURE

  // --------------------------------------------------

  if (!selectedLecture) {

    return (

      <div className="flex-1 flex items-center justify-center min-h-screen bg-brand-950">



        <div className="text-center">



          <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />



          <p className="text-sm text-white font-bold mt-3">

            No lecture found

          </p>



          <button

            onClick={() =>

              navigate(

                '/student/lectures'

              )

            }

            className="mt-4 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold"

          >

            Back to Lectures

          </button>



        </div>



      </div>

    );

  }



  // --------------------------------------------------

  // RENDER

  // --------------------------------------------------

  return (

    <>

      

      {showFeedbackModal && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6">

          <LectureFeedbackForm 

            lectureId={selectedLecture?.id}

            onSubmitted={() => {

              setShowFeedbackModal(false);

              completeLecture();

            }}

            onSkip={() => {

              setShowFeedbackModal(false);

              completeLecture();

            }}

          />

        </div>

      )}



      {showCompletionAlert && (

        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">

          <div className="w-full max-w-md rounded-2xl border border-primary-500/30 bg-brand-950 p-6 shadow-2xl">

            <div className="text-center">

              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">

                ✓

              </div>



              <h2 className="text-xl font-bold text-white mt-4">

                Lecture Completed

              </h2>



              <p className="text-sm text-slate-400 mt-2 leading-relaxed">

                Your AI Summary and AI Revision Notes are now ready for review.

              </p>

            </div>



            <div className="space-y-3 mt-6">

              <button

                onClick={() => {

                  setShowCompletionAlert(false);

                  openAISummary();

                }}

                disabled={!aiArtifacts.summary}

                className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-40 text-white text-xs font-bold"

              >

                📘 Open AI Summary

              </button>



              <button

                onClick={() => {

                  setShowCompletionAlert(false);

                  openAIRevisionNotes();

                }}

                disabled={!aiArtifacts.revisionNotes}

                className="w-full py-3 rounded-xl bg-primary-600/10 border border-primary-500/20 hover:bg-primary-600 hover:text-white disabled:opacity-40 text-primary-300 text-xs font-bold"

              >

                📝 Open AI Revision Notes

              </button>



              <button

                onClick={() =>

                  setShowCompletionAlert(false)

                }

                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"

              >

                Continue to Session Analysis

              </button>

            </div>

          </div>

        </div>

      )}



      {/* --------------------------------------------------

          WHOLE-VIDEO QUIZ MODAL

      -------------------------------------------------- */}

      {showQuizModal && (

        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-6">

          <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-primary-500/30 bg-brand-950 shadow-2xl flex flex-col">



            <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">

              <div>

                <p className="text-[10px] text-primary-400 font-bold uppercase tracking-widest">

                  CogniTrace Whole-Video Quiz

                </p>

                <h2 className="text-xl font-bold text-white mt-1">

                  {selectedLecture.title}

                </h2>

                <p className="text-xs text-slate-500 mt-1">

                  {quizQuestions.length} questions covering the complete lecture

                </p>

              </div>



              <button

                onClick={closeQuizModal}

                className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-lg"

                aria-label="Close quiz"

              >

                ×

              </button>

            </div>



            <div className="overflow-y-auto p-5 space-y-4">

              {quizError && (

                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10">

                  <p className="text-xs font-bold text-rose-300">

                    Unable to load quiz

                  </p>

                  <p className="text-[11px] text-slate-400 mt-1">

                    {quizError}

                  </p>

                  <button

                    onClick={() => loadFinalVideoQuiz(true)}

                    disabled={quizLoading}

                    className="mt-3 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-xs font-bold"

                  >

                    {quizLoading ? 'Loading...' : 'Retry'}

                  </button>

                </div>

              )}



              {quizLoading && quizQuestions.length === 0 && (

                <div className="py-12 text-center">

                  <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />

                  <p className="text-xs text-slate-400 mt-3">

                    Loading your whole-video quiz...

                  </p>

                </div>

              )}



              {quizQuestions.map((question, questionIndex) => {

                const options = getQuestionOptions(question);



                return (

                  <div

                    key={questionIndex}

                    className="p-5 rounded-2xl bg-brand-900/40 border border-slate-800"

                  >

                    <div className="flex gap-3">

                      <span className="h-7 w-7 shrink-0 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-300 flex items-center justify-center text-xs font-bold">

                        {questionIndex + 1}

                      </span>



                      <p className="text-sm font-semibold text-white leading-relaxed">

                        {getQuestionText(question)}

                      </p>

                    </div>



                    <div className="mt-4 space-y-2">

                      {options.map((option, optionIndex) => {

                        const selected =

                          quizAnswers[questionIndex] === optionIndex;



                        return (

                          <button

                            key={optionIndex}

                            onClick={() =>

                              handleQuizAnswer(

                                questionIndex,

                                optionIndex

                              )

                            }

                            disabled={quizSubmitted}

                            className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${

                              selected

                                ? 'border-primary-500 bg-primary-500/15 text-white'

                                : 'border-slate-800 bg-brand-950/50 text-slate-400 hover:border-primary-500/40 hover:text-white'

                            }`}

                          >

                            <span className="font-bold mr-2">

                              {String.fromCharCode(65 + optionIndex)}.

                            </span>

                            {String(option).replace(

                              /^[A-Za-z0-9][.)]\s]+/,

                              ''

                            )}

                          </button>

                        );

                      })}

                    </div>

                  </div>

                );

              })}



              {quizSubmitted && quizScore && (

                <div className={`p-5 rounded-2xl border ${

                  quizScore.percentage >= 70

                    ? 'border-emerald-500/30 bg-emerald-500/10'

                    : 'border-amber-500/30 bg-amber-500/10'

                }`}>

                  <p className="text-lg font-bold text-white">

                    Quiz Score: {quizScore.percentage}%

                  </p>

                  <p className="text-xs text-slate-400 mt-1">

                    {quizScore.correct} correct out of {quizScore.total}

                  </p>

                  <p

                    className={`text-xs font-semibold mt-2 ${

                      quizScore.percentage >= 70

                        ? 'text-emerald-300'

                        : 'text-amber-300'

                    }`}

                  >

                    {quizScore.percentage >= 70

                      ? '✓ Passed the 70% learning threshold.'

                      : 'Keep revising the lecture and try again.'}

                  </p>

                </div>

              )}

            </div>



            <div className="p-5 border-t border-slate-800 flex gap-3 shrink-0">

              <button

                onClick={closeQuizModal}

                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${

                  quizSubmitted

                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'

                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'

                }`}

              >

                {quizSubmitted ? 'Continue to Summary & Notes →' : 'Close'}

              </button>



              {!quizSubmitted ? (

                <button

                  onClick={submitWholeVideoQuiz}

                  disabled={

                    quizQuestions.length === 0 ||

                    Object.keys(quizAnswers).length !== quizQuestions.length

                  }

                  className="flex-1 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold"

                >

                  Submit Quiz

                </button>

              ) : (

                <button

                  onClick={() => {

                    setQuizAnswers({});

                    setQuizSubmitted(false);

                    setQuizScore(null);

                  }}

                  className="flex-1 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold"

                >

                  Retake Quiz

                </button>

              )}

            </div>

          </div>

        </div>

      )}



      <div className="flex-1 p-8 overflow-y-auto bg-brand-950">



      <div className="max-w-7xl mx-auto">



        {/* --------------------------------------------------

            HEADER

        -------------------------------------------------- */}

        <div className="flex items-center justify-between mb-6">



          <div>



            <h1 className="text-2xl font-outfit font-bold text-white">

              {selectedLecture.title}

            </h1>



            <p className="text-xs text-slate-500 mt-1">

              Session Analysis & Learning Behaviour

            </p>



          </div>



          <button

            onClick={

              returnToVideo

            }

            className="px-4 py-2.5 bg-brand-900 border border-slate-800 hover:bg-brand-800 rounded-xl text-xs font-bold text-slate-300"

          >

            Return to Video

          </button>



        </div>



        {/* --------------------------------------------------

            VIDEO + ANALYSIS

        -------------------------------------------------- */}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">



          {/* ------------------------------------------------

              VIDEO

          ------------------------------------------------ */}

          <div className="xl:col-span-2">



            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">



              <div className="aspect-video bg-black">



                {selectedLecture.youtube_id ? (



                  <div

                    id="yt-player-container"

                    className="w-full h-full"

                  />



                ) : (



                  <video

                    ref={

                      videoRef

                    }

                    src={

                      selectedLecture.source === 'local' || selectedLecture.video_type === 'local' || !selectedLecture.youtube_id

                        ? `/api/faculty/lectures/${selectedLecture.id}/video`

                        : selectedLecture.video_url

                    }

                    controls

                    className="w-full h-full object-contain"

                    onPlay={

                      handlePlay

                    }

                    onPause={

                      handlePause

                    }

                    onEnded={

                      handleVideoEnded

                    }

                    onSeeked={

                      handleSeeked

                    }

                    onRateChange={

                      handleRateChange

                    }

                  />



                )}



              </div>



              <div className="p-5 border-t border-slate-800">



                <div className="flex items-center justify-between">



                  <div>



                    <p className="text-[10px] text-slate-600 uppercase tracking-wider">

                      Current Position

                    </p>



                    <p className="text-sm font-bold text-white mt-1">

                      {formatTime(

                        lastTime

                      )}

                    </p>



                  </div>



                  <div>



                    <p className="text-[10px] text-slate-600 uppercase tracking-wider">

                      Playback Speed

                    </p>



                    <p className="text-sm font-bold text-white mt-1">

                      {

                        lastSpeedRef.current

                      }x

                    </p>



                  </div>



                </div>



              </div>



            </div>



            {/* ------------------------------------------------

                AI SUMMARY / NOTES WHILE WATCHING

            ------------------------------------------------ */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">



              <button

                onClick={openAISummary}

                disabled={!aiArtifacts.summary}

                className="py-3 px-4 bg-primary-600/10 border border-primary-500/20 hover:bg-primary-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-primary-300 rounded-xl text-xs font-bold transition-all"

              >

                {aiArtifacts.summary

                  ? '📘 Open AI Summary'

                  : 'AI Summary Generating...'}

              </button>



              <button

                onClick={openAIRevisionNotes}

                disabled={!aiArtifacts.revisionNotes}

                className="py-3 px-4 bg-primary-600/10 border border-primary-500/20 hover:bg-primary-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-primary-300 rounded-xl text-xs font-bold transition-all"

              >

                {aiArtifacts.revisionNotes

                  ? '📝 Open AI Revision Notes'

                  : 'AI Notes Generating...'}

              </button>



            </div>



            {/* ------------------------------------------------

                COMPLETION STATUS

            ------------------------------------------------ */}

            <div className="mt-4">



              {renderCompletionStatus()}



            </div>



            {/* ------------------------------------------------

                ACTIONS

            ------------------------------------------------ */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">



              <button

                onClick={

                  handleManualConfusion

                }

                className="py-3 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-bold"

              >

                I am confused

              </button>



              <button

                onClick={

                  openHelpCenter

                }

                className="py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold"

              >

                Open AI Help Center

              </button>



            </div>



            {/* ------------------------------------------------

                ACTIVITY / TRANSCRIPT

            ------------------------------------------------ */}

            <div className="glass-panel rounded-2xl border border-slate-800 mt-6 overflow-hidden">



              <div className="flex border-b border-slate-800">



                <button

                  onClick={() =>

                    setActiveTab(

                      'logs'

                    )

                  }

                  className={`flex-1 py-3 text-xs font-bold ${

                    activeTab ===

                    'logs'

                      ? 'text-primary-400 border-b-2 border-primary-500'

                      : 'text-slate-500'

                  }`}

                >

                  Activity Logs

                </button>



                <button

                  onClick={() => {

                    setActiveTab(

                      'transcript'

                    );



                    fetchTranscript();

                  }}

                  className={`flex-1 py-3 text-xs font-bold ${

                    activeTab ===

                    'transcript'

                      ? 'text-primary-400 border-b-2 border-primary-500'

                      : 'text-slate-500'

                  }`}

                >

                  Transcript

                </button>



              </div>



              {/* ------------------------------------------------

                  LOGS

              ------------------------------------------------ */}

              {activeTab ===

                'logs' && (

                <div className="max-h-[400px] overflow-y-auto p-4">



                  {logs.length ===

                  0 ? (



                    <div className="py-10 text-center">



                      <p className="text-xs text-slate-500">

                        No activity recorded yet.

                      </p>



                    </div>



                  ) : (



                    <div className="space-y-2">



                      {logs.map(

                        (

                          log,

                          index

                        ) => (

                          <div

                            key={

                              `${log.timestamp}-${index}`

                            }

                            className="p-3 bg-brand-900/30 border border-slate-800 rounded-xl"

                          >



                            <div className="flex items-center justify-between">



                              <span className="text-xs font-bold text-slate-300">

                                {

                                  log.type

                                }

                              </span>



                              <span className="text-[10px] text-slate-600">

                                {formatTime(

                                  log.timestamp

                                )}

                              </span>



                            </div>



                            {log.metadata && (

                              <pre className="text-[10px] text-slate-600 mt-2 whitespace-pre-wrap">

                                {JSON.stringify(

                                  log.metadata,

                                  null,

                                  2

                                )}

                              </pre>

                            )}



                          </div>

                        )

                      )}



                    </div>



                  )}



                </div>

              )}



              {/* ------------------------------------------------

                  TRANSCRIPT

              ------------------------------------------------ */}

              {activeTab ===

                'transcript' && (

                <div className="max-h-[400px] overflow-y-auto p-4">



                  {transcriptLoading ? (



                    <div className="py-10 text-center">



                      <div className="h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />



                      <p className="text-xs text-slate-500 mt-3">

                        Loading transcript...

                      </p>



                    </div>



                  ) : transcriptData.length ===

                    0 ? (



                    <div className="py-10 text-center">



                      <p className="text-xs text-slate-500">

                        Transcript unavailable.

                      </p>



                    </div>



                  ) : (



                    <div className="space-y-2">



                      {transcriptData.map(

                        (

                          item,

                          index

                        ) => {



                          const timestamp =

                            item.start_time ??

                            item.timestamp ??

                            item.start ??

                            0;



                          const seconds =

                            typeof timestamp ===

                            'string'

                              ? convertTimestampToSeconds(

                                  timestamp

                                )

                              : Number(

                                  timestamp

                                ) || 0;



                          return (

                            <button

                              key={

                                index

                              }

                              onClick={() =>

                                handleTranscriptClick(

                                  typeof timestamp ===

                                    'string'

                                    ? timestamp

                                    : formatTime(

                                        seconds

                                      )

                                )

                              }

                              className="w-full text-left p-3 bg-brand-900/30 hover:bg-brand-900/60 border border-slate-800 hover:border-primary-500/20 rounded-xl"

                            >



                              <div className="flex gap-3">



                                <span className="text-[10px] text-primary-400 font-bold shrink-0">

                                  {formatTime(

                                    seconds

                                  )}

                                </span>



                                <p className="text-xs text-slate-400 leading-relaxed">

                                  {

                                    item.text

                                  }

                                </p>



                              </div>



                            </button>

                          );

                        }

                      )}



                    </div>



                  )}



                </div>

              )}



            </div>



          </div>



          {/* ------------------------------------------------

              RIGHT SIDE ANALYSIS

          ------------------------------------------------ */}

          <div className="space-y-6">



            <div className="glass-panel rounded-2xl border border-slate-800 p-5">



              <div className="flex items-center gap-3 mb-5">



                <div className="h-9 w-9 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">



                  <Play className="h-4 w-4 text-primary-400" />



                </div>



                <div>



                  <h3 className="text-sm font-outfit font-bold text-white">

                    Session Analysis

                  </h3>



                  <p className="text-[10px] text-slate-500">

                    Learning behaviour

                  </p>



                </div>



              </div>



              {sessionStats ? (



                <div className="space-y-3">



                  <div className="p-4 bg-brand-900/30 border border-slate-800 rounded-xl">



                    <p className="text-[9px] text-slate-600 uppercase">

                      Completion

                    </p>



                    <p className="text-xl font-bold text-white mt-1">

                      {Math.round(

                        Number(

                          sessionStats.completion_percentage ??

                          sessionStats.completion ??

                          0

                        )

                      )}

                      %

                    </p>



                  </div>



                  <div className="grid grid-cols-2 gap-3">



                    <div className="p-3 bg-brand-900/30 border border-slate-800 rounded-xl">



                      <p className="text-[9px] text-slate-600 uppercase">

                        Plays

                      </p>



                      <p className="text-sm font-bold text-white mt-1">

                        {

                          sessionStats.play_events ??

                          sessionStats.play_count ??

                          0

                        }

                      </p>



                    </div>



                    <div className="p-3 bg-brand-900/30 border border-slate-800 rounded-xl">



                      <p className="text-[9px] text-slate-600 uppercase">

                        Pauses

                      </p>



                      <p className="text-sm font-bold text-white mt-1">

                        {

                          sessionStats.pause_count ??

                          sessionStats.total_pauses ??

                          0

                        }

                      </p>



                    </div>



                    <div className="p-3 bg-brand-900/30 border border-slate-800 rounded-xl">



                      <p className="text-[9px] text-slate-600 uppercase">

                        Rewinds

                      </p>



                      <p className="text-sm font-bold text-white mt-1">

                        {

                          sessionStats.rewind_count ??

                          sessionStats.total_rewinds ??

                          0

                        }

                      </p>



                    </div>



                    <div className="p-3 bg-brand-900/30 border border-slate-800 rounded-xl">



                      <p className="text-[9px] text-slate-600 uppercase">

                        Forwards

                      </p>



                      <p className="text-sm font-bold text-white mt-1">

                        {

                          sessionStats.forward_count ??

                          sessionStats.forward_seeks ??

                          0

                        }

                      </p>



                    </div>



                    <div className="p-3 bg-brand-900/30 border border-slate-800 rounded-xl">



                      <p className="text-[9px] text-slate-600 uppercase">

                        Avg Speed

                      </p>



                      <p className="text-sm font-bold text-white mt-1">

                        {

                          sessionStats.average_playback_speed ??

                          sessionStats.avg_playback_speed ??

                          1

                        }x

                      </p>



                    </div>



                  </div>



                </div>



              ) : (



                <div className="py-8 text-center">



                  <p className="text-xs text-slate-500">

                    Session analysis will appear as you watch.

                  </p>



                </div>



              )}



            </div>



            {/* ------------------------------------------------

                AI ARTIFACTS

            ------------------------------------------------ */}

            <div className="glass-panel rounded-2xl border border-slate-800 p-5">



              <h3 className="text-sm font-outfit font-bold text-white">

                AI Learning Artifacts

              </h3>



              <p className="text-[10px] text-slate-500 mt-1 mb-4">

                Available while you watch

              </p>



              <div className="space-y-3">



                <div className="p-3 bg-brand-900/30 border border-slate-800 rounded-xl">



                  <p className="text-[9px] text-slate-600 uppercase">

                    AI Summary

                  </p>



                  <p className="text-xs text-slate-400 mt-2">

                    {aiArtifacts.summary

                      ? 'Available'

                      : 'Generating / unavailable'}

                  </p>



                </div>



                <div className="p-3 bg-brand-900/30 border border-slate-800 rounded-xl">



                  <p className="text-[9px] text-slate-600 uppercase">

                    AI Notes

                  </p>



                  <p className="text-xs text-slate-400 mt-2">

                    {aiArtifacts.revisionNotes

                      ? 'Available'

                      : 'Generating / unavailable'}

                  </p>



                </div>



                <div className="p-3 bg-brand-900/30 border border-slate-800 rounded-xl">



                  <p className="text-[9px] text-slate-600 uppercase">

                    Whole Video Quiz

                  </p>



                  <p className="text-xs text-slate-400 mt-2">

                    {aiArtifacts.finalVideoQuiz

                      ? 'Available'

                      : 'Waiting for lecture completion'}

                  </p>



                </div>



              </div>



            </div>



          </div>



        </div>



      </div>



      {/* --------------------------------------------------

          CONFUSION ALERT MODAL

      -------------------------------------------------- */}

      {showConfusionAlert && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">



          <div className="w-full max-w-md glass-panel rounded-2xl border border-amber-500/30 p-6">



            <div className="flex items-start gap-3">



              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">



                <AlertCircle className="h-5 w-5 text-amber-400" />



              </div>



              <div>



                <h3 className="text-sm font-outfit font-bold text-white">

                  Confusion Detected

                </h3>



                <p className="text-xs text-slate-400 mt-2 leading-relaxed">

                  CogniTrace detected that you may need help with this concept.

                </p>



              </div>



            </div>



            <div className="flex gap-3 mt-6">



              <button

                onClick={handleDismissConfusion}

                className="flex-1 py-3 bg-brand-900 border border-slate-800 hover:bg-brand-800 text-slate-300 rounded-xl text-xs font-bold"

              >

                Continue Learning

              </button>



              <button

                onClick={handleOpenHelpCenter}

                className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold"

              >

                Get AI Help

              </button>



            </div>



          </div>



        </div>

      )}



    </div>

    </>

  );

}