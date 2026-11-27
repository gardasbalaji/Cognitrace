import React, { useState, useEffect } from 'react';

const LectureFeedbackForm = ({ lectureId, onSubmitted, onSkip }) => {
  const [formData, setFormData] = useState({
    understanding: '',
    difficulty: '',
    clarity: '',
    pace: '',
    difficult_part: '',
    additional_support: '',
    suggestion: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    const checkExistingFeedback = async () => {
      try {
        const response = await fetch(`/api/student/lecture/${lectureId}/feedback`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.understanding) {
            setAlreadySubmitted(true);
          }
        }
      } catch (err) {
        console.error("Error checking existing feedback:", err);
      } finally {
        setLoading(false);
      }
    };
    checkExistingFeedback();
  }, [lectureId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.understanding || !formData.difficulty || !formData.clarity || !formData.pace || !formData.difficult_part || !formData.additional_support) {
      setError("Please answer all required questions.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        understanding: parseInt(formData.understanding),
        difficulty: parseInt(formData.difficulty),
        clarity: parseInt(formData.clarity),
        pace: parseInt(formData.pace),
        difficult_part: formData.difficult_part,
        additional_support: formData.additional_support,
        suggestion: formData.suggestion
      };

      const response = await fetch(`/api/student/lecture/${lectureId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to submit feedback.");
      }
      
      setSuccess(true);
      setTimeout(() => {
        onSubmitted();
      }, 2000);
      
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8 text-[#68766B]">Loading feedback form...</div>;
  }

  if (alreadySubmitted) {
    return (
      <div className="text-center p-8 bg-[#F8F8F2] border border-[#D9E1D2] rounded-3xl">
        <h3 className="text-xl font-bold text-[#26332A] mb-2">Feedback Submitted</h3>
        <p className="text-[#68766B] mb-6 text-sm">You have already submitted feedback for this lecture.</p>
        <button 
          onClick={onSubmitted}
          className="px-6 py-2.5 bg-[#315C46] hover:bg-[#264B39] text-[#FFFFFF] rounded-full font-bold text-xs shadow-sm transition cursor-pointer"
        >
          Continue
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center p-8 bg-[#F8F8F2] border border-[#D9E1D2] rounded-3xl">
        <div className="mx-auto h-12 w-12 rounded-full bg-[#DCE8DC] border border-[#D9E1D2] flex items-center justify-center text-xl text-[#264B39] mb-4 font-bold">
          ✓
        </div>
        <h3 className="text-xl font-bold text-[#26332A] mb-2">Thank you!</h3>
        <p className="text-[#68766B] text-sm">Your feedback has been submitted successfully.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F8F2] p-6 sm:p-8 rounded-3xl border border-[#D9E1D2] max-w-2xl w-full max-h-[85vh] overflow-y-auto text-[#26332A] shadow-2xl">
      <h2 className="text-2xl font-bold text-[#26332A] mb-2">Lecture Feedback</h2>
      <p className="text-[#68766B] mb-6 text-sm leading-relaxed">Help us understand your learning experience. Your feedback helps improve future lectures.</p>
      
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl mb-6 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Q1 */}
        <div className="space-y-3">
          <label className="block text-[#26332A] font-bold text-sm">1. How well did you understand the concepts explained in this lecture? <span className="text-rose-600">*</span></label>
          <div className="space-y-2">
            {[
              {val: "1", label: "I understood everything."},
              {val: "2", label: "I understood most of the concepts."},
              {val: "3", label: "I understood some concepts, but struggled with others."},
              {val: "4", label: "I found most concepts difficult to understand."}
            ].map(opt => (
              <label key={opt.val} className="flex items-center space-x-3 text-[#26332A] text-xs sm:text-sm p-2 rounded-xl hover:bg-[#E8EDE1] transition cursor-pointer">
                <input type="radio" name="understanding" value={opt.val} checked={formData.understanding === opt.val} onChange={handleChange} className="text-[#315C46] focus:ring-[#315C46] border-[#D9E1D2]" required />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q2 */}
        <div className="space-y-3">
          <label className="block text-[#26332A] font-bold text-sm">2. How would you rate the overall difficulty of this lecture? <span className="text-rose-600">*</span></label>
          <div className="space-y-2">
            {[
              {val: "1", label: "Very easy"},
              {val: "2", label: "Easy"},
              {val: "3", label: "Moderate"},
              {val: "4", label: "Difficult"},
              {val: "5", label: "Very difficult"}
            ].map(opt => (
              <label key={opt.val} className="flex items-center space-x-3 text-[#26332A] text-xs sm:text-sm p-2 rounded-xl hover:bg-[#E8EDE1] transition cursor-pointer">
                <input type="radio" name="difficulty" value={opt.val} checked={formData.difficulty === opt.val} onChange={handleChange} className="text-[#315C46] focus:ring-[#315C46] border-[#D9E1D2]" required />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q3 */}
        <div className="space-y-3">
          <label className="block text-[#26332A] font-bold text-sm">3. Was the explanation clear and easy to follow? <span className="text-rose-600">*</span></label>
          <div className="space-y-2">
            {[
              {val: "1", label: "Very clear"},
              {val: "2", label: "Mostly clear"},
              {val: "3", label: "Somewhat unclear"},
              {val: "4", label: "Very unclear"}
            ].map(opt => (
              <label key={opt.val} className="flex items-center space-x-3 text-[#26332A] text-xs sm:text-sm p-2 rounded-xl hover:bg-[#E8EDE1] transition cursor-pointer">
                <input type="radio" name="clarity" value={opt.val} checked={formData.clarity === opt.val} onChange={handleChange} className="text-[#315C46] focus:ring-[#315C46] border-[#D9E1D2]" required />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q4 */}
        <div className="space-y-3">
          <label className="block text-[#26332A] font-bold text-sm">4. Was the pace of the lecture comfortable? <span className="text-rose-600">*</span></label>
          <div className="space-y-2">
            {[
              {val: "1", label: "Too slow"},
              {val: "2", label: "Just right"},
              {val: "3", label: "Too fast"}
            ].map(opt => (
              <label key={opt.val} className="flex items-center space-x-3 text-[#26332A] text-xs sm:text-sm p-2 rounded-xl hover:bg-[#E8EDE1] transition cursor-pointer">
                <input type="radio" name="pace" value={opt.val} checked={formData.pace === opt.val} onChange={handleChange} className="text-[#315C46] focus:ring-[#315C46] border-[#D9E1D2]" required />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q5 */}
        <div className="space-y-3">
          <label className="block text-[#26332A] font-bold text-sm">5. Which part of the lecture did you find most difficult? <span className="text-rose-600">*</span></label>
          <div className="space-y-2">
            {[
              {val: "1", label: "Introduction / Basic concepts"},
              {val: "2", label: "Main concepts / Detailed explanation"},
              {val: "3", label: "Examples / Problem solving"},
              {val: "4", label: "Final concepts / Summary"},
              {val: "5", label: "I did not find any part difficult."}
            ].map(opt => (
              <label key={opt.val} className="flex items-center space-x-3 text-[#26332A] text-xs sm:text-sm p-2 rounded-xl hover:bg-[#E8EDE1] transition cursor-pointer">
                <input type="radio" name="difficult_part" value={opt.val} checked={formData.difficult_part === opt.val} onChange={handleChange} className="text-[#315C46] focus:ring-[#315C46] border-[#D9E1D2]" required />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q6 */}
        <div className="space-y-3">
          <label className="block text-[#26332A] font-bold text-sm">6. What additional learning support would help you understand this topic better? <span className="text-rose-600">*</span></label>
          <div className="space-y-2">
            {[
              {val: "1", label: "More real-life examples"},
              {val: "2", label: "Diagrams and visual explanations"},
              {val: "3", label: "Simpler explanations"},
              {val: "4", label: "Step-by-step explanations"},
              {val: "5", label: "More practice questions and quizzes"},
              {val: "6", label: "No additional support needed."}
            ].map(opt => (
              <label key={opt.val} className="flex items-center space-x-3 text-[#26332A] text-xs sm:text-sm p-2 rounded-xl hover:bg-[#E8EDE1] transition cursor-pointer">
                <input type="radio" name="additional_support" value={opt.val} checked={formData.additional_support === opt.val} onChange={handleChange} className="text-[#315C46] focus:ring-[#315C46] border-[#D9E1D2]" required />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Q7 */}
        <div className="space-y-3">
          <label className="block text-[#26332A] font-bold text-sm">7. Do you have any suggestions or feedback about this lecture?</label>
          <textarea 
            name="suggestion"
            value={formData.suggestion}
            onChange={handleChange}
            maxLength={2000}
            rows={4}
            className="w-full bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl p-3 text-[#26332A] focus:outline-none focus:border-[#315C46] focus:ring-1 focus:ring-[#315C46] text-xs sm:text-sm placeholder-[#879187]"
            placeholder="Your suggestions (optional)..."
          ></textarea>
          <div className="text-right text-[10px] text-[#879187]">{formData.suggestion.length}/2000</div>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-[#D9E1D2]">
          <button 
            type="button" 
            onClick={onSkip}
            className="px-6 py-2.5 bg-[#E2E8D8] text-[#315C46] hover:bg-[#E8EDE1] border border-[#D9E1D2] rounded-full font-bold text-xs transition cursor-pointer"
          >
            Skip
          </button>
          <button 
            type="submit" 
            disabled={submitting}
            className="px-6 py-2.5 bg-[#315C46] hover:bg-[#264B39] disabled:opacity-50 text-[#FFFFFF] rounded-full font-bold text-xs shadow-sm transition cursor-pointer"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LectureFeedbackForm;
