import React, { useState, useEffect } from 'react';
import { MessageSquare, BarChart2, Star, ThumbsUp } from 'lucide-react';
import { apiRequest } from '../services/api';

const LectureFeedbackAnalytics = ({ lectureId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiRequest(`/api/faculty/lecture/${lectureId}/feedback`);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to fetch feedback analytics');
      } finally {
        setLoading(false);
      }
    };
    if (lectureId) fetchFeedback();
  }, [lectureId]);

  if (loading) return <div className="text-[#68766B] p-4 border border-[#D9E1D2] bg-[#E2E8D8] rounded-2xl animate-pulse">Loading feedback analytics...</div>;
  if (error) return <div className="text-rose-700 p-4 border border-rose-200 bg-rose-50 rounded-2xl text-xs font-medium">Error: {error}</div>;
  if (!data) return null;

  if (data.total_submissions === 0) {
    return (
      <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-2xl p-6 mt-8">
        <h3 className="text-xl font-bold text-[#26332A] mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#315C46]" />
          Lecture Feedback
        </h3>
        <p className="text-[#68766B] text-sm">No feedback submitted yet.</p>
      </div>
    );
  }

  const { average_ratings, reviews, understanding_distribution, difficulty_distribution, clarity_distribution, pace_distribution, difficult_part_distribution, additional_support_distribution } = data;

  const renderBar = (label, count, total) => {
    const percent = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="mb-2">
        <div className="flex justify-between text-xs text-[#68766B] mb-1 font-medium">
          <span>{label}</span>
          <span>{count} responses</span>
        </div>
        <div className="w-full bg-[#FCFCF8] border border-[#D9E1D2]/60 rounded-full h-2">
          <div className="bg-[#315C46] h-2 rounded-full" style={{ width: `${percent}%` }}></div>
        </div>
      </div>
    );
  };

  const getDifficultyLabel = (val) => ["Very easy", "Easy", "Moderate", "Difficult", "Very difficult"][val - 1] || val;
  const getUnderstandingLabel = (val) => ["I understood everything.", "I understood most of the concepts.", "I understood some concepts, but struggled with others.", "I found most concepts difficult to understand."][val - 1] || val;
  const getClarityLabel = (val) => ["Very clear", "Mostly clear", "Somewhat unclear", "Very unclear"][val - 1] || val;
  const getPaceLabel = (val) => ["Too slow", "Just right", "Too fast"][val - 1] || val;
  const getDiffPartLabel = (val) => ["Introduction / Basic concepts", "Main concepts / Detailed explanation", "Examples / Problem solving", "Final concepts / Summary", "I did not find any part difficult."][val - 1] || val;
  const getSupportLabel = (val) => ["More real-life examples", "Diagrams and visual explanations", "Simpler explanations", "Step-by-step explanations", "More practice questions and quizzes", "No additional support needed."][val - 1] || val;

  return (
    <div className="bg-[#FCFCF8] border border-[#D9E1D2] rounded-3xl p-6 mt-8 space-y-8 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#D9E1D2] pb-4">
        <h3 className="text-xl font-bold text-[#26332A] flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#315C46]" />
          Lecture Feedback
        </h3>
        <span className="bg-emerald-100/90 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200/70">
          {data.total_submissions} Submissions
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FCFCF8] border border-[#D9E1D2] p-4 rounded-2xl">
          <div className="text-xs text-[#68766B] mb-1 font-medium">Avg Understanding</div>
          <div className="text-2xl font-bold text-[#26332A]">{average_ratings.understanding}</div>
          <div className="text-[10px] text-[#68766B] mt-1">(1=Best, 4=Struggled)</div>
        </div>
        <div className="bg-[#FCFCF8] border border-[#D9E1D2] p-4 rounded-2xl">
          <div className="text-xs text-[#68766B] mb-1 font-medium">Avg Difficulty</div>
          <div className="text-2xl font-bold text-[#26332A]">{average_ratings.difficulty}</div>
          <div className="text-[10px] text-[#68766B] mt-1">(1=Very easy, 5=Very diff)</div>
        </div>
        <div className="bg-[#FCFCF8] border border-[#D9E1D2] p-4 rounded-2xl">
          <div className="text-xs text-[#68766B] mb-1 font-medium">Avg Clarity</div>
          <div className="text-2xl font-bold text-[#26332A]">{average_ratings.clarity}</div>
          <div className="text-[10px] text-[#68766B] mt-1">(1=Very clear, 4=Unclear)</div>
        </div>
        <div className="bg-[#FCFCF8] border border-[#D9E1D2] p-4 rounded-2xl">
          <div className="text-xs text-[#68766B] mb-1 font-medium">Avg Pace</div>
          <div className="text-2xl font-bold text-[#26332A]">{average_ratings.pace}</div>
          <div className="text-[10px] text-[#68766B] mt-1">(1=Slow, 2=Right, 3=Fast)</div>
        </div>
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#FCFCF8] border border-[#D9E1D2] p-5 rounded-2xl">
          <h4 className="text-sm font-bold text-[#26332A] mb-4">Understanding (Q1)</h4>
          {[1,2,3,4].map(val => renderBar(getUnderstandingLabel(val), understanding_distribution[val] || 0, data.total_submissions))}
        </div>
        <div className="bg-[#FCFCF8] border border-[#D9E1D2] p-5 rounded-2xl">
          <h4 className="text-sm font-bold text-[#26332A] mb-4">Difficulty (Q2)</h4>
          {[1,2,3,4,5].map(val => renderBar(getDifficultyLabel(val), difficulty_distribution[val] || 0, data.total_submissions))}
        </div>
        <div className="bg-[#FCFCF8] border border-[#D9E1D2] p-5 rounded-2xl">
          <h4 className="text-sm font-bold text-[#26332A] mb-4">Most Difficult Part (Q5)</h4>
          {[1,2,3,4,5].map(val => renderBar(getDiffPartLabel(val), difficult_part_distribution[val] || 0, data.total_submissions))}
        </div>
        <div className="bg-[#FCFCF8] border border-[#D9E1D2] p-5 rounded-2xl">
          <h4 className="text-sm font-bold text-[#26332A] mb-4">Requested Support (Q6)</h4>
          {[1,2,3,4,5,6].map(val => renderBar(getSupportLabel(val), additional_support_distribution[val] || 0, data.total_submissions))}
        </div>
      </div>

      {/* Individual Reviews */}
      <div>
        <h4 className="text-lg font-bold text-[#26332A] mb-4">Individual Reviews</h4>
        <div className="space-y-4">
          {reviews.map((review, idx) => (
            <div key={idx} className="bg-[#FCFCF8] border border-[#D9E1D2] p-4 rounded-2xl">
              <div className="flex justify-between items-start mb-3">
                <div className="font-bold text-[#26332A]">{review.student_name}</div>
                <div className="text-xs text-[#68766B]">{new Date(review.created_at).toLocaleDateString()}</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
                <div className="bg-[#FCFCF8] p-2.5 rounded-xl border border-[#D9E1D2]">
                  <span className="text-[#68766B] block text-[10px] uppercase font-bold">Understanding</span>
                  <span className="text-[#26332A] font-semibold">{getUnderstandingLabel(review.understanding)}</span>
                </div>
                <div className="bg-[#FCFCF8] p-2.5 rounded-xl border border-[#D9E1D2]">
                  <span className="text-[#68766B] block text-[10px] uppercase font-bold">Difficulty</span>
                  <span className="text-[#26332A] font-semibold">{getDifficultyLabel(review.difficulty)}</span>
                </div>
                <div className="bg-[#FCFCF8] p-2.5 rounded-xl border border-[#D9E1D2]">
                  <span className="text-[#68766B] block text-[10px] uppercase font-bold">Clarity</span>
                  <span className="text-[#26332A] font-semibold">{getClarityLabel(review.clarity)}</span>
                </div>
                <div className="bg-[#FCFCF8] p-2.5 rounded-xl border border-[#D9E1D2]">
                  <span className="text-[#68766B] block text-[10px] uppercase font-bold">Pace</span>
                  <span className="text-[#26332A] font-semibold">{getPaceLabel(review.pace)}</span>
                </div>
              </div>
              {review.suggestion && (
                <div className="bg-[#FCFCF8] border border-[#D9E1D2] p-3 rounded-xl mt-3">
                  <span className="text-xs text-[#315C46] font-bold block mb-1">Suggestion / Feedback:</span>
                  <p className="text-xs sm:text-sm text-[#68766B] whitespace-pre-wrap">{review.suggestion}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LectureFeedbackAnalytics;
