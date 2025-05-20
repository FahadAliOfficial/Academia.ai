'use client';
import React from 'react';

const ExamDetailsModal = ({ isOpen, onClose, exam, examDetails, loadingDetails }) => {  if (!isOpen) return null;    return (
<div className={`fixed inset-0 bg-white/30 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#4F46E5] text-white px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold">
            {exam?.title} - Detailed Results
          </h3>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Performance Summary */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-lg font-medium text-gray-800">Performance Summary</h4>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                exam?.score >= 70 
                  ? 'bg-green-100 text-green-800' 
                  : exam?.score >= 50 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
              }`}>
                Score: {exam?.score}%
              </div>
            </div>
            
            <div className="flex justify-between text-sm text-gray-600 mb-3">
              <span>Total: {exam?.obtained}/{exam?.totalMarks} points</span>
              <span>Completed: {exam?.completedDate}</span>
            </div>
            
            <div className="h-2.5 bg-gray-100 rounded-full">
              <div 
                className={`h-2.5 rounded-full ${
                  exam?.score >= 70 
                  ? 'bg-green-500' 
                  : exam?.score >= 50 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
                }`} 
                style={{ width: `${exam?.score}%` }}
              ></div>
            </div>
          </div>
          
          {/* Questions List */}
          <div>
            <h4 className="text-lg font-medium text-gray-800 mb-4">Question Details</h4>
            
            {loadingDetails ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#4F46E5]"></div>
                <p className="mt-3 text-gray-600">Loading question details...</p>
              </div>
            ) : examDetails && examDetails.length > 0 ? (
              <div className="space-y-6">
                {examDetails.map((detail, index) => (
                  <div 
                    key={detail.id} 
                    className={`p-4 rounded-lg border ${
                      detail.is_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white mr-3 ${
                        detail.is_correct ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        <span className="text-sm font-medium">
                          {index+1}
                        </span>
                      </span>
                      <div className="flex-grow">
                        <div className="mb-3">
                          <p className="text-gray-800 font-medium mb-1">
                            {detail.question_text || "Question"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {detail.question_type === 'mcq' ? 'Multiple Choice' : 
                             detail.question_type === 'text' ? 'Text Answer' : 
                             'Question'}
                          </p>
                        </div>
                        
                        <div className="bg-white rounded p-3 mb-3">
                          <p className="text-sm text-gray-600 mb-1">Your answer:</p>
                          <p className={`text-sm ${detail.is_correct ? 'text-green-700' : 'text-red-700'} font-medium`}>
                            {detail.student_answer || "No answer provided"}
                          </p>
                        </div>
                        
                        {!detail.is_correct && (
                          <div className="bg-white rounded p-3 mb-3">
                            <p className="text-sm text-gray-600 mb-1">Correct answer:</p>
                            <p className="text-sm text-green-700 font-medium">
                              {detail.correct_answer}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex justify-between mt-2">
                          <div className="flex items-center">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                              detail.is_correct ? 'bg-green-500' : 'bg-red-500'
                            }`}>
                              {detail.is_correct ? '✓' : '✗'}
                            </span>
                            <span className="ml-2 text-sm font-medium">
                              {detail.is_correct ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                          <div className="text-sm font-medium">
                            {detail.score_obtained}/{detail.max_score} points
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 py-4 text-center">
                No question details available for this exam.
              </p>
            )}
          </div>
        </div>
        
        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamDetailsModal;
