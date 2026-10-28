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

  if (loading) return <div className="text-slate-400 p-4 border border-slate-800 rounded-2xl animate-pulse">Loading feedback analytics...</div>;
  if (error) return <div className="text-red-400 p-4 border border-red-500/20 bg-red-500/10 rounded-2xl">Error: {error}</div>;
  if (!data) return null;

  if (data.total_submissions === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-400" />
          Lecture Feedback
        </h3>
        <p className="text-slate-400">No feedback submitted yet.</p>
      </div>
    );
  }

  const { average_ratings, reviews, understanding_distribution, difficulty_distribution, clarity_distribution, pace_distribution, difficult_part_distribution, additional_support_distribution } = data;

  const renderBar = (label, count, total) => {
    const percent = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="mb-2">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>{label}</span>
          <span>{count} responses</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-8 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-400" />
          Lecture Feedback
        </h3>
        <span className="bg-primary-500/20 text-primary-300 text-xs font-bold px-3 py-1 rounded-full border border-primary-500/30">
          {data.total_submissions} Submissions
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-950 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Avg Understanding</div>
          <div className="text-2xl font-bold text-white">{average_ratings.understanding}</div>
          <div className="text-[10px] text-slate-500 mt-1">(1=Best, 4=Struggled)</div>
        </div>
        <div className="bg-brand-950 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Avg Difficulty</div>
          <div className="text-2xl font-bold text-white">{average_ratings.difficulty}</div>
          <div className="text-[10px] text-slate-500 mt-1">(1=Very easy, 5=Very diff)</div>
        </div>
        <div className="bg-brand-950 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Avg Clarity</div>
          <div className="text-2xl font-bold text-white">{average_ratings.clarity}</div>
          <div className="text-[10px] text-slate-500 mt-1">(1=Very clear, 4=Unclear)</div>
        </div>
        <div className="bg-brand-950 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Avg Pace</div>
          <div className="text-2xl font-bold text-white">{average_ratings.pace}</div>
          <div className="text-[10px] text-slate-500 mt-1">(1=Slow, 2=Right, 3=Fast)</div>
        </div>
      </div>

      {/* Distributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-brand-950 border border-slate-800 p-5 rounded-xl">
          <h4 className="text-sm font-bold text-white mb-4">Understanding (Q1)</h4>
          {[1,2,3,4].map(val => renderBar(getUnderstandingLabel(val), understanding_distribution[val] || 0, data.total_submissions))}
        </div>
        <div className="bg-brand-950 border border-slate-800 p-5 rounded-xl">
          <h4 className="text-sm font-bold text-white mb-4">Difficulty (Q2)</h4>
          {[1,2,3,4,5].map(val => renderBar(getDifficultyLabel(val), difficulty_distribution[val] || 0, data.total_submissions))}
        </div>
        <div className="bg-brand-950 border border-slate-800 p-5 rounded-xl">
          <h4 className="text-sm font-bold text-white mb-4">Most Difficult Part (Q5)</h4>
          {[1,2,3,4,5].map(val => renderBar(getDiffPartLabel(val), difficult_part_distribution[val] || 0, data.total_submissions))}
        </div>
        <div className="bg-brand-950 border border-slate-800 p-5 rounded-xl">
          <h4 className="text-sm font-bold text-white mb-4">Requested Support (Q6)</h4>
          {[1,2,3,4,5,6].map(val => renderBar(getSupportLabel(val), additional_support_distribution[val] || 0, data.total_submissions))}
        </div>
      </div>

      {/* Individual Reviews */}
      <div>
        <h4 className="text-lg font-bold text-white mb-4">Individual Reviews</h4>
        <div className="space-y-4">
          {reviews.map((review, idx) => (
            <div key={idx} className="bg-brand-950 border border-slate-800 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-3">
                <div className="font-semibold text-white">{review.student_name}</div>
                <div className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block">Understanding</span>
                  <span className="text-slate-300 font-medium">{getUnderstandingLabel(review.understanding)}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block">Difficulty</span>
                  <span className="text-slate-300 font-medium">{getDifficultyLabel(review.difficulty)}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block">Clarity</span>
                  <span className="text-slate-300 font-medium">{getClarityLabel(review.clarity)}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block">Pace</span>
                  <span className="text-slate-300 font-medium">{getPaceLabel(review.pace)}</span>
                </div>
              </div>
              {review.suggestion && (
                <div className="bg-primary-500/10 border border-primary-500/20 p-3 rounded-lg mt-3">
                  <span className="text-xs text-primary-400 font-bold block mb-1">Suggestion / Feedback:</span>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{review.suggestion}</p>
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
